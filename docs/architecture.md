# Architecture

BioAxis is organized as a hybrid HealthTech application with a Next.js frontend,
a FastAPI backend, Supabase-backed persistence, and optional Gemini-assisted NLP
paths. This document describes the repository structure and runtime boundaries
only; it does not define database contracts or business behavior.

## Repository structure

```text
.
|-- backend/                 FastAPI service, Python dependencies and SQL files
|-- frontend/                Next.js application and browser-facing assets
|-- docs/                    Project documentation and agent handoff records
|-- skills/                  Local agent operating instructions
|-- Rutinas_de_referencia/   Reference training data and analysis artifacts
|-- docker-compose.yml       Local multi-service orchestration
|-- .env.example             Root configuration inventory with placeholders
|-- package.json             Root-level Node dependency manifest
|-- README.md                Project overview
```

## Runtime boundaries

- `backend/` owns server-side FastAPI endpoints, Supabase service-role access,
  AI/NLP integration, and Python dependency management.
- `frontend/` owns user interface code, public Supabase client configuration,
  browser-side API calls, and Next.js scripts.
- `docs/` owns operational and handoff documentation. Documentation changes
  must not alter application behavior.

## Configuration model

The root `.env.example` is a non-secret inventory of required keys. Runtime
configuration is intentionally split:

- `backend/.env` is consumed by the backend service and docker-compose.
- `frontend/.env.local` is consumed by the frontend service and docker-compose.
- `backend/.env.example` remains the backend-local example for backend-only
  keys.

No real credential belongs in any `*.example` file.

## Local ports

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Backend OpenAPI UI: `http://localhost:8000/docs`

## Protected areas

The current orchestration/documentation work must not modify functional code in
`backend/` or `frontend/`. Changes to API contracts, database design, or business
logic require the corresponding specialist workflow and documentation update.
