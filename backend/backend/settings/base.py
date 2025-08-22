import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from environment-specific .env files
# Precedence: ENV_FILE (explicit) > .env.<environment> > .env
_env_file = os.getenv('ENV_FILE')
if not _env_file:
    # Infer environment from settings module or ENVIRONMENT variable
    _settings_mod = os.getenv('DJANGO_SETTINGS_MODULE', '')
    _env_name = os.getenv('ENVIRONMENT')
    if not _env_name:
        if _settings_mod.endswith('.production'):
            _env_name = 'production'
        elif _settings_mod.endswith('.local') or _settings_mod.endswith('.development') or _settings_mod.endswith('.dev'):
            _env_name = 'development'
        else:
            _env_name = 'development'
    candidate = BASE_DIR / f'.env.{_env_name}'
    if candidate.exists():
        _env_file = str(candidate)
    else:
        fallback = BASE_DIR / '.env'
        _env_file = str(fallback) if fallback.exists() else None

if _env_file:
    load_dotenv(_env_file)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', '1%1as&%on1-eme@g^n4d$uby3tls$_xf%lxfqppw0zzc-%=346')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')
if not ALLOWED_HOSTS[0]:
    ALLOWED_HOSTS = []

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    
    # Third-party apps
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt.token_blacklist',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'corsheaders',
    'whitenoise.runserver_nostatic',
    'drf_yasg',
    'storages',
    
    # Local apps
    'users.apps.UsersConfig',
    'sources.apps.SourcesConfig',
    'stories.apps.StoriesConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# Database
# Default SQLite configuration (will be overridden by environment variables)
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Database router and connection settings
DATABASES['default']['OPTIONS'] = {
    'connect_timeout': 5,  # 5 seconds connection timeout
}

# Enable connection persistence
DATABASES['default']['CONN_MAX_AGE'] = 600  # 10 minutes

# Cloud SQL (Unix socket) support: if CLOUDSQL_INSTANCE is provided, set HOST to /cloudsql/<instance>
_cloudsql_instance = os.getenv('CLOUDSQL_INSTANCE')
if _cloudsql_instance:
    DATABASES['default']['HOST'] = f"/cloudsql/{_cloudsql_instance}"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Authentication
AUTH_USER_MODEL = 'users.CustomUser'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        # Accept Authorization: Bearer <token> from frontend
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        # Also accept JWT in HttpOnly cookies if used
        'dj_rest_auth.jwt_auth.JWTCookieAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# JWT Settings
REST_USE_JWT = True
JWT_AUTH_COOKIE = 'auth-token'
JWT_AUTH_REFRESH_COOKIE = 'refresh-token'
JWT_AUTH_HTTPONLY = True

# In production (DEBUG=False) default to SameSite=None for cross-site SPAs
_DEFAULT_SAMESITE = 'Lax' if DEBUG else 'None'
JWT_AUTH_SAMESITE = os.getenv('JWT_AUTH_SAMESITE', _DEFAULT_SAMESITE)

# Secure cookies are required by browsers when SameSite=None
JWT_AUTH_SECURE = os.getenv('JWT_AUTH_SECURE', 'True' if not DEBUG else 'False') == 'True'

# Allauth Settings
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
ACCOUNT_CONFIRM_EMAIL_ON_GET = True
LOGIN_URL = 'http://localhost:3000/login'

# CORS Settings
CORS_ALLOW_CREDENTIALS = True
# Explicitly allow frontend origins
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000'
).split(',')
if not CORS_ALLOWED_ORIGINS[0]:
    CORS_ALLOWED_ORIGINS = []

CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost:3000').split(',')
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
CORS_EXPOSE_HEADERS = ['Content-Type', 'X-CSRFToken']
SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', _DEFAULT_SAMESITE)
CSRF_COOKIE_SAMESITE = os.getenv('CSRF_COOKIE_SAMESITE', _DEFAULT_SAMESITE)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False  # Must be False for JavaScript to be able to read it
# Optional cookie domain overrides (useful for subdomain setups)
_session_cookie_domain = os.getenv('SESSION_COOKIE_DOMAIN', '').strip()
if _session_cookie_domain:
    SESSION_COOKIE_DOMAIN = _session_cookie_domain

_csrf_cookie_domain = os.getenv('CSRF_COOKIE_DOMAIN', '').strip()
if _csrf_cookie_domain:
    CSRF_COOKIE_DOMAIN = _csrf_cookie_domain
CSRF_USE_SESSIONS = False

# Site ID
SITE_ID = 1

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Simple JWT configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    # Keep refresh lifetime reasonably long; cookie decides persistence
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
}

# Cookie name for persisting remember-me preference
JWT_REMEMBER_ME_COOKIE = 'jwt-remember'
