from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENV: str = "development"

    # Database
    DATABASE_URL: str

    # JWT
    API_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Google Drive (OAuth2)
    GOOGLE_DRIVE_ROOT_FOLDER: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REFRESH_TOKEN: str = ""

    # Wompi
    WOMPI_PUBLIC_KEY: str = ""
    WOMPI_PRIVATE_KEY: str = ""
    WOMPI_INTEGRITY_SECRET: str = ""
    WOMPI_EVENTS_SECRET: str = ""
    WOMPI_ENV: str = "sandbox"

    # App URL (para redirect después de pago)
    APP_URL: str = "http://localhost:3000"

    # Email (Brevo fallback → SMTP)
    BREVO_API_KEY: str = ""
    EMAIL_FROM_NAME: str = "SD4A"
    EMAIL_FROM_ADDRESS: str = "sd4aadmin@gmail.com"

    # SMTP (Gmail)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # Autodesk Platform Services
    APS_CLIENT_ID: str = ""
    APS_CLIENT_SECRET: str = ""


settings = Settings()
