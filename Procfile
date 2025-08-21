web: gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 backend.wsgi
migrate: python manage.py migrate && python manage.py collectstatic --noinput --clear
createuser: python manage.py createsuperuser --username admin --email noop@example.com --noinput