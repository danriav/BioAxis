"""Gemini AI integration tests with mocked async transport."""

from __future__ import annotations

import asyncio
import json
from collections.abc import Mapping
from typing import Any

import pytest

from app.schemas.ai import AIExtractionRequest
from app.services.ai_integration import (
    AIConfigurationError,
    AIProviderContractError,
    AIStructuredOutputError,
    AITimeoutError,
    GeminiNLPService,
    _redacted_context,
)


class FakeTransport:
    def __init__(self, response: dict[str, Any] | None = None, exc: Exception | None = None) -> None:
        self.response = response or {}
        self.exc = exc
        self.calls: list[dict[str, Any]] = []

    async def post_json(
        self,
        url: str,
        *,
        params: Mapping[str, str],
        payload: Mapping[str, Any],
        timeout_seconds: float,
    ) -> dict[str, Any]:
        self.calls.append(
            {
                "url": url,
                "params": dict(params),
                "payload": dict(payload),
                "timeout_seconds": timeout_seconds,
            }
        )
        if self.exc:
            raise self.exc
        return self.response


def _gemini_body(text: str) -> dict[str, Any]:
    return {"candidates": [{"content": {"parts": [{"text": text}]}}]}


def test_extract_health_log_validates_structured_json() -> None:
    payload = {
        "workouts": [
            {
                "day_label": "Pierna",
                "muscle_groups": ["quadriceps"],
                "exercises": [{"name": "sentadilla", "sets": 4, "reps": 8, "rir": 2}],
            }
        ],
        "meals": [
            {
                "meal_slot": "lunch",
                "items": [{"name": "pollo", "quantity_g": 180.0, "protein_g": 45.0}],
            }
        ],
        "warnings": [],
    }
    transport = FakeTransport(_gemini_body(json.dumps(payload)))
    service = GeminiNLPService(api_key="test-key", transport=transport)

    result = asyncio.run(
        service.extract_health_log(AIExtractionRequest(text="4x8 sentadilla RIR 2 y 180g de pollo"))
    )

    sent = transport.calls[0]["payload"]
    assert sent["generationConfig"]["responseMimeType"] == "application/json"
    assert transport.calls[0]["timeout_seconds"] <= 8
    assert result.workouts[0].exercises[0].sets == 4
    assert result.meals[0].items[0].protein_g == 45.0


def test_extract_health_log_rejects_invalid_pydantic_contract() -> None:
    invalid_payload = {
        "workouts": [{"day_label": "Empuje", "muscle_groups": [], "exercises": [{"name": "press", "sets": 99}]}],
        "meals": [],
        "warnings": [],
    }
    service = GeminiNLPService(api_key="test-key", transport=FakeTransport(_gemini_body(json.dumps(invalid_payload))))

    with pytest.raises(AIStructuredOutputError):
        asyncio.run(service.extract_health_log(AIExtractionRequest(text="press banca 99 series")))


def test_extract_health_log_raises_contract_error_for_missing_text() -> None:
    body = {"candidates": [{"content": {"parts": [{"functionCall": {"name": "x"}}]}}]}
    service = GeminiNLPService(api_key="test-key", transport=FakeTransport(body))

    with pytest.raises(AIProviderContractError):
        asyncio.run(service.extract_health_log(AIExtractionRequest(text="comida libre")))


def test_extract_health_log_timeout_is_controlled() -> None:
    service = GeminiNLPService(api_key="test-key", transport=FakeTransport(exc=TimeoutError("slow")), max_retries=0)

    with pytest.raises(AITimeoutError):
        asyncio.run(service.extract_health_log(AIExtractionRequest(text="desayuno")))


def test_extract_health_log_requires_api_key() -> None:
    service = GeminiNLPService(api_key="", transport=FakeTransport())

    with pytest.raises(AIConfigurationError):
        asyncio.run(service.extract_health_log(AIExtractionRequest(text="sentadilla")))


def test_extract_health_log_rejects_non_json_text() -> None:
    service = GeminiNLPService(api_key="test-key", transport=FakeTransport(_gemini_body("no es json")))

    with pytest.raises(AIProviderContractError):
        asyncio.run(service.extract_health_log(AIExtractionRequest(text="pollo con arroz")))


def test_extract_health_log_rejects_missing_candidates() -> None:
    service = GeminiNLPService(api_key="test-key", transport=FakeTransport({"promptFeedback": {}}))

    with pytest.raises(AIProviderContractError):
        asyncio.run(service.extract_health_log(AIExtractionRequest(text="curl femoral")))


def test_redacted_context_does_not_include_prompt_preview() -> None:
    sensitive_prompt = "peso 80 kg, comida y rutina privada"
    context = _redacted_context(sensitive_prompt)

    assert context == f"len={len(sensitive_prompt)}"
    assert "peso" not in context
    assert "comida" not in context
