"""
Centralised retry / backoff decorators built on `tenacity`.

Usage
-----
    from app.utils.retry import llm_retry, embed_retry

    @llm_retry
    def call_llm(...): ...
"""

import logging

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
    after_log,
)

logger = logging.getLogger(__name__)

# Exceptions that are safe to retry (network hiccups, rate-limits, timeouts)
_RETRYABLE = (
    ConnectionError,
    TimeoutError,
    OSError,
)

try:
    import httpx
    _RETRYABLE = (*_RETRYABLE, httpx.HTTPStatusError, httpx.ConnectError, httpx.ReadTimeout)
except ImportError:
    pass


def _is_retryable(exc: BaseException) -> bool:
    """Return True for 429 / 5xx HTTP errors and standard I/O errors."""
    if isinstance(exc, _RETRYABLE):
        return True
    # httpx / requests rate-limit check
    status = getattr(getattr(exc, "response", None), "status_code", None)
    if status and (status == 429 or status >= 500):
        return True
    return False


# ── LLM calls (OpenRouter / Gemini) ──────────────────────────────────────────
llm_retry = retry(
    retry=retry_if_exception_type(Exception) if False else retry_if_exception_type(Exception),
    # Use a custom predicate wrapper so we can inspect HTTP status codes
    retry=lambda retry_state: _is_retryable(retry_state.outcome.exception())
    if retry_state.outcome.failed
    else False,
    wait=wait_exponential(multiplier=1, min=2, max=60),
    stop=stop_after_attempt(6),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    after=after_log(logger, logging.DEBUG),
    reraise=True,
)

# ── Embedding calls (Google embedding-001) ────────────────────────────────────
embed_retry = retry(
    retry=lambda retry_state: _is_retryable(retry_state.outcome.exception())
    if retry_state.outcome.failed
    else False,
    wait=wait_exponential(multiplier=1, min=1, max=30),
    stop=stop_after_attempt(5),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)