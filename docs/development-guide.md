# Development Guide

This guide sets baseline rules for repeatable local development in BioAxis.

## Scope rules

- Do not write business logic as part of repository scaffolding or
  documentation-only work.
- Do not alter `backend/` or `frontend/` code when the task is limited to
  structure, setup, or documentation.
- Keep API contract changes synchronized with `docs/api.md`.
- Keep database design changes synchronized with `docs/database.md`.
- Keep security-relevant changes synchronized with `docs/security.md`.

## Recommended workflow

1. Check the working tree before editing:

   ```powershell
   git status --short
   ```

2. Read the relevant existing docs before changing code:

   ```powershell
   Get-ChildItem docs
   ```

3. Make the smallest scoped change that satisfies the task.
4. Run checks appropriate to the touched area.
5. Update `docs/agent-memory.md` with concrete handoff notes when closing a
   block of work.

## Backend development

Install dependencies from `backend/requirements.txt` and run FastAPI locally
only after `backend/.env` has local or sandbox values.

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Do not place Supabase service-role credentials in frontend files, screenshots,
logs, examples, or generated documentation.

## Frontend development

Install dependencies from `frontend/package.json` and run the Next.js server
from the frontend directory.

```powershell
Set-Location frontend
npm install
npm run dev
```

Only variables prefixed with `NEXT_PUBLIC_` are safe for browser exposure.
Service-role credentials are never frontend configuration.

## Documentation expectations

- `docs/architecture.md`: system boundaries and repository organization.
- `docs/setup.md`: local bootstrap and environment instructions.
- `docs/development-guide.md`: day-to-day engineering workflow.
- `docs/deployment.md`: release and deployment preparation.
- `docs/agent-memory.md`: factual handoff log.
- `docs/security.md`: security rules and blocking conditions.
- `docs/api.md`: API contracts.
- `docs/database.md`: persistence model decisions.
- `docs/testing.md`: test strategy and commands.

## Secret handling

Real secrets must live only in ignored local files, deployment secret managers,
or CI/CD secret stores. Example files must contain placeholders or empty values
only.

Approved local files:

- `backend/.env`
- `frontend/.env.local`

Forbidden local file:

- `backend/app/.env`

Do not add fallback loaders, documentation, Docker mounts, or scripts that rely
on `backend/app/.env`. Backend runtime configuration belongs at `backend/.env`;
frontend runtime configuration belongs at `frontend/.env.local`.
