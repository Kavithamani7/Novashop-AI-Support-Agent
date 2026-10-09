"""Environment configuration and google-genai client initialization."""

from __future__ import annotations

import os
import time
from typing import Any, Callable, TypeVar

from dotenv import load_dotenv
from google import genai

load_dotenv()

T = TypeVar("T")

GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
MAX_ITERATIONS: int = int(os.getenv("MAX_AGENT_ITERATIONS", "5"))


class MissingAPIKeyError(RuntimeError):
    """Raised when GEMINI_API_KEY is not set in the environment."""


def get_api_key() -> str:
    """Return the GEMINI_API_KEY from environment or raise MissingAPIKeyError."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "MY_GEMINI_API_KEY" or api_key == "your_gemini_api_key_here":
        raise MissingAPIKeyError(
            "GEMINI_API_KEY environment variable is missing or placeholder. "
            "Set GEMINI_API_KEY in your .env file or shell environment."
        )
    return api_key


def get_client(api_key: str | None = None) -> genai.Client:
    """Create and return an official google-genai Client instance."""
    resolved_key = api_key or get_api_key()
    return genai.Client(api_key=resolved_key)


def call_with_retry(
    func: Callable[[], T],
    max_attempts: int = 3,
    base_delay: float = 1.0,
) -> T:
    """Execute a Gemini SDK call with exponential backoff on 429/503 errors."""
    last_exc: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            return func()
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            err_text = str(exc).upper()
            is_retryable = any(
                token in err_text
                for token in ("429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "OVERLOADED", "RATE_LIMIT")
            )
            if not is_retryable or attempt >= max_attempts:
                raise
            sleep_seconds = base_delay * (2 ** (attempt - 1))
            time.sleep(sleep_seconds)
    assert last_exc is not None
    raise last_exc
