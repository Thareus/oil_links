GCP Deployment Guide

Overview
- Backend (Django + Gunicorn) and Frontend (Next.js) deploy to Cloud Run via Cloud Build.
- Root `cloudbuild.yaml` builds and deploys both services and automatically wires the frontend API URL to the deployed backend.

Prerequisites
- Enable APIs: Cloud Run, Cloud Build, Artifact Registry (or Container Registry), Secret Manager (optional), Cloud SQL (optional).
- Have a Postgres database reachable from Cloud Run (Cloud SQL recommended) and create a `DATABASE_URL`.
- Install and auth `gcloud`, set project and region.

Services
- Backend service name: `oil-links-backend` (configurable via `_SERVICE_BACKEND`).
- Frontend service name: `oil-links-frontend` (configurable via `_SERVICE_FRONTEND`).

Environment Variables
- Backend (set in Cloud Build substitutions or Trigger variables):
  - `_DJANGO_SECRET_KEY` – strong secret key.
  - `_DATABASE_URL` – e.g. `postgres://user:pass@host:5432/dbname` (or Cloud SQL connection, see below).
  - `_ALLOWED_HOSTS` – typically `.run.app`.
  - `_FRONTEND_URL` – will be used for CORS/CSRF origins.
  - Cookie security (defaults suitable for prod): `_JWT_AUTH_SAMESITE=None`, `_JWT_AUTH_SECURE=True`, `_SESSION_COOKIE_SAMESITE=None`, `_CSRF_COOKIE_SAMESITE=None`.

Build & Deploy (manual)
1) From repo root, run:
   gcloud builds submit --config cloudbuild.yaml --substitutions=
   _REGION=us-central1,
   _FRONTEND_URL=https://YOUR_FRONTEND_URL,
   _DJANGO_SECRET_KEY=YOUR_SECRET,
   _DATABASE_URL=YOUR_DB_URL

2) The pipeline will:
   - Build and deploy backend to Cloud Run
   - Discover the backend URL
   - Build frontend with `NEXT_PUBLIC_API_URL=<backend_url>/api/v1`
   - Deploy frontend to Cloud Run

Cloud Build Trigger
- Create a trigger on `main` branch with config file `cloudbuild.yaml`.
- Set the substitutions above in the trigger UI (they override in-file defaults).

Cloud SQL (Postgres)
- Preferred: Cloud SQL connector via Unix sockets.
  - In `cloudbuild.yaml` set:
    - `_CLOUDSQL_INSTANCE` to your connection name, e.g. `oil-links-backend:europe-west2:oil-links-postgresql-database`.
    - `_DATABASE_URL` to a socket DSN: `postgres://USER:PASSWORD@/DBNAME?host=/cloudsql/oil-links-backend:europe-west2:oil-links-postgresql-database`
  - The build deploy step already includes `--add-cloudsql-instances=${_CLOUDSQL_INSTANCE}`.
  - Grant IAM roles:
    - Cloud Run runtime service account: `Cloud SQL Client`.
    - Cloud Build service account: permissions to deploy Cloud Run and optionally `Cloud SQL Client` if needed by deploy-time checks.
- Alternative: Private IP
  - Use a VPC connector on the backend service and set `_DATABASE_URL` host to the instance private IP.
  - You do not need `--add-cloudsql-instances` for Private IP.

Notes
- Backend Dockerfile collects static assets at build and serves via Gunicorn. Ensure any external storages are configured if needed.
- Frontend uses Next.js standalone output and is built with the API URL baked into the client bundle via `NEXT_PUBLIC_API_URL`.
- Update CORS/CSRF origins when frontend URL changes.
