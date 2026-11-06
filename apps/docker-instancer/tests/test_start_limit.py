import asyncio
from contextlib import asynccontextmanager
from http import HTTPStatus
from importlib import import_module
from types import SimpleNamespace
from typing import TYPE_CHECKING
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException


if TYPE_CHECKING:
    from collections.abc import AsyncIterator
    from types import ModuleType

    from instancer.protocol.types import RCTFCreateInstanceForm


# ruff: noqa: SLF001 -- the semaphore is internal; test its release paths directly.


@pytest.fixture
def instances(monkeypatch: pytest.MonkeyPatch) -> ModuleType:
    for key, value in {
        'AUTH_TOKEN': 'test-token',
        'INSTANCES_HOST': 'test.invalid',
        'REDIS_PASSWORD': 'test-password',
    }.items():
        monkeypatch.setenv(key, value)
    module = import_module('instancer.core.instances')
    monkeypatch.setattr(module.config, 'START_QUEUE_TIMEOUT_SECONDS', 0.02)

    @asynccontextmanager
    async def unlocked(*_args: object) -> AsyncIterator[bool]:
        yield True

    monkeypatch.setattr(module, 'instance_lock', unlocked)
    monkeypatch.setattr(module, 'get_docker', object)
    monkeypatch.setattr(module, 'instance_exists', AsyncMock(return_value=False))
    monkeypatch.setattr(module, 'create_networks', AsyncMock(return_value={}))
    monkeypatch.setattr(module, 'create_volumes', AsyncMock(return_value={}))
    return module


def form(instances: ModuleType, team_id: str = 'team') -> RCTFCreateInstanceForm:
    return instances.protocol.RCTFCreateInstanceForm.model_validate(
        {
            'rctfAuthToken': 'test-token',
            'teamId': team_id,
            'challengeIntegrationId': 'challenge',
            'timeoutMilliseconds': 60_000,
            'config': {'services': {}},
            'expose': [],
        }
    )


def test_start_limit_rejects_overflow_and_releases_slots(
    instances: ModuleType,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def scenario() -> None:
        limit = 2
        monkeypatch.setattr(instances, '_start_slots', asyncio.Semaphore(limit))
        entered = 0
        both_building = asyncio.Event()
        release = asyncio.Event()

        async def build(*_args: object) -> dict[str, str]:
            nonlocal entered
            entered += 1
            if entered == limit:
                both_building.set()
            await release.wait()
            return {}

        monkeypatch.setattr(instances, 'create_networks', build)
        builds = [asyncio.create_task(instances.start_instance(form(instances, str(i)))) for i in range(limit)]
        await asyncio.wait_for(both_building.wait(), 1)
        rejected = await asyncio.gather(
            *(instances.start_instance(form(instances, str(i))) for i in range(limit, limit * 2)),
            return_exceptions=True,
        )
        assert all(isinstance(err, HTTPException) and err.status_code == HTTPStatus.BAD_REQUEST for err in rejected)
        assert all('press Start again' in err.detail for err in rejected)
        assert entered == limit
        release.set()
        results = await asyncio.gather(*builds)
        assert all(result.status == instances.protocol.InstanceStatus.STARTING for result in results)
        await instances.start_instance(form(instances, 'next'))
        assert entered == limit + 1

    asyncio.run(scenario())


@pytest.mark.parametrize('cancel', [False, True])
def test_start_slot_released_after_failure_or_cancellation(
    instances: ModuleType,
    monkeypatch: pytest.MonkeyPatch,
    *,
    cancel: bool,
) -> None:
    async def scenario() -> None:
        monkeypatch.setattr(instances, '_start_slots', asyncio.Semaphore(1))
        if cancel:
            entered = asyncio.Event()

            async def build() -> None:
                async with instances._start_slot():
                    entered.set()
                    await asyncio.Event().wait()

            task = asyncio.create_task(build())
            await entered.wait()
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task
        else:
            with pytest.raises(RuntimeError):
                async with instances._start_slot():
                    raise RuntimeError

        async with instances._start_slot():
            pass

    asyncio.run(scenario())


def test_same_image_is_pulled_once(instances: ModuleType) -> None:
    async def scenario() -> None:
        pulled: set[str] = set()
        pulls_running = 0
        max_pulls_running = 0

        async def get(image: str) -> None:
            if image not in pulled:
                raise instances.DockerError(404, {'message': 'missing'})

        async def pull(name: str, **_kwargs: object) -> None:
            nonlocal pulls_running, max_pulls_running
            pulls_running += 1
            max_pulls_running = max(max_pulls_running, pulls_running)
            await asyncio.sleep(0.01)
            pulled.add(f'{name}:latest')
            pulls_running -= 1

        docker = SimpleNamespace(images=SimpleNamespace(get=get, pull=AsyncMock(side_effect=pull)))
        await asyncio.gather(*(instances._ensure_image(docker, 'challenge:latest') for _ in range(5)))
        assert docker.images.pull.await_count == 1
        assert max_pulls_running == 1

    asyncio.run(scenario())


def test_start_rejected_when_host_memory_low(instances: ModuleType, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(instances.config, 'MIN_AVAILABLE_MEMORY_MB', 6144)
    monkeypatch.setattr(instances, '_memory_available_mb', lambda: 6000)
    with pytest.raises(HTTPException) as err:
        asyncio.run(instances.start_instance(form(instances)))
    assert err.value.status_code == HTTPStatus.BAD_REQUEST
    assert 'full' in err.value.detail

    monkeypatch.setattr(instances, '_memory_available_mb', lambda: 7000)
    asyncio.run(instances.start_instance(form(instances)))


def test_memory_available_reads_proc_meminfo(instances: ModuleType) -> None:
    assert instances._memory_available_mb() > 0


def test_limit_can_be_disabled(instances: ModuleType, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(instances, '_start_slots', None)
    asyncio.run(instances.start_instance(form(instances)))


def test_waiting_for_slot_does_not_use_instance_lifetime(
    instances: ModuleType,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def scenario() -> None:
        slots = asyncio.Semaphore(0)
        monkeypatch.setattr(instances, '_start_slots', slots)
        now = 1_000_000
        monkeypatch.setattr(instances, 'timestamp_milliseconds', lambda: now)
        task = asyncio.create_task(instances.start_instance(form(instances)))
        await asyncio.sleep(0)
        now += 5_000
        slots.release()
        result = await task
        assert result.time_left_milliseconds == form(instances).timeout_milliseconds

    asyncio.run(scenario())
