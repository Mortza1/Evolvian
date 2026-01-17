"""
LLM Service for integrating with OpenRouter API
Supports chat completions using DeepSeek R1 and other models
"""

import os
import requests
import json
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
        self.default_model = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-r1-0528:free")
        self.site_url = os.getenv("OPENROUTER_SITE_URL", "https://evolvian.com")
        self.site_name = os.getenv("OPENROUTER_SITE_NAME", "Evolvian")
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"

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
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.site_url,
            "X-Title": self.site_name,
        }

        payload = {
            "model": model or self.default_model,
            "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
            "temperature": temperature,
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        if stream:
            payload["stream"] = True

        try:
            response = requests.post(
                self.api_url,
                headers=headers,
                data=json.dumps(payload),
                timeout=60  # 60 second timeout
            )
            response.raise_for_status()

            data = response.json()

            # Extract the response text
            if "choices" in data and len(data["choices"]) > 0:
                response_text = data["choices"][0]["message"]["content"]
                model_used = data.get("model", model or self.default_model)
                usage = data.get("usage", {})

                return ChatCompletionResponse(
                    response=response_text,
                    model=model_used,
                    usage=usage
                )
            else:
                raise ValueError("Invalid response format from OpenRouter API")

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error calling OpenRouter API: {str(e)}")

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
