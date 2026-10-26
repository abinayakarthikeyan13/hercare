"""
Lightweight in-memory sliding-window rate limiting.

No new dependencies: a thread-safe deque per (bucket, key) records recent hit
timestamps. Used to slow down credential-stuffing on the login/OTP endpoints and
to cap chat traffic per session. State is per-process (fine for the single-worker
development/deployment setup of this app); a multi-worker production deployment
should swap this for a shared store such as Redis.
"""

import logging
import threading
import time
from collections import defaultdict, deque
from typing import Tuple

from fastapi import HTTPException, Request, status

logger = logging.getLogger("hercare.ratelimit")

_buckets: dict[Tuple[str, str], deque] = defaultdict(deque)
_lock = threading.Lock()

# How long hit history is kept per key (seconds)
_WINDOW_SECONDS = 300


def _client_key(request: Request) -> str:
    """Best-effort client identity: remote address (proxy-aware when available)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_rate_limit(
    request: Request,
    bucket: str,
    max_hits: int,
    window_seconds: int = _WINDOW_SECONDS,
) -> None:
    """
    Record one hit for the client in `bucket`; raise 429 when the client exceeded
    `max_hits` within `window_seconds`.
    """
    key = (bucket, _client_key(request))
    now = time.monotonic()

    with _lock:
        hits = _buckets[key]
        while hits and now - hits[0] > window_seconds:
            hits.popleft()

        if len(hits) >= max_hits:
            retry_in = max(1, int(window_seconds - (now - hits[0])))
            logger.warning(
                "Rate limit triggered for bucket=%s key=%s (limit=%d/%ds)",
                bucket,
                key[1],
                max_hits,
                window_seconds,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Too many requests. Please wait about {retry_in} seconds "
                    "before trying again."
                ),
            )

        hits.append(now)


def reset_limits() -> None:
    """Clear all recorded hits (used by tests)."""
    with _lock:
        _buckets.clear()
