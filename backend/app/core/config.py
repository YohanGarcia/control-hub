from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Control Hub API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+psycopg://controlhub:controlhub@localhost:5432/controlhub"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "control-hub-api"
    jwt_audience: str = "control-hub-frontend"
    jwt_clock_skew_seconds: int = 30
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    refresh_cookie_name: str = "ch_refresh"
    refresh_cookie_secure: bool | None = None
    refresh_cookie_samesite: str | None = None
    refresh_cookie_domain: str | None = None
    refresh_cookie_path: str = "/api/v1/auth"

    auth_rate_limit_max_requests: int = 10
    auth_rate_limit_window_seconds: int = 60

    auth_lockout_window_seconds: int = 86400
    auth_lockout_base_seconds: int = 60
    auth_lockout_max_seconds: int = 3600

    agent_handshake_max_skew_seconds: int = 90
    agent_handshake_nonce_ttl_seconds: int = 300

    cors_allow_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"prod", "production"}

    @property
    def effective_refresh_cookie_secure(self) -> bool:
        if self.refresh_cookie_secure is not None:
            return self.refresh_cookie_secure
        return self.is_production

    @property
    def effective_refresh_cookie_samesite(self) -> str:
        if self.refresh_cookie_samesite:
            return self.refresh_cookie_samesite
        return "none" if self.is_production else "lax"


settings = Settings()
