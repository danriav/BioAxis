# Security Audit Report

## 2026-05-23 - Credential rotation follow-up

Status: partial unblock for documentation and configuration-only work.

## Scope reviewed

- Root `.env.example`
- `backend/.env.example`
- `docs/security.md`
- `docs/setup.md`
- `docs/development-guide.md`
- `docs/deployment.md`
- `docs/agent-memory.md`
- Repository ignore policy for local dotenv files

Functional code was not modified as part of this audit follow-up.

## Incident summary

A credential-handling incident was recorded for the BioAxis workspace. The
affected secret classes were Supabase credentials and Gemini credentials. The
remediation policy is to treat any exposed value as compromised, rotate it at
the provider or secret-manager layer, and keep only placeholders in repository
files.

No secret values are reproduced in this report.

## Rotation status

- Supabase: rotation reported as completed outside the repository.
- Gemini: rotation reported as completed outside the repository.
- Repository examples: placeholders or empty values only.
- Runtime files: `backend/.env` and `frontend/.env.local` remain local-only and
  ignored.
- Forbidden path: `backend/app/.env` is prohibited and explicitly ignored.

## Auditor decision

The Auditor is partially unblocked for documentation and configuration-base
normalization because the repository now documents:

- Approved local runtime files.
- Prohibition of `backend/app/.env`.
- Post-rotation handling for Supabase and Gemini credentials.
- Requirement to keep real secrets out of examples, docs, logs, and commits.

Full unblock still requires a final secret scan across tracked changes and any
untracked files proposed for commit.

## Required checks before commit

```powershell
git status --short
rg -n "<secret-patterns-from-the-approved-audit-runbook>" . --glob "!node_modules/**" --glob "!frontend/.next/**"
```

Any positive match containing a real credential blocks commit and requires
rotation plus report update.

## 2026-05-26 - Pre-merge integration package

Status: ready for Auditor Principal review with open merge gates listed below.

Validation results:

- Backend tests: passed with bundled Python 3.12.13 using `python -m pytest`
  equivalent. Result: 29 passed, total coverage 81.05%, required coverage 80%.
- Frontend build: passed with `npm run build` from `frontend/`.
- Frontend lint: intentionally out of scope for this MVP gate. Current
  `npm run lint` result is failed: 60 errors and 31 warnings. If lint becomes
  mandatory, assign a Frontend Agent to resolve the lint backlog before merge.
- Backend startup: validated by Auditor against `/docs` and `/openapi.json`.
- Local runtime env files: `backend/.env` and `frontend/.env.local` are ignored.
- Secret scan: no real Supabase service-role key, Gemini key, OpenAI-style key,
  Google API key, or JWT token pattern found outside ignored runtime env files.
  Expected placeholder hits remain in `.env.example` and `backend/.env.example`.

Open gates before merge:

- `Rutinas_de_referencia/` is excluded from the MVP integration commit unless a
  human explicitly approves adding reference datasets and scripts.
- Exclude ignored `__pycache__/` artifacts from any commit.
- Review backend logic and SQL changes separately from this configuration and
  documentation pass.

Final commit package:

Include:

- `.env.example`
- `.gitignore`
- `README.md`
- `backend/.env.example`
- `backend/pytest.ini`
- `backend/tests/**`
- `docs/**`
- `skills/**`
- `BioAxis_Agnetes_y_skills_blueprint.md`

Include only after backend reviewer approval:

- `backend/app/core/config.py`
- `backend/app/main.py`
- `backend/app/models/**`
- `backend/app/schemas/**`
- `backend/app/services/**`
- `backend/requirements.txt`
- `backend/sql/schema.sql`
- `backend/sql/supabase_schema.sql`

Exclude:

- `backend/.env`
- `frontend/.env.local`
- `backend/app/.env`
- `Rutinas_de_referencia/**`
- `**/__pycache__/**`
- `.coverage`
- `frontend/.next/**`
- `node_modules/**`

## 2026-05-26 - Node modules tracking cleanup

Status: pre-merge package ready for final audit.

Actions completed:

- Removed root `node_modules/` from the git index with `git rm -r --cached
  node_modules`.
- Confirmed `git ls-files node_modules` returns zero files.
- Confirmed local dependency directories still exist. No local dependencies were
  deleted.
- Confirmed ignore coverage for `.env`, `.env.*`, `__pycache__/`, `.coverage`,
  `node_modules/`, and `.next/`.

Validation results after cleanup:

- Frontend build: passed with `npm run build` from `frontend/`.
- Backend tests: passed with bundled Python 3.12.13 using the `python -m pytest`
  equivalent. Result: 29 passed, total coverage 81.05%, required coverage 80%.
- Literal `python -m pytest`: not runnable in this shell because `python` is not
  on PATH. The bundled Python runtime was used for the backend test gate.

Final audit note:

- `node_modules/` is now an index-only deletion package for commit and remains
  present locally.
- The pre-merge package is ready for Auditor Principal review, subject to the
  existing backend reviewer approval gate for functional backend and SQL
  changes.
