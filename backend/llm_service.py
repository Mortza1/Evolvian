"""
LLM Service for integrating with OpenRouter API
Supports chat completions using DeepSeek R1 and other models
"""

import os
import requests
import json
import time
from typing import List, Dict, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
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
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.default_model = os.getenv("OPENROUTER_MODEL", "google/gemma-3-27b-it:free")
        self.site_url = os.getenv("OPENROUTER_SITE_URL", "https://evolvian.com")
        self.site_name = os.getenv("OPENROUTER_SITE_NAME", "Evolvian")
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.max_retries = 3

        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not set in environment variables")

    def chat_completion(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> ChatCompletionResponse:
        """
        Send a chat completion request to OpenRouter API

        Args:
            messages: List of chat messages with role and content
            model: Model to use (defaults to DeepSeek R1)
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            stream: Whether to stream the response

        Returns:
            ChatCompletionResponse with the model's response
        """
        used_model = model or self.default_model
        print(f"\n[LLM] Calling OpenRouter API...")
        print(f"[LLM] Model: {used_model}")
        print(f"[LLM] Messages: {len(messages)}")
        for i, msg in enumerate(messages):
            print(f"[LLM]   [{i}] {msg.role}: {msg.content[:100]}...")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.site_url,
            "X-Title": self.site_name,
        }

        payload = {
            "model": used_model,
            "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
            "temperature": temperature,
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        if stream:
            payload["stream"] = True

        last_error = None
        for attempt in range(self.max_retries):
            try:
                print(f"[LLM] Sending request (timeout: 120s, attempt {attempt + 1}/{self.max_retries})...")
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    data=json.dumps(payload),
                    timeout=120  # 120 second timeout for LLM calls
                )
                print(f"[LLM] Response status: {response.status_code}")

                data = response.json()

                # Check for API-level errors in the response body
                if "error" in data:
                    error_msg = data["error"].get("message", "Unknown error")
                    error_code = data["error"].get("code", 500)
                    print(f"[LLM] API Error (code {error_code}): {error_msg}")

                    # Retry on transient errors (502, 503, 429, network issues)
                    if error_code in [502, 503, 429] or "network" in error_msg.lower():
                        last_error = f"API Error: {error_msg}"
                        if attempt < self.max_retries - 1:
                            wait_time = (attempt + 1) * 2  # Exponential backoff: 2s, 4s, 6s
                            print(f"[LLM] Retrying in {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                    raise Exception(f"OpenRouter API error: {error_msg}")

                response.raise_for_status()

                # Extract the response text
                if "choices" in data and len(data["choices"]) > 0:
                    response_text = data["choices"][0]["message"]["content"]
                    model_used = data.get("model", used_model)
                    usage = data.get("usage", {})

                    print(f"[LLM] Success! Response length: {len(response_text)}")
                    print(f"[LLM] Usage: {usage}")
                    print(f"[LLM] Response preview: {response_text[:200]}...")

                    return ChatCompletionResponse(
                        response=response_text,
                        model=model_used,
                        usage=usage
                    )
                else:
                    print(f"[LLM] ERROR: Invalid response format")
                    print(f"[LLM] Data: {data}")
                    raise ValueError("Invalid response format from OpenRouter API")

            except requests.exceptions.RequestException as e:
                print(f"[LLM] ERROR: Request failed: {e}")
                last_error = str(e)
                if attempt < self.max_retries - 1:
                    wait_time = (attempt + 1) * 2
                    print(f"[LLM] Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                raise Exception(f"Error calling OpenRouter API: {str(e)}")

        raise Exception(f"Failed after {self.max_retries} attempts. Last error: {last_error}")

    def simple_chat(self, user_message: str, system_prompt: Optional[str] = None) -> str:
        """
        Simple helper method for single-turn chat

        Args:
            user_message: The user's message
            system_prompt: Optional system prompt to set context

        Returns:
            The assistant's response as a string
        """
        messages = []

        if system_prompt:
            messages.append(ChatMessage(role="system", content=system_prompt))

        messages.append(ChatMessage(role="user", content=user_message))

        result = self.chat_completion(messages)
        return result.response


# Singleton instance
llm_service = LLMService()
