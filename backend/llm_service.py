"""
LLM Service — NVIDIA NIM (primary) + OpenRouter (fallback)
"""

import os
import requests
import json
import time
from typing import List, Dict, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


class ChatMessage(BaseModel):
    role: str  # "user", "assistant", or "system"
    content: str


class ChatCompletionRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False


class ChatCompletionResponse(BaseModel):
    response: str
    model: str
    usage: Optional[Dict] = None


class LLMService:
    def __init__(self):
        # NVIDIA
        self.nvidia_api_key = os.getenv("NVIDIA_API_KEY")
        self.nvidia_model = os.getenv("NVIDIA_MODEL", "meta/llama-4-scout-17b-16e-instruct")
        self.nvidia_api_url = "https://integrate.api.nvidia.com/v1/chat/completions"

        # OpenRouter (fallback)
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.openrouter_model = os.getenv("OPENROUTER_MODEL", "google/gemma-3-27b-it:free")
        self.openrouter_api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.site_url = os.getenv("OPENROUTER_SITE_URL", "https://evolvian.com")
        self.site_name = os.getenv("OPENROUTER_SITE_NAME", "Evolvian")

        self.max_retries = 3

        if not self.nvidia_api_key:
            raise ValueError("NVIDIA_API_KEY not set in environment variables")

    def nvidia_chat_completion(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 1.0,
        max_tokens: int = 1024,
        stream: bool = False,
    ) -> ChatCompletionResponse:
        """
        Send a chat completion request to the NVIDIA NIM API.
        """
        used_model = model or self.nvidia_model
        print(f"\n[LLM/NVIDIA] Model: {used_model} | Messages: {len(messages)}")

        headers = {
            "Authorization": f"Bearer {self.nvidia_api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream" if stream else "application/json",
        }

        payload = {
            "model": used_model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": 1.0,
            "frequency_penalty": 0.0,
            "presence_penalty": 0.0,
            "stream": stream,
        }

        last_error = None
        for attempt in range(self.max_retries):
            try:
                print(f"[LLM/NVIDIA] Sending request (attempt {attempt + 1}/{self.max_retries})...")
                response = requests.post(
                    self.nvidia_api_url,
                    headers=headers,
                    json=payload,
                    timeout=120,
                    stream=stream,
                )
                print(f"[LLM/NVIDIA] Status: {response.status_code}")

                if stream:
                    # Collect streamed chunks into a single string
                    full_text = ""
                    for line in response.iter_lines():
                        if not line:
                            continue
                        decoded = line.decode("utf-8") if isinstance(line, bytes) else line
                        if decoded.startswith("data: "):
                            decoded = decoded[6:]
                        if decoded == "[DONE]":
                            break
                        try:
                            chunk = json.loads(decoded)
                            delta = chunk["choices"][0].get("delta", {})
                            full_text += delta.get("content", "")
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
                    print(f"[LLM/NVIDIA] Stream done. Length: {len(full_text)}")
                    return ChatCompletionResponse(response=full_text, model=used_model)

                data = response.json()

                if "error" in data:
                    error_msg = data["error"].get("message", "Unknown error")
                    error_code = data["error"].get("code", 500)
                    print(f"[LLM/NVIDIA] API Error ({error_code}): {error_msg}")
                    if error_code in [502, 503, 429]:
                        last_error = error_msg
                        if attempt < self.max_retries - 1:
                            wait_time = (attempt + 1) * 2
                            print(f"[LLM/NVIDIA] Retrying in {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                    raise Exception(f"NVIDIA API error: {error_msg}")

                response.raise_for_status()

                if "choices" in data and data["choices"]:
                    text = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    print(f"[LLM/NVIDIA] Success. Length: {len(text)} | Usage: {usage}")
                    return ChatCompletionResponse(response=text, model=used_model, usage=usage)

                raise ValueError("Invalid response format from NVIDIA API")

            except requests.exceptions.RequestException as e:
                last_error = str(e)
                print(f"[LLM/NVIDIA] Request error: {e}")
                if attempt < self.max_retries - 1:
                    wait_time = (attempt + 1) * 2
                    print(f"[LLM/NVIDIA] Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                raise Exception(f"Error calling NVIDIA API: {e}")

        raise Exception(f"NVIDIA API failed after {self.max_retries} attempts. Last error: {last_error}")

    def chat_completion(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False,
    ) -> ChatCompletionResponse:
        """
        Primary chat completion — uses NVIDIA NIM.
        Falls back to OpenRouter if NVIDIA fails and OpenRouter key is available.
        """
        try:
            return self.nvidia_chat_completion(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens or 1024,
                stream=stream,
            )
        except Exception as nvidia_err:
            print(f"[LLM] NVIDIA failed: {nvidia_err}")
            if self.openrouter_api_key:
                print("[LLM] Falling back to OpenRouter...")
                return self._openrouter_chat_completion(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=stream,
                )
            raise

    def simple_chat(self, user_message: str, system_prompt: Optional[str] = None) -> str:
        """
        Simple helper for single-turn chat.
        """
        messages = []
        if system_prompt:
            messages.append(ChatMessage(role="system", content=system_prompt))
        messages.append(ChatMessage(role="user", content=user_message))
        return self.chat_completion(messages).response

    # ── OpenRouter fallback ────────────────────────────────────────────────────

    def _openrouter_chat_completion(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False,
    ) -> ChatCompletionResponse:
        used_model = model or self.openrouter_model
        print(f"[LLM/OpenRouter] Model: {used_model} | Messages: {len(messages)}")

        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.site_url,
            "X-Title": self.site_name,
        }

        payload: Dict = {
            "model": used_model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if stream:
            payload["stream"] = True

        last_error = None
        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    self.openrouter_api_url,
                    headers=headers,
                    data=json.dumps(payload),
                    timeout=120,
                )
                print(f"[LLM/OpenRouter] Status: {response.status_code}")
                data = response.json()

                if "error" in data:
                    error_msg = data["error"].get("message", "Unknown error")
                    error_code = data["error"].get("code", 500)
                    if error_code in [502, 503, 429] or "network" in error_msg.lower():
                        last_error = error_msg
                        if attempt < self.max_retries - 1:
                            time.sleep((attempt + 1) * 2)
                            continue
                    raise Exception(f"OpenRouter API error: {error_msg}")

                response.raise_for_status()

                if "choices" in data and data["choices"]:
                    text = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    print(f"[LLM/OpenRouter] Success. Length: {len(text)}")
                    return ChatCompletionResponse(response=text, model=data.get("model", used_model), usage=usage)

                raise ValueError("Invalid response format from OpenRouter API")

            except requests.exceptions.RequestException as e:
                last_error = str(e)
                if attempt < self.max_retries - 1:
                    time.sleep((attempt + 1) * 2)
                    continue
                raise Exception(f"Error calling OpenRouter API: {e}")

        raise Exception(f"OpenRouter failed after {self.max_retries} attempts. Last error: {last_error}")


# Singleton instance
llm_service = LLMService()
