"""
Django settings for NexlogsFlock (Poultry Farm Management SaaS).
Multi-tenant architecture on PostgreSQL.
"""

from pathlib import Path
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent


SECRET_KEY = "django-insecure-change-me-in-production"

DEBUG = True

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    # Third-party
    "rest_framework",
    # --- NexlogsFlock apps ---
    # core
    "apps.core.tenant",
    "apps.core.users",
    "apps.core.authtntuser",
    # organization
    "apps.organization.branch",
    "apps.organization.house",
    # livestock
    "apps.livestock.breed",
    "apps.livestock.purchase",
    "apps.livestock.batch",
    "apps.livestock.lifecycle",
    "apps.livestock.mortality",
    # production
    "apps.production.egg",
    "apps.production.harvest",
    # feed
    "apps.feed.feed_type",
    "apps.feed.consumption",
    # health
    "apps.health.disease",
    "apps.health.outbreak",
    "apps.health.treatment",
    "apps.health.medication",
    "apps.health.quarantine",
    "apps.health.biosecurity",
    "apps.health.recovery",
    "apps.health.vaccination",
    # finance
    "apps.finance.invoice",
    "apps.finance.payment",
    # analytics
    "apps.analytics.daily_farm_analytics",
    # inventory
    "apps.inventory.meat",
    "apps.inventory.egg"
    # automation
    
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    )
}

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

FRONTEND_URL = "http://localhost:3000"  # Development
# FRONTEND_URL = "https://app.yourdomain.com"  # Production

EGG_CRATE_CAPACITY = 30


# Email Configuration
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
# EMAIL_USE_SSL = True
# EMAIL_USE_TLS = False
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "nuelklus@gmail.com"
EMAIL_HOST_PASSWORD = "tmxixdsvtlsqfsib"
DEFAULT_FROM_EMAIL = "noreply@yourdomain.com"
ADMIN_EMAIL = "nuelklus@gmail.com"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "nexlogsflockdb",
        "USER": "nexlogs_user",
        "PASSWORD": "StrongPassword990",
        "HOST": "127.0.0.1",
        "PORT": "5432",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "core_users.User"

from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    *default_headers,
    "x-tenant-id",
]