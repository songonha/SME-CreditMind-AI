"""Shared DashScope (OpenAI-compatible) HTTP error text for vision + text calls."""

from __future__ import annotations

import httpx


def format_dashscope_http_error(response: httpx.Response) -> str:
    code = response.status_code
    snippet = ""
    try:
        body = response.json()
        if isinstance(body, dict):
            snippet = str(
                body.get("message")
                or (body.get("error") or {}).get("message")
                or body.get("code")
                or ""
            )
        if not snippet:
            snippet = str(body)[:400]
    except Exception:  # noqa: BLE001
        snippet = (response.text or "")[:400]

    if code == 401:
        return (
            "DashScope returned 401 Unauthorized. "
            "Check CREDITMIND_QWEN_API_KEY: copy the key from Alibaba Cloud Model Studio with no quotes or spaces. "
            "Use base URL https://dashscope-intl.aliyuncs.com/compatible-mode/v1 for Singapore/International keys; "
            "for mainland China keys use https://dashscope.aliyuncs.com/compatible-mode/v1 (set CREDITMIND_QWEN_BASE_URL)."
        )
    if code == 403:
        return f"DashScope returned 403 Forbidden. Check model access and account quota. {snippet}".strip()
    if code == 429:
        return f"DashScope rate limit or quota (429). {snippet}".strip()
    return f"DashScope API error HTTP {code}. {snippet or response.reason_phrase}"
