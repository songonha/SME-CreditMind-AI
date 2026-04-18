from __future__ import annotations

import base64
import json
import re
from pathlib import Path
from typing import Any, Dict

import httpx

from app.config import settings
from app.services.dashscope_http_errors import format_dashscope_http_error


PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def _prompt_text(filename: str) -> str:
    path = PROMPTS_DIR / filename
    return path.read_text(encoding="utf-8")


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


def _extract_content(body: Dict[str, Any]) -> str:
    choices = body.get("choices")
    if not choices or not isinstance(choices, list):
        raise ValueError("Missing choices in LLM response")

    message = choices[0].get("message", {})
    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = [item.get("text", "") for item in content if isinstance(item, dict)]
        merged = "\n".join([x for x in text_parts if x])
        if merged:
            return merged
    raise ValueError("No assistant content in LLM response")


def _require_qwen() -> None:
    if not settings.QWEN_API_KEY.strip():
        raise RuntimeError(
            "Financial document pipeline requires CREDITMIND_QWEN_API_KEY (DashScope compatible-mode)."
        )


def _chat_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.QWEN_API_KEY}",
        "Content-Type": "application/json",
    }


def _timeout() -> httpx.Timeout:
    return httpx.Timeout(settings.LLM_TIMEOUT_SECONDS)


async def _post_chat(client: httpx.AsyncClient, payload: Dict[str, Any]) -> Dict[str, Any]:
    url = settings.QWEN_BASE_URL.rstrip("/") + "/chat/completions"
    response = await client.post(url, headers=_chat_headers(), json=payload)
    if response.status_code == 400 and payload.get("response_format"):
        retry = {k: v for k, v in payload.items() if k != "response_format"}
        response = await client.post(url, headers=_chat_headers(), json=retry)
    if response.is_error:
        raise RuntimeError(format_dashscope_http_error(response))
    return response.json()


async def _call_vision(
    client: httpx.AsyncClient,
    *,
    mime_type: str,
    image_bytes: bytes,
    user_text: str,
) -> str:
    b64 = base64.b64encode(image_bytes).decode("ascii")
    payload = {
        "model": settings.QWEN_MODEL,
        "temperature": 0.1,
        "max_tokens": 2000,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{b64}"},
                    },
                    {"type": "text", "text": user_text},
                ],
            }
        ],
    }
    body = await _post_chat(client, payload)
    content = _extract_content(body)
    return _extract_json_object(content)


async def _call_text(client: httpx.AsyncClient, *, user_text: str) -> str:
    payload = {
        "model": settings.QWEN_TEXT_MODEL,
        "temperature": 0.2,
        "max_tokens": 1500,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "user", "content": user_text}],
    }
    body = await _post_chat(client, payload)
    content = _extract_content(body)
    return _extract_json_object(content)


async def run_financial_document_pipeline(
    *,
    image_bytes: bytes,
    mime_type: str,
) -> Dict[str, Any]:
    """
    Agent 1: VL parse → Agent 2: analysis → Agent 3: credit scoring.
    Uses the same OpenAI-compatible DashScope base URL as POS assessment.
    """
    _require_qwen()
    mt = mime_type if mime_type and "/" in mime_type else "image/jpeg"

    parser_prompt = _prompt_text("parser.txt")
    analyzer_template = _prompt_text("analyzer.txt")
    scoring_template = _prompt_text("scoring.txt")

    async with httpx.AsyncClient(timeout=_timeout()) as client:
        parsed_raw = await _call_vision(
            client,
            mime_type=mt,
            image_bytes=image_bytes,
            user_text=parser_prompt,
        )
        parsed_obj = json.loads(parsed_raw)

        analysis_prompt = analyzer_template.replace("{{DOCUMENT_JSON}}", parsed_raw)
        analysis_raw = await _call_text(client, user_text=analysis_prompt)
        analysis_obj = json.loads(analysis_raw)

        scoring_prompt = scoring_template.replace("{{ANALYSIS_JSON}}", analysis_raw)
        scoring_raw = await _call_text(client, user_text=scoring_prompt)
        credit_obj = json.loads(scoring_raw)

    return {
        "parsed": parsed_obj,
        "analysis": analysis_obj,
        "credit": credit_obj,
    }
