from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Control Hub API"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+psycopg://controlhub:controlhub@localhost:5432/controlhub"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    auth_rate_limit_max_requests: int = 10
    auth_rate_limit_window_seconds: int = 60

    auth_lockout_window_seconds: int = 86400
    auth_lockout_base_seconds: int = 60
    auth_lockout_max_seconds: int = 3600

    agent_handshake_max_skew_seconds: int = 90
    agent_handshake_nonce_ttl_seconds: int = 300

    cors_allow_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"


settings = Settings()
