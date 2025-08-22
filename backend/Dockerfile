# Use the official Python image with a specific patch version for security
FROM python:3.11.13-slim-bookworm

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH /app

# Set work directory
WORKDIR /app

# Install system dependencies with security updates
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Install Python dependencies with security best practices
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Ensure production settings during build steps
ENV DJANGO_SETTINGS_MODULE=backend.settings.production

# Collect static files using production settings
RUN python manage.py collectstatic --noinput

# Run Gunicorn
EXPOSE 8080
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 backend.wsgi:application
