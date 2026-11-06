import asyncio
import ssl
from datetime import UTC, datetime
from http import HTTPStatus

from instancer.core.config import config
from instancer.protocol import types as protocol


PROBE_TIMEOUT_SECONDS = 3
# A TCP challenge that is up either greets the client or waits for input; Traefik
# hangs up right away when nothing is listening behind the route yet.
TCP_SETTLE_SECONDS = 1
# Traefik answers 404 until it has picked up the router of a freshly started
# container, but after that a 404 comes from the challenge itself.
ROUTER_GRACE_SECONDS = 10
GATEWAY_ERRORS = {HTTPStatus.BAD_GATEWAY, HTTPStatus.SERVICE_UNAVAILABLE, HTTPStatus.GATEWAY_TIMEOUT}

_tls = ssl.create_default_context()
_tls.check_hostname = False
_tls.verify_mode = ssl.CERT_NONE


async def _probe_http(endpoint: protocol.RCTFInstanceDetails.Endpoint, *, router_settled: bool) -> bool:
    tls = endpoint.kind == protocol.ExposeKind.HTTPS
    reader, writer = await asyncio.open_connection(
        config.traefik_probe_host,
        endpoint.port,
        ssl=_tls if tls else None,
        server_hostname=endpoint.host if tls else None,
    )
    try:
        writer.write(f'HEAD / HTTP/1.1\r\nHost: {endpoint.host}\r\nConnection: close\r\n\r\n'.encode())
        await writer.drain()
        status = int((await reader.readline()).split()[1])
    finally:
        writer.close()

    if status == HTTPStatus.NOT_FOUND:
        return router_settled
    return status not in GATEWAY_ERRORS


async def _probe_tcp(endpoint: protocol.RCTFInstanceDetails.Endpoint) -> bool:
    reader, writer = await asyncio.open_connection(
        config.traefik_probe_host,
        endpoint.port,
        ssl=_tls,
        server_hostname=endpoint.host,
    )
    try:
        return bool(await asyncio.wait_for(reader.read(1), TCP_SETTLE_SECONDS))
    except TimeoutError:
        return True
    finally:
        writer.close()


async def _probe(endpoint: protocol.RCTFInstanceDetails.Endpoint, *, router_settled: bool) -> bool:
    probe = (
        _probe_tcp(endpoint)
        if endpoint.kind == protocol.ExposeKind.TCP_SSL
        else _probe_http(endpoint, router_settled=router_settled)
    )
    try:
        return await asyncio.wait_for(probe, PROBE_TIMEOUT_SECONDS)
    except (OSError, TimeoutError, ValueError, IndexError):
        return False


async def endpoints_reachable(endpoints: list[protocol.RCTFInstanceDetails.Endpoint], running_since: datetime) -> bool:
    router_settled = (datetime.now(UTC) - running_since).total_seconds() >= ROUTER_GRACE_SECONDS
    results = await asyncio.gather(*[_probe(endpoint, router_settled=router_settled) for endpoint in endpoints])
    return all(results)
