import asyncio
from datetime import UTC, datetime, timedelta
from importlib import import_module
from typing import TYPE_CHECKING

import pytest


if TYPE_CHECKING:
    from types import ModuleType


@pytest.fixture
def probe(monkeypatch: pytest.MonkeyPatch) -> ModuleType:
    for key, value in {
        'AUTH_TOKEN': 'test-token',
        'INSTANCES_HOST': 'test.invalid',
        'REDIS_PASSWORD': 'test-password',
    }.items():
        monkeypatch.setenv(key, value)
    module = import_module('instancer.core.instancer.probe')
    monkeypatch.setattr(module.config, 'TRAEFIK_PROBE_HOST', '127.0.0.1')
    return module


def endpoint(probe: ModuleType, kind: str, port: int) -> object:
    return probe.protocol.RCTFInstanceDetails.Endpoint(kind=kind, host='chall.test.invalid', port=port)


async def reachable(probe: ModuleType, response: bytes | None, *, kind: str, age: timedelta) -> bool:
    async def handle(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        await reader.readuntil(b'\r\n\r\n')
        if response is not None:
            writer.write(response)
            await writer.drain()
        writer.close()

    server = await asyncio.start_server(handle, '127.0.0.1', 0)
    port = server.sockets[0].getsockname()[1]
    async with server:
        return await probe.endpoints_reachable([endpoint(probe, kind, port)], datetime.now(UTC) - age)


SETTLED = timedelta(minutes=1)


@pytest.mark.parametrize(
    ('response', 'ready'),
    [
        (b'HTTP/1.1 200 OK\r\n\r\n', True),
        (b'HTTP/1.1 500 Internal Server Error\r\n\r\n', True),
        (b'HTTP/1.1 404 Not Found\r\n\r\n', True),
        (b'HTTP/1.1 502 Bad Gateway\r\n\r\n', False),
        (b'HTTP/1.1 503 Service Unavailable\r\n\r\n', False),
        (None, False),
    ],
)
def test_http_probe(probe: ModuleType, response: bytes | None, *, ready: bool) -> None:
    assert asyncio.run(reachable(probe, response, kind='http', age=SETTLED)) is ready


def test_not_found_before_router_settles_is_not_ready(probe: ModuleType) -> None:
    response = b'HTTP/1.1 404 Not Found\r\n\r\n'
    assert asyncio.run(reachable(probe, response, kind='http', age=timedelta(seconds=1))) is False


def test_unreachable_traefik_is_not_ready(probe: ModuleType) -> None:
    async def scenario() -> bool:
        server = await asyncio.start_server(lambda *_: None, '127.0.0.1', 0)
        port = server.sockets[0].getsockname()[1]
        server.close()
        await server.wait_closed()
        return await probe.endpoints_reachable([endpoint(probe, 'http', port)], datetime.now(UTC) - SETTLED)

    assert asyncio.run(scenario()) is False
