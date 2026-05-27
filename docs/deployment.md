# Deployment

This document captures release preparation rules for BioAxis. It intentionally
avoids provider-specific infrastructure decisions that are not yet encoded in
the repository.

## Release checklist

- Confirm `git status --short` contains only intentional changes.
- Confirm no real credentials appear in tracked files.
- Confirm environment examples contain placeholders only.
- Build and test the frontend from `frontend/`.
- Run backend tests or import checks from `backend/`.
- Review `docs/security.md` before promoting a release.

## Environment separation

Use separate secret values for local development, staging, and production.
Production credentials must be injected by the deployment platform or secret
manager, not committed to this repository.

Backend deployment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`, when SQLAlchemy-backed modules are enabled.
- `GEMINI_API_KEY`, when AI/NLP features are enabled.
- `GEMINI_MODEL`
- `GEMINI_API_BASE_URL`
- `GEMINI_TIMEOUT_SECONDS`
- `GEMINI_MAX_RETRIES`

Frontend deployment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PYTHON_API_URL`
- `GOOGLE_GENERATIVE_AI_API_KEY`, only if the frontend server-side chat route is
  deployed and approved.

## Docker local parity

The checked-in `docker-compose.yml` is suitable for local orchestration. It is
not a production deployment manifest by itself because it mounts source
directories and reads local env files.

Local command:

```powershell
docker compose up --build
```

## Production guardrails

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser bundles.
- Do not use example values in staging or production.
- Do not deploy from `backend/app/.env`; that location is forbidden for all
  environments.
- Rotate any credential that appears in logs, issue trackers, screenshots, or
  committed files.
- Treat AI prompt and response logs as sensitive because they can contain health
  and biometric context.

## Post-rotation release gate

A deployment after exposed credentials requires all of the following:

- Supabase privileged keys rotated and old values retired.
- Gemini keys rotated and old values retired.
- Local runtime files regenerated from `.env.example`.
- `docs/security-audit-report.md` updated with the remediation status.
- Auditor status moved from blocked to partial or full unblock before release.

## Rollback posture

Until a formal release pipeline exists, releases should be reversible by
redeploying the previous known-good application image or commit. Database
migrations and API contract changes require explicit rollback notes in their
own specialist documentation.
