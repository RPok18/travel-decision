import os
from dataclasses import dataclass


@dataclass
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./travel_decision.db")
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
    otp_expire_minutes: int = int(os.getenv("OTP_EXPIRE_MINUTES", "15"))
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    # AI Settings
    ai_provider: str = os.getenv("AI_PROVIDER", "ollama")
    ai_model: str = os.getenv("AI_MODEL", "llama3")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    def __post_init__(self):
        # Fix deprecated postgres:// scheme for SQLAlchemy 2.0+
        if self.database_url and self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql://", 1)
        
        # Add SSL mode for PostgreSQL connections (required by Render)
        if self.database_url and self.database_url.startswith("postgresql://"):
            if "sslmode" not in self.database_url:
                separator = "&" if "?" in self.database_url else "?"
                self.database_url += f"{separator}sslmode=require"


settings = Settings()
