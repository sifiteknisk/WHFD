from contextlib import asynccontextmanager, suppress
from typing import TYPE_CHECKING

import orjson
from redis import asyncio as redis_lib
from redis.asyncio.retry import Retry
from redis.backoff import ExponentialBackoff
from redis.exceptions import LockError

from .config import config


if TYPE_CHECKING:
    from collections.abc import AsyncGenerator


redis = redis_lib.from_url(
    config.cache_connection_url,
    encoding='utf-8',
    decode_responses=True,
    retry_on_timeout=True,
    retry=Retry(ExponentialBackoff(cap=1), 3),
)


@asynccontextmanager
async def instance_lock(challenge: str, team_id: str) -> AsyncGenerator[bool]:
    lock = redis.lock(
        f'{config.PREFIX}:locks:instance:{challenge}:{team_id}',
        timeout=config.REDIS_LOCK_TIMEOUT_SECONDS,
        blocking_timeout=config.REDIS_LOCK_BLOCKING_TIMEOUT_SECONDS,
    )

    acquired = await lock.acquire(blocking=True)
    try:
        yield acquired
    finally:
        if acquired:
            with suppress(LockError):
                await lock.release()


def _expiration_key(instance_id: str) -> str:
    return f'{config.PREFIX}:expiration:{instance_id}'


async def get_instance_expiration(instance_id: str) -> int | None:
    value = await redis.get(_expiration_key(instance_id))
    return int(value) if value else None


async def set_instance_expiration(instance_id: str, expires_at_ms: int, now_ms: int) -> None:
    ttl_seconds = max(1, ((expires_at_ms - now_ms) // 1000) + 120)
    await redis.set(_expiration_key(instance_id), str(expires_at_ms), ex=ttl_seconds)


async def delete_instance_expiration(instance_id: str) -> None:
    await redis.delete(_expiration_key(instance_id))


def _ready_key(instance_id: str) -> str:
    return f'{config.PREFIX}:ready:{instance_id}'


async def is_instance_ready(instance_id: str) -> bool:
    return bool(await redis.exists(_ready_key(instance_id)))


async def mark_instance_ready(instance_id: str, expires_at_ms: int, now_ms: int) -> None:
    ttl_seconds = max(1, ((expires_at_ms - now_ms) // 1000) + 120)
    await redis.set(_ready_key(instance_id), '1', ex=ttl_seconds)


# NOTE: A start job sits in the jobs hash from Start until its build finishes. The
# queue only holds jobs still waiting for the builder, scored by when they were queued.
START_QUEUE_KEY = f'{config.PREFIX}:start-queue'
START_JOBS_KEY = f'{config.PREFIX}:start-jobs'


def start_job_key(challenge: str, team_id: str) -> str:
    return orjson.dumps([challenge, team_id]).decode()


async def is_start_queued(challenge: str, team_id: str) -> bool:
    return bool(await redis.hexists(START_JOBS_KEY, start_job_key(challenge, team_id)))


async def queued_start_count() -> int:
    return await redis.zcard(START_QUEUE_KEY)


async def queue_start(challenge: str, team_id: str, job: str, now_ms: int) -> None:
    key = start_job_key(challenge, team_id)
    async with redis.pipeline(transaction=True) as pipe:
        pipe.hsetnx(START_JOBS_KEY, key, job)
        pipe.zadd(START_QUEUE_KEY, {key: now_ms}, nx=True)
        await pipe.execute()


async def cancel_start(challenge: str, team_id: str) -> bool:
    """Drops the team's start job. Returns whether it was still waiting in the queue."""
    key = start_job_key(challenge, team_id)
    async with redis.pipeline(transaction=True) as pipe:
        pipe.zrem(START_QUEUE_KEY, key)
        pipe.hdel(START_JOBS_KEY, key)
        removed, _ = await pipe.execute()
    return bool(removed)


async def next_start(timeout_seconds: float) -> str | None:
    popped = await redis.bzpopmin(START_QUEUE_KEY, timeout_seconds)
    return popped[1] if popped else None


async def get_start_job(key: str) -> str | None:
    return await redis.hget(START_JOBS_KEY, key)


async def finish_start(key: str) -> None:
    await redis.hdel(START_JOBS_KEY, key)


async def requeue_unfinished_starts() -> None:
    """Puts jobs whose build was cut short by a restart back at the front of the queue."""
    keys = await redis.hkeys(START_JOBS_KEY)
    if keys:
        await redis.zadd(START_QUEUE_KEY, dict.fromkeys(keys, 0), nx=True)
