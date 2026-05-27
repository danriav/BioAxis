# Security

## Prompt sanitization and AI logs

`GeminiNLPService` sanitizes prompts before sending them to Gemini by removing null bytes, collapsing whitespace and enforcing the `AIExtractionRequest` 8000 character limit. The system instruction tells the model to extract only structured health data and to avoid copying user instructions into the resulting JSON.

Logging rules for AI integration:

- Never log `GEMINI_API_KEY`, full prompts, raw model responses or parsed meal/training payloads.
- Timeout logs include only prompt length. Prompt previews are forbidden because user text can include health, biometric, nutrition or training data.
- HTTP logs include status code and attempt number only.
- Pydantic validation errors should be surfaced as controlled exceptions without dumping the full user note.

Runtime secret handling:

- Real `.env` files must stay local and ignored; only `.env.example` can be committed.
- The only approved local dotenv files are `backend/.env` and
  `frontend/.env.local`.
- `backend/app/.env` is forbidden. Do not create, copy, mount, or document it as
  a runtime source.
- Supabase service-role credentials are backend-only and must never be exposed to frontend bundles, screenshots, logs or generated documentation.
- Any discovered plaintext credential must be treated as compromised and rotated before merge.
- After a credential exposure, Supabase and Gemini values must be rotated in the
  provider consoles or secret manager before the Auditor can unblock work.

Macronutrient safety:

- The model is instructed not to invent calories or macros.
- The Pydantic contract requires `quantity_g` when macro estimates are present.
- Uncertain macro interpretation must use `null` values and add a warning instead of fabricating precision.

Operational block condition:

If Gemini changes the `generateContent` response contract, removes candidate text parts, or invalidates structured output/function-call formats, stop the integration path and update the system prompt plus response parser before enabling the service again.

Credential block condition:

If a real Supabase URL paired with privileged keys, a Gemini API key, a JWT
secret, or a database password appears in tracked files, issue history, logs, or
documentation, the repository is blocked until rotation is complete and a
security-audit report records the remediation status.
