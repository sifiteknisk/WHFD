from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from instancer.util.fs import ROOT_DIR


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / '.env',
        env_file_encoding='utf-8',
        extra='ignore',
    )

    DEV_ENV: bool = False

    BIND_HOST: str = '0.0.0.0'
    BIND_PORT: int = 1337
    WEB_WORKERS: int = 2
    USE_PROXY_HEADERS: bool = False

    AUTH_TOKEN: SecretStr

    TRAEFIK_CONTAINER_NAME: str = 'ti-traefik'
    TRAEFIK_HTTP_ENTRYPOINT: str = 'web'
    TRAEFIK_HTTP_PORT: int = 80
    TRAEFIK_HTTPS_ENTRYPOINT: str = 'websecure'
    TRAEFIK_HTTPS_PORT: int = 443
    TRAEFIK_TCP_ENTRYPOINT: str = 'tcp'
    TRAEFIK_TCP_PORT: int = 1337
    TRAEFIK_PERMANENT_REDIRECT_MIDDLEWARE_NAME: str = 'permanent-https-redirect@file'
    # Where the instancer reaches Traefik to check that an instance answers before
    # reporting it running. Defaults to the Traefik container on the shared network.
    TRAEFIK_PROBE_HOST: str = ''

    DOCKER_MANAGER_NAME: str = 'tiny-instancer'
    PREFIX: str = 'ti'

    INSTANCES_HOST: str

    REDIS_HOST: str = 'localhost'
    REDIS_PORT_NUMBER: int = 6379
    REDIS_PASSWORD: SecretStr
    REDIS_LOCK_TIMEOUT_SECONDS: int = 60
    REDIS_LOCK_BLOCKING_TIMEOUT_SECONDS: int = 30

    DOCKER_STOP_TIMEOUT_SECONDS: int = 5

    # Builds allowed at once per web worker; 0 disables the limit. A start that
    # can't get a slot within the queue timeout fails fast with 503 instead of
    # queueing until the reverse proxy gives up with a 504.
    MAX_CONCURRENT_STARTS: int = Field(default=10, ge=0)
    START_QUEUE_TIMEOUT_SECONDS: float = Field(default=10, gt=0, allow_inf_nan=False)

    PRUNNER_INTERVAL_SECONDS: int = 3

    GHCR_USERNAME: str = ''
    GHCR_TOKEN: SecretStr = SecretStr('')

    @property
    def traefik_probe_host(self) -> str:
        return self.TRAEFIK_PROBE_HOST or self.TRAEFIK_CONTAINER_NAME

    @property
    def cache_connection_url(self) -> str:
        return f'redis://:{self.REDIS_PASSWORD.get_secret_value()}@{self.REDIS_HOST}:{self.REDIS_PORT_NUMBER}'


config = Settings()  # type: ignore[call-arg]
