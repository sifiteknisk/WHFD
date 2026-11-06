import asyncio
from contextlib import asynccontextmanager
from http import HTTPStatus
from importlib import import_module
from itertools import count
from types import SimpleNamespace
from typing import TYPE_CHECKING
from unittest.mock import AsyncMock

import pytest
from fakeredis import FakeServer
from fakeredis.aioredis import FakeRedis
from fastapi import HTTPException


if TYPE_CHECKING:
    from collections.abc import AsyncIterator, Callable

    from instancer.protocol.types import RCTFCreateInstanceForm


# ruff: noqa: SLF001, ASYNC110, PLR2004 -- tests reach into internals and poll for the builder.

STARTING = 'starting'
STOPPED = 'stopped'


@pytest.fixture
def m(monkeypatch: pytest.MonkeyPatch) -> SimpleNamespace:
    for key, value in {
        'AUTH_TOKEN': 'test-token',
        'INSTANCES_HOST': 'test.invalid',
        'REDIS_PASSWORD': 'test-password',
    }.items():
        monkeypatch.setenv(key, value)
    cache = import_module('instancer.core.cache')
    instances = import_module('instancer.core.instances')
    builder = import_module('instancer.core.builder')

    @asynccontextmanager
    async def unlocked(*_args: object) -> AsyncIterator[bool]:
        yield True

    monkeypatch.setattr(cache, 'redis', FakeRedis(server=FakeServer(), decode_responses=True))
    monkeypatch.setattr(instances, 'instance_lock', unlocked)
    monkeypatch.setattr(builder, 'instance_lock', unlocked)
    monkeypatch.setattr(builder, 'IDLE_SECONDS', 0.01)
    monkeypatch.setattr(instances, 'get_containers', AsyncMock(return_value=[]))
    monkeypatch.setattr(instances, 'timestamp_milliseconds', count(1).__next__)
    monkeypatch.setattr(instances.config, 'MIN_AVAILABLE_MEMORY_MB', 0)
    return SimpleNamespace(cache=cache, instances=instances, builder=builder)


def form(m: SimpleNamespace, team_id: str = 'team') -> RCTFCreateInstanceForm:
    return m.instances.protocol.RCTFCreateInstanceForm.model_validate(
        {
            'rctfAuthToken': 'test-token',
            'teamId': team_id,
            'challengeIntegrationId': 'challenge',
            'timeoutMilliseconds': 60_000,
            'config': {'services': {}},
            'expose': [{'kind': 'http', 'hostPrefix': 'web', 'containerName': 'app', 'containerPort': 80}],
            'flags': [{'provider': 'static', 'flag': 'flag{test}'}],
        }
    )


async def status(m: SimpleNamespace, team_id: str = 'team') -> str:
    return (await m.instances.get_instance('challenge', team_id)).status


async def until(condition: Callable[[], bool]) -> None:
    async with asyncio.timeout(2):
        while not condition():
            await asyncio.sleep(0.005)


@asynccontextmanager
async def running_builder(m: SimpleNamespace) -> AsyncIterator[None]:
    task = asyncio.create_task(m.builder.start_builder())
    try:
        yield
    finally:
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task


def test_start_queues_once_and_reports_starting(m: SimpleNamespace) -> None:
    async def scenario() -> None:
        first = await m.instances.start_instance(form(m))
        again = await m.instances.start_instance(form(m))
        assert first.status == again.status == STARTING
        assert await m.cache.queued_start_count() == 1
        assert await status(m) == STARTING
        assert await status(m, 'other') == STOPPED

    asyncio.run(scenario())


def test_queued_start_reports_position_and_estimate(m: SimpleNamespace, monkeypatch: pytest.MonkeyPatch) -> None:
    async def scenario() -> None:
        monkeypatch.setattr(m.instances.config, 'MAX_CONCURRENT_STARTS', 2)
        first = await m.instances.start_instance(form(m, 'a'))
        assert first.queue_position == 1
        assert first.queue_eta_milliseconds == m.instances.ASSUMED_BUILD_SECONDS * 1000
        for team in 'bc':
            await m.instances.start_instance(form(m, team))

        await m.cache.record_build_seconds(4)
        third = await m.instances.get_instance('challenge', 'c')
        assert third.queue_position == 3
        assert third.queue_eta_milliseconds == 8000
        assert third.model_dump(by_alias=True)['queueEtaMilliseconds'] == 8000

        await m.cache.next_start(0.01)
        building = await m.instances.get_instance('challenge', 'a')
        assert building.status == STARTING
        assert building.queue_position is None
        assert (await m.instances.get_instance('challenge', 'b')).queue_position == 1

    asyncio.run(scenario())


def test_builder_records_build_time(m: SimpleNamespace, monkeypatch: pytest.MonkeyPatch) -> None:
    async def scenario() -> None:
        build = AsyncMock()
        monkeypatch.setattr(m.builder, 'build_instance', build)
        await m.instances.start_instance(form(m))
        async with running_builder(m):
            await until(lambda: build.await_count == 1)
            async with asyncio.timeout(2):
                while await m.cache.get_build_seconds() is None:
                    await asyncio.sleep(0.005)

        await m.cache.record_build_seconds(10)
        assert await m.cache.get_build_seconds() == pytest.approx(2, abs=0.1)

    asyncio.run(scenario())


def test_start_rejected_when_queue_full(m: SimpleNamespace, monkeypatch: pytest.MonkeyPatch) -> None:
    async def scenario() -> None:
        monkeypatch.setattr(m.instances.config, 'MAX_QUEUED_STARTS', 2)
        await m.instances.start_instance(form(m, 'a'))
        await m.instances.start_instance(form(m, 'b'))
        with pytest.raises(HTTPException) as err:
            await m.instances.start_instance(form(m, 'c'))
        assert err.value.status_code == HTTPStatus.BAD_REQUEST
        assert 'full' in err.value.detail
        assert (await m.instances.start_instance(form(m, 'a'))).status == STARTING

    asyncio.run(scenario())


def test_start_rejected_when_host_memory_low(m: SimpleNamespace, monkeypatch: pytest.MonkeyPatch) -> None:
    async def scenario() -> None:
        monkeypatch.setattr(m.instances.config, 'MIN_AVAILABLE_MEMORY_MB', 6144)
        monkeypatch.setattr(m.instances, '_memory_available_mb', lambda: 6000)
        with pytest.raises(HTTPException) as err:
            await m.instances.start_instance(form(m))
        assert 'full' in err.value.detail

        monkeypatch.setattr(m.instances, '_memory_available_mb', lambda: 7000)
        assert (await m.instances.start_instance(form(m))).status == STARTING

    asyncio.run(scenario())


def test_memory_available_reads_proc_meminfo(m: SimpleNamespace) -> None:
    assert m.instances._memory_available_mb() > 0


def test_stop_removes_queued_start(m: SimpleNamespace) -> None:
    async def scenario() -> None:
        await m.instances.start_instance(form(m))
        assert (await m.instances.stop_instance('challenge', 'team')).status == STOPPED
        assert await m.cache.queued_start_count() == 0
        assert await status(m) == STOPPED
        with pytest.raises(HTTPException) as err:
            await m.instances.stop_instance('challenge', 'team')
        assert err.value.status_code == HTTPStatus.NOT_FOUND

    asyncio.run(scenario())


def test_builder_builds_oldest_first_and_limits_concurrency(
    m: SimpleNamespace, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def scenario() -> None:
        monkeypatch.setattr(m.builder.config, 'MAX_CONCURRENT_STARTS', 2)
        built: list[str] = []
        release = asyncio.Event()

        async def build(built_form: RCTFCreateInstanceForm) -> None:
            assert built_form.flags[0].flag == 'flag{test}'
            assert built_form.expose[0].host_prefix == 'web'
            built.append(built_form.team_id)
            await release.wait()

        monkeypatch.setattr(m.builder, 'build_instance', build)
        teams = [str(i) for i in range(5)]
        for team in teams:
            await m.instances.start_instance(form(m, team))
        await m.instances.stop_instance('challenge', '3')

        async with running_builder(m):
            await until(lambda: len(built) == 2)
            await asyncio.sleep(0.05)
            assert built == ['0', '1']
            assert await status(m, '4') == STARTING

            release.set()
            await until(lambda: len(built) == 4)
            assert built == ['0', '1', '2', '4']
            async with asyncio.timeout(2):
                while await status(m, '4') != STOPPED:
                    await asyncio.sleep(0.005)

    asyncio.run(scenario())


def test_builder_survives_failed_build(m: SimpleNamespace, monkeypatch: pytest.MonkeyPatch) -> None:
    async def scenario() -> None:
        built: list[str] = []

        async def build(built_form: RCTFCreateInstanceForm) -> None:
            built.append(built_form.team_id)
            if built_form.team_id == 'bad':
                raise RuntimeError

        monkeypatch.setattr(m.builder, 'build_instance', build)
        await m.instances.start_instance(form(m, 'bad'))
        await m.instances.start_instance(form(m, 'good'))
        async with running_builder(m):
            await until(lambda: built == ['bad', 'good'])
        assert await status(m, 'bad') == STOPPED

    asyncio.run(scenario())


def test_builder_pauses_while_memory_low(m: SimpleNamespace, monkeypatch: pytest.MonkeyPatch) -> None:
    async def scenario() -> None:
        build = AsyncMock()
        monkeypatch.setattr(m.builder, 'build_instance', build)
        await m.instances.start_instance(form(m))

        monkeypatch.setattr(m.instances.config, 'MIN_AVAILABLE_MEMORY_MB', 6144)
        monkeypatch.setattr(m.instances, '_memory_available_mb', lambda: 6000)
        async with running_builder(m):
            await asyncio.sleep(0.05)
            build.assert_not_awaited()
            monkeypatch.setattr(m.instances, '_memory_available_mb', lambda: 7000)
            await until(lambda: build.await_count == 1)

    asyncio.run(scenario())


def test_builder_requeues_build_cut_short_by_restart(m: SimpleNamespace, monkeypatch: pytest.MonkeyPatch) -> None:
    async def scenario() -> None:
        build = AsyncMock()
        monkeypatch.setattr(m.builder, 'build_instance', build)
        await m.instances.start_instance(form(m))
        assert await m.cache.next_start(0.01) is not None

        async with running_builder(m):
            await until(lambda: build.await_count == 1)

    asyncio.run(scenario())


def test_same_image_is_pulled_once(m: SimpleNamespace) -> None:
    async def scenario() -> None:
        pulled: set[str] = set()
        pulls_running = 0
        max_pulls_running = 0

        async def get(image: str) -> None:
            if image not in pulled:
                raise m.instances.DockerError(404, {'message': 'missing'})

        async def pull(name: str, **_kwargs: object) -> None:
            nonlocal pulls_running, max_pulls_running
            pulls_running += 1
            max_pulls_running = max(max_pulls_running, pulls_running)
            await asyncio.sleep(0.01)
            pulled.add(f'{name}:latest')
            pulls_running -= 1

        docker = SimpleNamespace(images=SimpleNamespace(get=get, pull=AsyncMock(side_effect=pull)))
        await asyncio.gather(*(m.instances._ensure_image(docker, 'challenge:latest') for _ in range(5)))
        assert docker.images.pull.await_count == 1
        assert max_pulls_running == 1

    asyncio.run(scenario())
