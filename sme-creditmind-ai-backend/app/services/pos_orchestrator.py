from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Literal

import httpx
from pydantic import BaseModel, Field, ValidationError

from app.config import settings
from app.services.dashscope_http_errors import format_dashscope_http_error


Impact = Literal["positive", "negative", "neutral"]
Category = Literal["revenue", "volume", "customers", "consistency", "digital", "seasonal", "growth"]
RiskLevel = Literal["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]
Recommendation = Literal["APPROVE", "REVIEW", "DECLINE"]
Grade = Literal["A", "B", "C", "D", "E"]


RISK_BY_GRADE: Dict[Grade, RiskLevel] = {
    "A": "VERY_LOW",
    "B": "LOW",
    "C": "MEDIUM",
    "D": "HIGH",
    "E": "VERY_HIGH",
}
REC_BY_GRADE: Dict[Grade, Recommendation] = {
    "A": "APPROVE",
    "B": "APPROVE",
    "C": "REVIEW",
    "D": "REVIEW",
    "E": "DECLINE",
}
ALLOWED_IMPACTS = {"positive", "negative", "neutral"}
ALLOWED_CATEGORIES = {"revenue", "volume", "customers", "consistency", "digital", "seasonal", "growth"}
ALLOWED_GRADES = {"A", "B", "C", "D", "E"}
ALLOWED_RISK = {"VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"}
ALLOWED_REC = {"APPROVE", "REVIEW", "DECLINE"}


class PosFactorParsed(BaseModel):
    name: str
    impact: Impact
    weight: float
    description: str
    dataPoint: str
    category: Category


class ParsedAssessment(BaseModel):
    score: int = Field(ge=0, le=1000)
    grade: Grade
    riskLevel: RiskLevel
    recommendation: Recommendation
    confidence: float = Field(ge=0.0, le=1.0)
    summary: str
    factors: List[PosFactorParsed]
    extractedSignals: Dict[str, Any] = Field(default_factory=dict)


@dataclass
class ProviderSpec:
    name: str
    base_url: str
    api_key: str
    model: str
    org: str = ""
    project: str = ""


def assess_pos_capture(capture_id: str, file_name: str, mime_type: str, base64_data: str) -> Dict[str, Any]:
    providers = _provider_specs()
    if not providers:
        raise RuntimeError(
            "No LLM provider configured. Set CREDITMIND_QWEN_API_KEY or CREDITMIND_OPENAI_API_KEY."
        )

    last_error = ""
    for provider in providers:
        try:
            parsed = _run_provider(provider, file_name=file_name, mime_type=mime_type, base64_data=base64_data)
            result = _build_response(capture_id, file_name, parsed, provider)
            result["provider"] = provider.name
            return result
        except Exception as exc:  # noqa: BLE001
            last_error = f"{provider.name}: {exc}"

    raise RuntimeError(f"All providers failed. Last error: {last_error}")


def get_provider_runtime_config() -> List[Dict[str, Any]]:
    providers = _provider_specs()
    rows: List[Dict[str, Any]] = []
    for provider in providers:
        rows.append(
            {
                "provider": provider.name,
                "baseUrl": provider.base_url,
                "model": provider.model,
                "hasApiKey": bool(provider.api_key.strip()),
                "organizationConfigured": bool(provider.org.strip()),
                "projectConfigured": bool(provider.project.strip()),
            }
        )
    return rows


def get_provider_health() -> List[Dict[str, Any]]:
    providers = _provider_specs()
    if not providers:
        return [
            {
                "provider": "none",
                "configured": False,
                "healthy": False,
                "latencyMs": None,
                "message": "No provider API key configured in backend environment.",
            }
        ]

    checks: List[Dict[str, Any]] = []
    for provider in providers:
        checks.append(_probe_provider(provider))
    return checks


def _provider_specs() -> List[ProviderSpec]:
    specs: List[ProviderSpec] = []
    if settings.QWEN_API_KEY.strip():
        specs.append(
            ProviderSpec(
                name="qwen",
                base_url=settings.QWEN_BASE_URL,
                api_key=settings.QWEN_API_KEY,
                model=settings.QWEN_MODEL,
            )
        )
    if settings.OPENAI_API_KEY.strip():
        specs.append(
            ProviderSpec(
                name="openai",
                base_url=settings.OPENAI_BASE_URL,
                api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_MODEL,
                org=settings.OPENAI_ORG,
                project=settings.OPENAI_PROJECT,
            )
        )
    return specs


def _probe_provider(provider: ProviderSpec) -> Dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {provider.api_key}",
        "Content-Type": "application/json",
    }
    if provider.org:
        headers["OpenAI-Organization"] = provider.org
    if provider.project:
        headers["OpenAI-Project"] = provider.project

    url = provider.base_url.rstrip("/") + "/models"
    started = datetime.utcnow()
    try:
        with httpx.Client(timeout=max(8.0, settings.LLM_TIMEOUT_SECONDS)) as client:
            response = client.get(url, headers=headers)
        elapsed = int((datetime.utcnow() - started).total_seconds() * 1000)
        if response.status_code >= 400:
            return {
                "provider": provider.name,
                "configured": True,
                "healthy": False,
                "latencyMs": elapsed,
                "statusCode": response.status_code,
                "model": provider.model,
                "message": f"HTTP {response.status_code} from provider /models endpoint.",
            }
        body = response.json()
        model_count = len(body.get("data", [])) if isinstance(body, dict) else 0
        return {
            "provider": provider.name,
            "configured": True,
            "healthy": True,
            "latencyMs": elapsed,
            "statusCode": response.status_code,
            "model": provider.model,
            "message": f"Provider reachable. {model_count} models listed.",
        }
    except Exception as exc:  # noqa: BLE001
        elapsed = int((datetime.utcnow() - started).total_seconds() * 1000)
        return {
            "provider": provider.name,
            "configured": True,
            "healthy": False,
            "latencyMs": elapsed,
            "statusCode": None,
            "model": provider.model,
            "message": str(exc),
        }


def _run_provider(provider: ProviderSpec, file_name: str, mime_type: str, base64_data: str) -> ParsedAssessment:
    payload = {
        "model": provider.model,
        "temperature": 0.1,
        "max_tokens": 2000,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": _system_prompt()},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _user_prompt(file_name=file_name)},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_data}",
                        },
                    },
                ],
            },
        ],
    }

    headers = {
        "Authorization": f"Bearer {provider.api_key}",
        "Content-Type": "application/json",
    }
    if provider.org:
        headers["OpenAI-Organization"] = provider.org
    if provider.project:
        headers["OpenAI-Project"] = provider.project

    url = provider.base_url.rstrip("/") + "/chat/completions"
    with httpx.Client(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
        response = client.post(url, headers=headers, json=payload)
        if response.status_code == 400 and payload.get("response_format"):
            retry_payload = {k: v for k, v in payload.items() if k != "response_format"}
            response = client.post(url, headers=headers, json=retry_payload)
        if response.is_error:
            raise RuntimeError(format_dashscope_http_error(response))
        body = response.json()

    content = _extract_content(body)
    raw_json = _extract_json_object(content)
    parsed_dict = json.loads(raw_json)
    parsed = _coerce_assessment(parsed_dict)
    return parsed


def _extract_content(body: Dict[str, Any]) -> str:
    choices = body.get("choices")
    if not choices or not isinstance(choices, list):
        raise ValueError("Missing choices in LLM response")

    message = choices[0].get("message", {})
    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        # Some providers return list blocks.
        text_parts = [item.get("text", "") for item in content if isinstance(item, dict)]
        merged = "\n".join([x for x in text_parts if x])
        if merged:
            return merged
    raise ValueError("No assistant content in LLM response")


def _extract_json_object(text: str) -> str:
    if not text:
        raise ValueError("Empty model output")

    fenced = re.search(r"```json\s*(\{.*\})\s*```", text, flags=re.S)
    if fenced:
        return fenced.group(1)

    direct = re.search(r"(\{.*\})", text, flags=re.S)
    if direct:
        return direct.group(1)

    raise ValueError("Model output does not contain JSON object")


def _coerce_assessment(data: Dict[str, Any]) -> ParsedAssessment:
    candidate = dict(data)

    score = _clamp_int(candidate.get("score", 500), 0, 1000)
    grade = _normalize_grade(candidate.get("grade"), score)
    risk = _normalize_risk(candidate.get("riskLevel"), grade)
    rec = _normalize_rec(candidate.get("recommendation"), grade)
    confidence = _clamp_float(candidate.get("confidence", 0.75), 0.0, 1.0)
    summary = str(candidate.get("summary") or "POS evidence analyzed with multimodal model.")
    factors = _normalize_factors(candidate.get("factors"))
    extracted = candidate.get("extractedSignals")
    if not isinstance(extracted, dict):
        extracted = {}

    normalized = {
        "score": score,
        "grade": grade,
        "riskLevel": risk,
        "recommendation": rec,
        "confidence": confidence,
        "summary": summary[:600],
        "factors": factors,
        "extractedSignals": extracted,
    }

    try:
        return ParsedAssessment.model_validate(normalized)
    except ValidationError as exc:
        raise ValueError(f"Invalid normalized assessment output: {exc}") from exc


def _normalize_factors(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list) or not raw:
        return _default_factors()

    items: List[Dict[str, Any]] = []
    for item in raw[:6]:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "POS Signal").strip() or "POS Signal"
        impact_raw = str(item.get("impact") or "neutral").lower()
        impact = impact_raw if impact_raw in ALLOWED_IMPACTS else "neutral"
        weight = _clamp_float(item.get("weight", 0.16), 0.01, 1.0)
        description = str(item.get("description") or "Signal extracted from POS image evidence.").strip()
        data_point = str(item.get("dataPoint") or "n/a").strip()
        category_raw = str(item.get("category") or "consistency").lower()
        category = category_raw if category_raw in ALLOWED_CATEGORIES else "consistency"
        items.append(
            {
                "name": name[:80],
                "impact": impact,
                "weight": weight,
                "description": description[:240],
                "dataPoint": data_point[:120],
                "category": category,
            }
        )

    if not items:
        return _default_factors()

    total = sum(x["weight"] for x in items)
    if total <= 0:
        return _default_factors()
    for item in items:
        item["weight"] = round(item["weight"] / total, 2)
    return items


def _default_factors() -> List[Dict[str, Any]]:
    return [
        {
            "name": "Receipt Structure Confidence",
            "impact": "neutral",
            "weight": 0.25,
            "description": "OCR readability and field alignment confidence from the uploaded evidence.",
            "dataPoint": "layout_quality=medium",
            "category": "consistency",
        },
        {
            "name": "Estimated Activity Density",
            "impact": "neutral",
            "weight": 0.25,
            "description": "Estimated transaction density based on detected POS entries.",
            "dataPoint": "activity_index=50",
            "category": "volume",
        },
        {
            "name": "Digital Payment Signal",
            "impact": "neutral",
            "weight": 0.2,
            "description": "Digital payment indicators detected from card/QR/e-wallet traces.",
            "dataPoint": "digital_mix=50%",
            "category": "digital",
        },
        {
            "name": "Revenue Stability Proxy",
            "impact": "neutral",
            "weight": 0.18,
            "description": "Stability estimate from amount continuity across detected receipt records.",
            "dataPoint": "variance_bucket=3",
            "category": "revenue",
        },
        {
            "name": "Anomaly Flags",
            "impact": "neutral",
            "weight": 0.12,
            "description": "Potential anomalies from inconsistent totals, timestamps, or merchant fields.",
            "dataPoint": "flags=0",
            "category": "consistency",
        },
    ]


def _build_response(
    capture_id: str,
    file_name: str,
    parsed: ParsedAssessment,
    provider: ProviderSpec,
) -> Dict[str, Any]:
    summary = parsed.summary.strip()
    provider_note = f"[Provider: {provider.name}/{provider.model}]"
    if provider_note.lower() not in summary.lower():
        summary = f"{summary} {provider_note}".strip()

    return {
        "captureId": capture_id,
        "fileName": file_name,
        "score": parsed.score,
        "grade": parsed.grade,
        "riskLevel": parsed.riskLevel,
        "recommendation": parsed.recommendation,
        "confidence": round(parsed.confidence, 2),
        "summary": summary[:700],
        "factors": [f.model_dump() for f in parsed.factors],
        "assessedAt": datetime.utcnow().isoformat() + "Z",
    }


def _system_prompt() -> str:
    return (
        "You are an SME credit risk assistant for POS evidence analysis. "
        "You receive one POS/receipt image and must return strict JSON only, no prose. "
        "Infer transaction quality signals conservatively. "
        "If evidence quality is low, lower confidence and include consistency risk factors."
    )


def _user_prompt(file_name: str) -> str:
    return (
        f"Analyze image file '{file_name}' and return a JSON object with keys:\n"
        "score, grade, riskLevel, recommendation, confidence, summary, factors, extractedSignals.\n"
        "Rules:\n"
        "- score: integer 0..1000\n"
        "- grade: one of A,B,C,D,E\n"
        "- riskLevel: one of VERY_LOW,LOW,MEDIUM,HIGH,VERY_HIGH\n"
        "- recommendation: one of APPROVE,REVIEW,DECLINE\n"
        "- confidence: float 0..1\n"
        "- summary: concise 1-2 sentences in English\n"
        "- factors: array length 4..6, each factor has {name, impact, weight, description, dataPoint, category}\n"
        "- impact: positive|negative|neutral\n"
        "- category: revenue|volume|customers|consistency|digital|seasonal|growth\n"
        "- weights should sum near 1.0\n"
        "Use only evidence from visible POS/receipt fields and infer cautiously."
    )


def _normalize_grade(raw: Any, score: int) -> Grade:
    if isinstance(raw, str) and raw.strip().upper() in ALLOWED_GRADES:
        return raw.strip().upper()  # type: ignore[return-value]
    if score >= 800:
        return "A"
    if score >= 650:
        return "B"
    if score >= 500:
        return "C"
    if score >= 350:
        return "D"
    return "E"


def _normalize_risk(raw: Any, grade: Grade) -> RiskLevel:
    if isinstance(raw, str):
        value = raw.strip().upper()
        if value in ALLOWED_RISK:
            return value  # type: ignore[return-value]
    return RISK_BY_GRADE[grade]


def _normalize_rec(raw: Any, grade: Grade) -> Recommendation:
    if isinstance(raw, str):
        value = raw.strip().upper()
        if value in ALLOWED_REC:
            return value  # type: ignore[return-value]
    return REC_BY_GRADE[grade]


def _clamp_int(value: Any, min_value: int, max_value: int) -> int:
    try:
        ivalue = int(float(value))
    except (TypeError, ValueError):
        ivalue = min_value
    return max(min_value, min(max_value, ivalue))


def _clamp_float(value: Any, min_value: float, max_value: float) -> float:
    try:
        fvalue = float(value)
    except (TypeError, ValueError):
        fvalue = min_value
    return max(min_value, min(max_value, fvalue))
