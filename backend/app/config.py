"""
Application configuration using pydantic-settings.
Loads settings from environment variables or .env file.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


# Get the backend directory for SQLite database path
BACKEND_DIR = Path(__file__).parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra environment variables not defined in the model
    )

    # Database - SQLite by default for local dev, set DATABASE_URL env var for PostgreSQL in production
    DATABASE_URL: str = f"sqlite:///{BACKEND_DIR}/neobudget.db"

    # Application
    DEBUG: bool = False

    # CORS - comma separated origins
    CORS_ORIGINS: str = "http://localhost:3000"

    # Clerk Authentication
    CLERK_SECRET_KEY: str = ""
    CLERK_JWKS_URL: str = (
        "https://pleased-tarpon-15.clerk.accounts.dev/.well-known/jwks.json"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS string into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_sqlite(self) -> bool:
        """Check if using SQLite database."""
        return self.DATABASE_URL.startswith("sqlite")


settings = Settings()
