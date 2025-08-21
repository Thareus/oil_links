# Use the official Python image as the base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH /app

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Ensure production settings during build steps
ENV DJANGO_SETTINGS_MODULE=backend.settings.production

# Collect static files using production settings
RUN python manage.py collectstatic --noinput

# Run Gunicorn
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 backend.wsgi:application
