import asyncio
import uuid
from collections import defaultdict
from datetime import datetime
from functools import cache
from http import HTTPStatus
from pathlib import Path

import orjson
from aiodocker import Docker, DockerError
from aiodocker.containers import DockerContainer
from fastapi import HTTPException

from instancer.core.cache import (
    cancel_start,
    delete_instance_expiration,
    get_build_seconds,
    get_start_state,
    instance_lock,
    is_instance_ready,
    mark_instance_ready,
    queue_start,
    queued_start_count,
    set_instance_expiration,
)
from instancer.core.config import config
from instancer.core.instancer.const import ContainerLabels, get_common_labels
from instancer.core.instancer.containers import (
    cleanup_containers,
    create_container,
    get_containers,
    instance_exists,
)
from instancer.core.instancer.networks import cleanup_networks, create_networks, create_routing_network
from instancer.core.instancer.probe import endpoints_reachable
from instancer.core.instancer.traefik import build_exposed_hostnames, extract_exposes
from instancer.core.instancer.volumes import cleanup_volumes, create_volumes
from instancer.protocol import types as protocol
from instancer.util.expiration import get_effective_expiration
from instancer.util.logger import logger
from instancer.util.time import timestamp_milliseconds


NOT_ACQUIRED_ERROR = HTTPException(status_code=400, detail='Another instance operation is in progress.')

START_FULL_ERROR = HTTPException(
    status_code=400,
    detail=(
        'The instance server is full. Stop instances you no longer need, or wait a few minutes and press Start again.'
    ),
)

_image_locks: defaultdict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

# Queue estimates use this until the builder has timed a real build.
ASSUMED_BUILD_SECONDS = 5.0


def _memory_available_mb() -> int:
    lines = Path('/proc/meminfo').read_text().splitlines()
    return next(int(line.split()[1]) // 1024 for line in lines if line.startswith('MemAvailable:'))


def memory_low() -> bool:
    return bool(config.MIN_AVAILABLE_MEMORY_MB) and _memory_available_mb() < config.MIN_AVAILABLE_MEMORY_MB


def _details(status: protocol.InstanceStatus) -> protocol.RCTFInstanceDetails:
    return protocol.RCTFInstanceDetails(status=status, time_left_milliseconds=None, endpoints=None)


async def _queued_details(challenge: str, team_id: str) -> protocol.RCTFInstanceDetails | None:
    queued, position = await get_start_state(challenge, team_id)
    if not queued:
        return None

    details = _details(protocol.InstanceStatus.STARTING)
    if position is not None:
        build_seconds = await get_build_seconds() or ASSUMED_BUILD_SECONDS
        rounds = (position - 1) / config.MAX_CONCURRENT_STARTS + 1
        details.queue_position = position
        details.queue_eta_milliseconds = int(rounds * build_seconds * 1000)
    return details


@cache
def get_docker() -> Docker:
    # FIXME(es3n1n): This is a workaround for prunner process not having a loop at import time.
    return Docker()


def _split_image_ref(image: str) -> tuple[str, str | None]:
    last_slash = image.rfind('/')
    last_colon = image.rfind(':')
    if last_colon > last_slash:
        return image[:last_colon], image[last_colon + 1 :]
    return image, None


def _ghcr_auth(image: str) -> dict[str, str] | None:
    token = config.GHCR_TOKEN.get_secret_value()
    if not token or not image.startswith('ghcr.io/'):
        return None
    return {
        'username': config.GHCR_USERNAME,
        'password': token,
    }


async def _ensure_image(docker: Docker, image: str) -> None:
    async with _image_locks[image]:
        try:
            await docker.images.get(image)
        except DockerError:
            pass
        else:
            return

        auth = _ghcr_auth(image)
        if '@' in image:
            await docker.images.pull(image, auth=auth)
            return

        name, tag = _split_image_ref(image)
        await docker.images.pull(name, tag=tag or 'latest', auth=auth)


async def _show_containers(containers: list[DockerContainer]) -> list[dict]:
    results = await asyncio.gather(*[c.show() for c in containers], return_exceptions=True)
    details: list[dict] = []
    for result in results:
        if isinstance(result, DockerError) and result.status == HTTPStatus.NOT_FOUND:
            continue
        if isinstance(result, BaseException):
            raise result
        details.append(result)
    return details


async def start_instance(form: protocol.RCTFCreateInstanceForm) -> protocol.RCTFInstanceDetails:
    if queued := await _queued_details(form.challenge_integration_id, form.team_id):
        return queued

    if memory_low():
        logger.warning('Instance start rejected: host memory low')
        raise START_FULL_ERROR
    if await queued_start_count() >= config.MAX_QUEUED_STARTS:
        logger.warning('Instance start rejected: start queue full')
        raise START_FULL_ERROR

    await queue_start(form.challenge_integration_id, form.team_id, form.model_dump_json(), timestamp_milliseconds())
    queued = await _queued_details(form.challenge_integration_id, form.team_id)
    return queued or _details(protocol.InstanceStatus.STARTING)


async def build_instance(form: protocol.RCTFCreateInstanceForm) -> None:
    """Builds a queued start. Runs in the builder process with the instance lock held."""
    docker = get_docker()
    if await instance_exists(docker, form.challenge_integration_id, form.team_id):
        logger.info(f'Instance already exists: {form.challenge_integration_id=} {form.team_id=}')
        return

    started_at = timestamp_milliseconds()
    expires_at = started_at + form.timeout_milliseconds
    instance_id = uuid.uuid4().hex[:12]

    common_labels = get_common_labels(
        instance_id=instance_id,
        expires_at=expires_at,
        challenge_id=form.challenge_integration_id,
        team_id=form.team_id,
        started_at=started_at,
    )

    exposes: dict[str, list[protocol.InstancerExpose]] = {}
    expose_indices: dict[str, list[int]] = {}
    for index, expose in enumerate(form.expose):
        exposes.setdefault(expose.container_name, []).append(expose)
        expose_indices.setdefault(expose.container_name, []).append(index)

    env_context = {
        'RCTF_FLAG': form.flags[0].flag if form.flags else '',
        'RCTF_FLAGS': orjson.dumps([flag.model_dump() for flag in form.flags]).decode(),
        'RCTF_EXPOSED_HOSTNAMES': orjson.dumps(build_exposed_hostnames(form.expose, instance_id)).decode(),
    }

    created_containers: list[DockerContainer] = []
    networks_created: dict[str, str] = {}
    routing_networks_created: list[str] = []
    volumes_created: dict[str, str] = {}

    try:
        networks_created = await create_networks(docker, form.config.networks, common_labels)
        volumes_created = await create_volumes(docker, form.config.volumes, common_labels)
        for i, (svc_name, container) in enumerate(form.config.services.items()):
            await _ensure_image(docker, container.image)

            routing_network: str | None = None
            if exposes.get(svc_name):
                routing_network = await create_routing_network(docker, instance_id, i, common_labels)
                routing_networks_created.append(routing_network)

            created, _ = await create_container(
                docker=docker,
                challenge_integration_id=form.challenge_integration_id,
                exposes=exposes,
                networks_created=networks_created,
                volumes_created=volumes_created,
                common_labels=common_labels,
                svc_name=svc_name,
                container=container,
                routing_network=routing_network,
                global_indices=expose_indices.get(svc_name, []),
                env_context=env_context,
            )
            created_containers.append(created)

        await asyncio.gather(*[container.start() for container in created_containers])
    except BaseException:
        await cleanup_containers(created_containers)
        await cleanup_networks(docker, list(networks_created.values()) + routing_networks_created)
        await cleanup_volumes(docker, list(volumes_created.values()))
        raise


async def _collect_instance_resources(
    containers: list[DockerContainer],
) -> tuple[set[str], set[str]]:
    networks: set[str] = set()
    volumes: set[str] = set()

    details_list = await asyncio.gather(*[container.show() for container in containers])

    for details in details_list:
        for net_name in details['NetworkSettings']['Networks']:
            if net_name.startswith(f'{config.PREFIX}-'):
                networks.add(net_name)

        for mount in details.get('Mounts') or []:
            if mount.get('Type') != 'volume':
                continue

            vol_name = mount.get('Name', '')
            if vol_name.startswith(f'{config.PREFIX}-'):
                volumes.add(vol_name)

    return networks, volumes


async def _stop_and_delete_containers(containers: list[DockerContainer], challenge_name: str, team_id: str) -> None:
    stop_tasks = []
    for container in containers:
        logger.info(f'Stopping container {container.id=} {challenge_name=} {team_id=}')
        stop_tasks.append(container.stop(t=config.DOCKER_STOP_TIMEOUT_SECONDS))

    await asyncio.gather(*stop_tasks, return_exceptions=True)
    await asyncio.gather(*[c.delete(force=True, v=True) for c in containers], return_exceptions=True)
    logger.info(f'Removed {len(containers)} containers.')


async def stop_instance(challenge_name: str, team_id: str) -> protocol.RCTFInstanceDetails:
    # NOTE: The job is dropped before taking the lock, so a build already holding
    # it finishes first and its containers are removed below.
    if await cancel_start(challenge_name, team_id):
        return _details(protocol.InstanceStatus.STOPPED)

    async with instance_lock(challenge_name, team_id) as acquired:
        if not acquired:
            raise NOT_ACQUIRED_ERROR

        docker = get_docker()
        instance_containers = await get_containers(docker, challenge_name, team_id)
        if not instance_containers:
            raise HTTPException(status_code=404, detail='Instance not found')

        instance_id: str | None = None
        if instance_containers:
            try:
                details = await instance_containers[0].show()
                instance_id = details['Config']['Labels'].get(ContainerLabels.INSTANCE_ID)
            except DockerError:
                pass

        networks_to_remove, volumes_to_remove = await _collect_instance_resources(instance_containers)
        await _stop_and_delete_containers(instance_containers, challenge_name, team_id)
        await asyncio.gather(
            cleanup_networks(docker, list(networks_to_remove)),
            cleanup_volumes(docker, list(volumes_to_remove)),
        )

        if instance_id:
            await delete_instance_expiration(instance_id)

        return _details(protocol.InstanceStatus.STOPPED)


def _get_container_status(detail: dict) -> protocol.InstanceStatus:
    state = detail['State']
    container_status = state.get('Status', '')

    if container_status in {'removing', 'paused', 'exited', 'dead'}:
        return protocol.InstanceStatus.ERRORED

    if container_status != 'running':
        return protocol.InstanceStatus.STARTING

    health = state.get('Health')
    if health:
        health_status = health.get('Status', '')
        if health_status == 'unhealthy':
            return protocol.InstanceStatus.ERRORED
        if health_status in ('starting', 'none'):
            return protocol.InstanceStatus.STARTING

    return protocol.InstanceStatus.RUNNING


def _get_highest_status(statuses: list[protocol.InstanceStatus]) -> protocol.InstanceStatus:
    if protocol.InstanceStatus.ERRORED in statuses:
        return protocol.InstanceStatus.ERRORED
    if protocol.InstanceStatus.STARTING in statuses:
        return protocol.InstanceStatus.STARTING
    return protocol.InstanceStatus.RUNNING


async def _get_instance_status(
    details: list[dict],
    endpoints: list[protocol.RCTFInstanceDetails.Endpoint],
    expires_at: int | None,
) -> protocol.InstanceStatus:
    status = _get_highest_status([_get_container_status(detail) for detail in details])
    if status != protocol.InstanceStatus.RUNNING or not endpoints:
        return status

    # NOTE: Docker calls a container running as soon as its process starts, which
    # is before the challenge listens or Traefik routes to it.
    instance_id = details[0]['Config']['Labels'][ContainerLabels.INSTANCE_ID]
    if await is_instance_ready(instance_id):
        return status

    running_since = max(datetime.fromisoformat(detail['State']['StartedAt']) for detail in details)
    if not await endpoints_reachable(endpoints, running_since):
        return protocol.InstanceStatus.STARTING

    if expires_at:
        await mark_instance_ready(instance_id, expires_at, timestamp_milliseconds())
    return status


async def get_instance(challenge_name: str, team_id: str) -> protocol.RCTFInstanceDetails:
    docker = get_docker()
    containers = await get_containers(docker, challenge_name, team_id)

    status = protocol.InstanceStatus.STOPPED
    expires_at: int | None = None
    indexed_endpoints: list[tuple[int, protocol.RCTFInstanceDetails.Endpoint]] = []

    details = await _show_containers(containers)
    for detail in details:
        indexed_endpoints.extend(extract_exposes(detail['Config']['Labels']))
    endpoints = [endpoint for _, endpoint in sorted(indexed_endpoints, key=lambda item: item[0])]

    if details:
        expires_at = await get_effective_expiration(details[0]['Config']['Labels'])
        status = await _get_instance_status(details, endpoints, expires_at)
    elif queued := await _queued_details(challenge_name, team_id):
        return queued

    return protocol.RCTFInstanceDetails(
        status=status,
        endpoints=endpoints if expires_at else None,
        time_left_milliseconds=max(0, expires_at - timestamp_milliseconds()) if expires_at else None,
    )


async def renew_instance(form: protocol.RCTFRenewInstanceForm) -> protocol.RCTFInstanceDetails:
    async with instance_lock(form.challenge_integration_id, form.team_id) as acquired:
        if not acquired:
            raise NOT_ACQUIRED_ERROR

        docker = get_docker()
        containers = await get_containers(docker, form.challenge_integration_id, form.team_id)
        if not containers:
            raise HTTPException(status_code=404, detail='Instance not found')

        now = timestamp_milliseconds()
        new_expires_at = now + form.timeout_milliseconds

        details = await _show_containers(containers)
        if not details:
            raise HTTPException(status_code=404, detail='Instance not found')

        first_labels = details[0]['Config']['Labels']
        instance_id: str | None = first_labels.get(ContainerLabels.INSTANCE_ID)
        if not instance_id:
            raise HTTPException(status_code=500, detail='Instance ID not found in container labels')

        indexed_endpoints: list[tuple[int, protocol.RCTFInstanceDetails.Endpoint]] = []
        for detail in details:
            indexed_endpoints.extend(extract_exposes(detail['Config']['Labels']))
        endpoints = [endpoint for _, endpoint in sorted(indexed_endpoints, key=lambda item: item[0])]

        await set_instance_expiration(instance_id, new_expires_at, now)

        status = await _get_instance_status(details, endpoints, new_expires_at)
        logger.info(
            f'Renewed instance {form.challenge_integration_id=} {form.team_id=} '
            f'{instance_id=} new_expires_at={new_expires_at}'
        )

        return protocol.RCTFInstanceDetails(
            status=status,
            time_left_milliseconds=new_expires_at - timestamp_milliseconds(),
            endpoints=endpoints,
        )
