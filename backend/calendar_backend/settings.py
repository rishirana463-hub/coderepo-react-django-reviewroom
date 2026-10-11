import os
from pathlib import Path

import mongoengine
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def required_secret(name):
    value = os.getenv(name, "")
    if len(value) < 32:
        raise ImproperlyConfigured(f"{name} must be set to at least 32 characters in backend/.env.")
    return value


SECRET_KEY = required_secret("DJANGO_SECRET_KEY")
JWT_SECRET = required_secret("JWT_SECRET")
JWT_ISSUER = "reviewroom-api"
JWT_AUDIENCE = "reviewroom-app"
JWT_EXPIRES_HOURS = 8
DEBUG = os.getenv("DJANGO_DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = [value.strip() for value in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",") if value.strip()]
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/reviewroom_db")
mongoengine.connect(host=MONGODB_URI, uuidRepresentation="standard", serverSelectionTimeoutMS=3000)
INSTALLED_APPS = ["corsheaders", "rest_framework"]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.shared.middleware.APISecurityMiddleware",
]
CORS_ALLOWED_ORIGINS = [value.strip() for value in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if value.strip()]
CORS_ALLOW_CREDENTIALS = False
ROOT_URLCONF = "calendar_backend.urls"
DATABASES = {}
TEMPLATES = []
REST_FRAMEWORK = {
    "UNAUTHENTICATED_USER": None,
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "EXCEPTION_HANDLER": "apps.shared.errors.api_exception_handler",
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
}
USE_TZ = True
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024
# Enable HTTPS redirects/HSTS only for a deployment configured to serve TLS.
# Proxy headers are trusted separately and only behind a controlled proxy that
# removes client-supplied X-Forwarded-Proto before setting its own value.
SECURE_SSL_REDIRECT = os.getenv("REVIEWROOM_HTTPS", "false").lower() == "true"
SECURE_HSTS_SECONDS = 31536000 if SECURE_SSL_REDIRECT else 0
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https") if os.getenv("TRUST_PROXY_HTTPS", "false").lower() == "true" else None
