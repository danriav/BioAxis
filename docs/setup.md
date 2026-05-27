# Setup

This guide explains how to prepare BioAxis locally without storing real
credentials in the repository.

## Prerequisites

- Docker Desktop, when using the composed local environment.
- Python 3.11+ for the backend. Python 3.12 is the current local target.
- Node.js 18+ for the frontend. Use the stricter version required by
  `frontend/package.json` or the active Next.js toolchain if it changes.
- Access to local-only or sandbox credentials if testing Supabase or Gemini
  integrations.

## Environment files

The repository includes a root `.env.example` as the complete key inventory. It
is not read directly by the services.

Create runtime files locally:

```powershell
Copy-Item .env.example backend\.env
Copy-Item .env.example frontend\.env.local
```

Then remove keys that do not apply to each service and fill only local,
sandbox, or test values. Never commit `backend/.env` or `frontend/.env.local`.

Allowed local runtime files:

- `backend/.env`
- `frontend/.env.local`

Forbidden runtime file:

- `backend/app/.env`

`backend/app/.env` is prohibited because it places secrets inside the Python
package tree, increases the chance of accidental packaging or copying, and
contradicts the repository-level environment layout.

Backend runtime file:

```text
backend/.env
```

Required for full backend startup:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional or path-specific backend keys:

- `DATABASE_URL`
- `SQL_ECHO`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_API_BASE_URL`
- `GEMINI_TIMEOUT_SECONDS`
- `GEMINI_MAX_RETRIES`

Frontend runtime file:

```text
frontend/.env.local
```

Expected frontend keys:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PYTHON_API_URL`
- `GOOGLE_GENERATIVE_AI_API_KEY`, only if the local chat route is exercised.

## Start with Docker

After runtime environment files exist, start both services:

```powershell
docker compose up --build
```

The compose file reads:

- `backend/.env`
- `frontend/.env.local`

Access points:

- Frontend: `http://localhost:3000`
- Backend API docs: `http://localhost:8000/docs`

## Start services manually

Backend:

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```powershell
Set-Location frontend
npm install
npm run dev
```

## Running without real credentials

You can install dependencies, run static checks, inspect docs, and work on
non-integrated UI or tests without production credentials. Use placeholder or
sandbox values only in local runtime files.

The current backend imports Supabase configuration during application startup.
If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, full backend startup
will fail by design. Do not bypass this with real production secrets in the
repository.

## Post-rotation baseline

After a credential incident or planned rotation:

- Rotate Supabase service-role credentials outside the repository.
- Rotate Gemini credentials outside the repository.
- Delete any stale local `backend/.env`, `frontend/.env.local`, or shell session
  exports that contain retired values.
- Recreate local runtime files from `.env.example` using only sandbox or newly
  issued values.
- Confirm `git status --short` does not show any real dotenv file.
