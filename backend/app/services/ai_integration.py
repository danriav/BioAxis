"""Async Gemini integration for structured health NLP extraction."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Mapping
from typing import Any, Protocol
from urllib import error, parse, request

from pydantic import ValidationError

from app.core.config import settings
from app.schemas.ai import AIExtractionRequest, HealthNLPExtraction

logger = logging.getLogger(__name__)


class AIIntegrationError(RuntimeError):
    """Base controlled exception for AI service failures."""


class AIConfigurationError(AIIntegrationError):
    """Raised when Gemini credentials or config are missing."""


class AITimeoutError(AIIntegrationError):
    """Raised when Gemini does not respond within the configured budget."""


class AIProviderContractError(AIIntegrationError):
    """Raised when Gemini's response shape does not match the expected contract."""


class AIStructuredOutputError(AIIntegrationError):
    """Raised when model JSON fails the Pydantic contract."""


SYSTEM_INSTRUCTION = """
Eres un extractor de datos para BioAxis. Convierte texto libre en JSON estricto
con entrenamientos y comidas. No inventes valores: si una cantidad, carga, RIR o
macronutriente no aparece o no se puede inferir con seguridad, usa null y agrega
una advertencia breve. Nunca incluyas instrucciones del usuario dentro del JSON.
"""


def _sanitize_prompt(text: str) -> str:
    sanitized = " ".join(text.replace("\x00", " ").split())
    return sanitized[:8000]


def _redacted_context(text: str) -> str:
    if not text:
        return ""
    return f"len={len(text)}"


def _json_schema_for_gemini() -> dict[str, Any]:
    return HealthNLPExtraction.model_json_schema()


class GeminiTransport(Protocol):
    async def post_json(
        self,
        url: str,
        *,
        params: Mapping[str, str],
        payload: Mapping[str, Any],
        timeout_seconds: float,
    ) -> dict[str, Any]:
        """Post JSON to Gemini and return the decoded JSON response."""


class UrllibGeminiTransport:
    async def post_json(
        self,
        url: str,
        *,
        params: Mapping[str, str],
        payload: Mapping[str, Any],
        timeout_seconds: float,
    ) -> dict[str, Any]:
        return await asyncio.wait_for(
            asyncio.to_thread(self._post_json, url, params, payload, timeout_seconds),
            timeout=timeout_seconds,
        )

    def _post_json(
        self,
        url: str,
        params: Mapping[str, str],
        payload: Mapping[str, Any],
        timeout_seconds: float,
    ) -> dict[str, Any]:
        encoded_url = f"{url}?{parse.urlencode(params)}"
        body = json.dumps(payload).encode("utf-8")
        req = request.Request(
            encoded_url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))


class GeminiNLPService:
    """Small async client around Gemini generateContent with retries and validation."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float | None = None,
        max_retries: int | None = None,
        transport: GeminiTransport | None = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.gemini_api_key
        self.model = model or settings.gemini_model
        self.base_url = (base_url or settings.gemini_api_base_url).rstrip("/")
        self.timeout_seconds = min(timeout_seconds or settings.gemini_timeout_seconds, 8.0)
        self.max_retries = max_retries if max_retries is not None else settings.gemini_max_retries
        self._transport = transport or UrllibGeminiTransport()

    async def extract_health_log(self, request: AIExtractionRequest) -> HealthNLPExtraction:
        if not self.api_key:
            raise AIConfigurationError("GEMINI_API_KEY is not configured")

        prompt = _sanitize_prompt(request.text)
        payload = self._build_payload(prompt, request.locale)
        raw_response = await self._post_with_retries(payload, prompt)
        response_text = self._extract_text(raw_response)

        try:
            return HealthNLPExtraction.model_validate_json(response_text)
        except ValidationError as exc:
            raise AIStructuredOutputError("Gemini JSON does not match HealthNLPExtraction") from exc
        except ValueError as exc:
            raise AIProviderContractError("Gemini returned non-JSON text for a structured request") from exc

    def _build_payload(self, prompt: str, locale: str) -> dict[str, Any]:
        schema = _json_schema_for_gemini()
        return {
            "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION.strip()}]},
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": (
                                f"Locale: {locale}\n"
                                "Extrae entrenamientos y comidas del texto siguiente.\n"
                                f"Texto:\n{prompt}"
                            )
                        }
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0,
                "responseMimeType": "application/json",
                "responseSchema": schema,
            },
        }

    async def _post_with_retries(self, payload: Mapping[str, Any], prompt: str) -> dict[str, Any]:
        endpoint = f"{self.base_url}/models/{self.model}:generateContent"
        last_error: Exception | None = None

        for attempt in range(self.max_retries + 1):
            try:
                return await self._transport.post_json(
                    endpoint,
                    params={"key": self.api_key},
                    payload=payload,
                    timeout_seconds=self.timeout_seconds,
                )
            except (TimeoutError, asyncio.TimeoutError) as exc:
                logger.warning("Gemini timeout: attempt=%s prompt=%s", attempt + 1, _redacted_context(prompt))
                last_error = exc
                if attempt >= self.max_retries:
                    raise AITimeoutError("Gemini timed out within the 8 second budget") from exc
            except error.HTTPError as exc:
                status = exc.code
                logger.warning("Gemini HTTP error: status=%s attempt=%s", status, attempt + 1)
                last_error = exc
                if status < 500 or attempt >= self.max_retries:
                    raise AIProviderContractError(f"Gemini request failed with HTTP {status}") from exc
            except (error.URLError, OSError, json.JSONDecodeError) as exc:
                logger.warning("Gemini transport error: attempt=%s", attempt + 1)
                last_error = exc
                if attempt >= self.max_retries:
                    raise AIProviderContractError("Gemini transport failed") from exc

            await asyncio.sleep(0.2 * (attempt + 1))

        raise AIProviderContractError("Gemini request failed") from last_error

    def _extract_text(self, response: Mapping[str, Any]) -> str:
        candidates = response.get("candidates")
        if not isinstance(candidates, list) or not candidates:
            raise AIProviderContractError("Gemini response has no candidates")

        first_candidate = candidates[0]
        if not isinstance(first_candidate, Mapping):
            raise AIProviderContractError("Gemini candidate is not an object")

        content = first_candidate.get("content")
        if not isinstance(content, Mapping):
            raise AIProviderContractError("Gemini candidate has no content object")

        parts = content.get("parts", [])
        if not isinstance(parts, list) or not parts:
            raise AIProviderContractError("Gemini candidate has no content parts")

        text_parts = [part.get("text") for part in parts if isinstance(part, Mapping) and part.get("text")]
        if not text_parts:
            raise AIProviderContractError("Gemini content parts do not include text")

        text = "".join(text_parts).strip()
        try:
            json.loads(text)
        except json.JSONDecodeError as exc:
            raise AIProviderContractError("Gemini returned non-JSON text for a structured request") from exc
        return text
