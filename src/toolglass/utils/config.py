"""Configuration management for toolglass.

Reads from environment variables and ~/.toolglass/config.toml.
"""

import os
import tomllib
from pathlib import Path
from typing import Optional


def _default_db_path() -> str:
    """Default SQLite database path."""
    return str(Path.home() / ".toolglass" / "traces.db")


def _default_config_dir() -> Path:
    """Ensure the toolglass config directory exists."""
    path = Path.home() / ".toolglass"
    path.mkdir(parents=True, exist_ok=True)
    return path


class Config:
    """Global toolglass configuration."""

    def __init__(self) -> None:
        self._load()

    def _load(self) -> None:
        """Load configuration from env vars and config file."""
        # --- Proxy ---
        self.proxy_port: int = int(
            os.getenv("TOOLGLASS_PROXY_PORT", "4317"),
        )
        self.proxy_host: str = os.getenv(
            "TOOLGLASS_PROXY_HOST",
            "127.0.0.1",
        )

        # --- Dashboard ---
        self.dashboard_port: int = int(
            os.getenv("TOOLGLASS_DASHBOARD_PORT", "8080"),
        )
        self.dashboard_enabled: bool = (
            os.getenv("TOOLGLASS_NO_DASHBOARD", "").lower() != "true"
        )

        # --- Storage ---
        self.db_path: str = os.getenv(
            "TOOLGLASS_DB_PATH",
            _default_db_path(),
        )

        # --- Export ---
        self.otlp_endpoint: Optional[str] = os.getenv(
            "TOOLGLASS_OTLP_ENDPOINT",
        )

        # --- Display ---
        self.verbose: bool = (
            os.getenv("TOOLGLASS_VERBOSE", "").lower() == "true"
        )

        # --- Retention ---
        self.max_traces: int = int(
            os.getenv("TOOLGLASS_MAX_TRACES", "100000"),
        )
        self.retention_days: int = int(
            os.getenv("TOOLGLASS_RETENTION_DAYS", "30"),
        )

        # Load config file if it exists (overrides defaults but not env vars)
        config_file = _default_config_dir() / "config.toml"
        if config_file.exists():
            self._load_file(config_file)

    def _load_file(self, path: Path) -> None:
        """Load config from a TOML file. Does NOT override env vars."""
        with open(path, "rb") as f:
            data = tomllib.load(f)

        proxy = data.get("proxy", {})
        if not os.getenv("TOOLGLASS_PROXY_PORT"):
            self.proxy_port = proxy.get("port", self.proxy_port)

        dashboard = data.get("dashboard", {})
        if not os.getenv("TOOLGLASS_DASHBOARD_PORT"):
            self.dashboard_port = dashboard.get("port", self.dashboard_port)

        storage = data.get("storage", {})
        if not os.getenv("TOOLGLASS_DB_PATH"):
            self.db_path = storage.get("db_path", self.db_path)

        if not os.getenv("TOOLGLASS_OTLP_ENDPOINT"):
            self.otlp_endpoint = data.get("export", {}).get(
                "otlp_endpoint",
                self.otlp_endpoint,
            )

        retention = data.get("retention", {})
        if not os.getenv("TOOLGLASS_MAX_TRACES"):
            self.max_traces = retention.get("max_traces", self.max_traces)
        if not os.getenv("TOOLGLASS_RETENTION_DAYS"):
            self.retention_days = retention.get(
                "retention_days",
                self.retention_days,
            )


# Singleton
config = Config()
