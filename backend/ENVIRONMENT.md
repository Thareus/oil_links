Environment configuration

Overview
- The project now supports separate env files for development and production.
- Base settings automatically load one of the following files (in this order of precedence):
  1) A file specified by `ENV_FILE`
  2) `BASE_DIR/.env.<environment>` where `<environment>` is inferred
  3) `BASE_DIR/.env` (legacy fallback)

Which environment is used?
- In development, `manage.py` sets `DJANGO_SETTINGS_MODULE=backend.settings.local`.
- In production, `wsgi.py` sets `DJANGO_SETTINGS_MODULE=backend.settings.production`.
- The settings loader infers the `<environment>` from `DJANGO_SETTINGS_MODULE`:
  - `*.local` → `development` → loads `.env.development`
  - `*.production` → `production` → loads `.env.production`
  - Or set `ENVIRONMENT=development|production` explicitly.

Files
- `backend/.env.development` – local defaults (DEBUG on, relaxed cookies, local DB, localhost CORS/CSRF)
- `backend/.env.production` – production template (DEBUG off, secure cookies, HTTPS origins)

Override path
- Set `ENV_FILE=/absolute/path/to/your.env` to force a specific file.

Cookie/SameSite defaults
- In production (DEBUG=False), cookies default to `SameSite=None` and `Secure=True`, suitable for cross‑site SPAs over HTTPS.
- You may override with env vars: `JWT_AUTH_SAMESITE`, `JWT_AUTH_SECURE`, `SESSION_COOKIE_SAMESITE`, `CSRF_COOKIE_SAMESITE`.

Required production vars
- `DJANGO_SECRET_KEY` – strong, unique value.
- `ALLOWED_HOSTS` – your API host(s), comma separated.
- `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` – your frontend origin(s), with scheme.
- `DATABASE_URL` – production database URL.

Cloud Run / Cloud Build
- `backend/cloudbuild.yaml` deploy step passes key env vars via `--set-env-vars`.
- Update the substitutions in `cloudbuild.yaml` or set them in your Cloud Build trigger UI:
  - `_DJANGO_SECRET_KEY`, `_DATABASE_URL`, `_ALLOWED_HOSTS`
  - `_CORS_ALLOWED_ORIGINS`, `_CSRF_TRUSTED_ORIGINS`
  - `_JWT_AUTH_SAMESITE` (default None), `_JWT_AUTH_SECURE` (default True)
  - `_SESSION_COOKIE_SAMESITE`, `_CSRF_COOKIE_SAMESITE` (default None in prod)
  - Optional: `_SESSION_COOKIE_DOMAIN`, `_CSRF_COOKIE_DOMAIN` for subdomain setups

Local Docker Compose
- `docker-compose.yml` starts Postgres and the Django app in dev mode with hot reload.
- Commands:
  - `docker-compose up --build` – build and start services
  - App: http://localhost:8000
  - DB: host `localhost`, port `5433` (container `db:5432`)
- Env handling:
  - The `web` service loads `backend/.env.development` and overrides `DB_HOST=db`, `DB_PORT=5432` for container networking.
  - You can adjust `backend/.env.development` without rebuilding; containers pick up changes on restart.
