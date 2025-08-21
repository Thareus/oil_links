import os
from .base import *  # noqa

# SECURITY WARNING: keep the secret key used in development secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', '1%1as&%on1-eme@g^n4d$uby3tls$_xf%lxfqppw0zzc-%=346')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'oil-links-postgresql-database'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5433'),
        'OPTIONS': {
            'connect_timeout': 5,
            'options': '-c search_path=public'
        },
    }
}

# Enable SQL query logging for debugging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'level': 'WARNING',
            'handlers': ['console'],
        },
    },
}

# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
