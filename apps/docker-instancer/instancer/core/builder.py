import asyncio
import time
from contextlib import suppress

import orjson
from redis.exceptions import RedisError

from instancer.core.cache import (
    finish_start,
    get_start_job,
    instance_lock,
    next_start,
    record_build_seconds,
    requeue_unfinished_starts,
)
from instancer.core.config import config
from instancer.core.instances import build_instance, memory_low
from instancer.protocol import types as protocol
from instancer.util.logger import logger


try:
    from uvloop import run
except ImportError:
    from asyncio import run


IDLE_SECONDS = 2.0


async def _build(key: str) -> None:
    challenge, team_id = orjson.loads(key)
    async with instance_lock(challenge, team_id) as acquired:
        try:
            # NOTE: Stop drops the job before taking the lock, so a missing job was stopped while queued.
            job = await get_start_job(key)
            if job is None:
                return
            if not acquired:
                logger.warning(f'Dropped start, instance is locked {challenge=} {team_id=}')
                return
            started = time.monotonic()
            await build_instance(protocol.RCTFCreateInstanceForm.model_validate_json(job, by_name=True))
            await record_build_seconds(time.monotonic() - started)
            logger.info(f'Built instance {challenge=} {team_id=}')
        except Exception as err:  # noqa: BLE001 -- one failed build must not stop the builder
            logger.opt(exception=err).error(f'Failed to build instance {challenge=} {team_id=}')
        finally:
            await finish_start(key)


async def start_builder() -> None:
    await requeue_unfinished_starts()
    slots = asyncio.Semaphore(config.MAX_CONCURRENT_STARTS)
    builds: set[asyncio.Task[None]] = set()

    def done(task: asyncio.Task[None]) -> None:
        builds.discard(task)
        slots.release()

    while True:
        await slots.acquire()
        while memory_low():
            logger.warning('Builder paused: host memory low')
            await asyncio.sleep(IDLE_SECONDS)

        try:
            key = await next_start(IDLE_SECONDS)
        except RedisError as err:
            logger.opt(exception=err).error('Builder failed to read the start queue')
            key = None
            await asyncio.sleep(IDLE_SECONDS)

        if key is None:
            slots.release()
            continue

        task = asyncio.create_task(_build(key))
        builds.add(task)
        task.add_done_callback(done)


def builder_process() -> None:
    with suppress(KeyboardInterrupt):
        run(start_builder())
