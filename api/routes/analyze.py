# Copyright (c) 2026 Alex Wang
# @author Alex Wang <https://github.com/wanglongxiao>
# @contact https://www.linkedin.com/in/alexwanglx/

import json
import re
import time

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from api.config import get_llm_config

router = APIRouter()

PROMPT = (
    "Analyze this construction site image for safety hazards. Focus on CLEAR and OBVIOUS "
    "violations that pose real, immediate danger. Do NOT flag minor, ambiguous, or "
    "theoretical risks.\n\n"
    "Guidelines:\n"
    "- Only report hazards you can clearly see in the image. If unsure, assume safe.\n"
    "- Workers not wearing every piece of PPE is NOT automatically unsafe — only flag "
    "missing PPE when the task clearly requires it (e.g. no hard hat near active overhead "
    "work, no fall harness at height, no gloves during welding).\n"
    "- A tidy, well-organized site with workers present is likely safe unless you see "
    "a specific danger.\n"
    "- Distant or blurry figures where PPE cannot be confirmed should NOT be flagged.\n"
    "- Normal construction activity (standing, walking, carrying materials) without "
    "visible hazards is safe.\n\n"
    "Only flag as unsafe if you see a CLEAR danger such as:\n"
    "- Workers at significant height without fall protection\n"
    "- Exposed live electrical wiring within reach\n"
    "- Active welding/cutting without any fire safety measures\n"
    "- Obvious structural collapse risk\n"
    "- Heavy equipment operating unsafely near personnel\n\n"
    "If a hazard is found, describe it briefly in both English and Traditional Chinese. "
    "Identify the bounding box of the main hazard area as [ymin, xmin, ymax, xmax] "
    "with normalized coordinates (0-1000). "
    "When in doubt, mark as Safe.\n\n"
    'Output JSON with keys: "isSafe" (boolean), "reason_en" (string), '
    '"reason_zh" (string, Traditional Chinese), "bbox" (array of 4 numbers or null).'
)


class AnalyzeRequest(BaseModel):
    imageUrl: str


@router.post("")
async def analyze_image(body: AnalyzeRequest):
    llm_config = get_llm_config()
    api_url = llm_config.get("apiUrl")
    api_key = llm_config.get("apiKey")
    model = llm_config.get("model")
    thinking_config = llm_config.get("thinking", {})
    thinking_type = thinking_config.get("type", "enabled")

    if not api_key:
        return JSONResponse(
            status_code=500,
            content={
                "error": "apiKey is not configured. Please set llm.apiKey in config.yaml."
            },
        )

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": body.imageUrl}},
                    {"type": "text", "text": PROMPT},
                ],
            }
        ],
        "thinking": {"type": thinking_type},
    }

    start_time = time.time()

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                api_url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = None
        try:
            detail = exc.response.json()
        except Exception:
            detail = exc.response.text
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to analyze image", "details": detail},
        )
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to analyze image", "details": str(exc)},
        )

    duration = int((time.time() - start_time) * 1000)
    data = response.json()
    content = data["choices"][0]["message"]["content"]
    usage = data.get("usage")

    result = _parse_content(content)
    return {**result, "usage": usage, "duration": duration}


def _parse_content(content: str) -> dict:
    json_str = None

    code_block = re.search(r"```json\n([\s\S]*?)\n```", content)
    if code_block:
        json_str = code_block.group(1).strip()
    else:
        brace_match = re.search(r"\{[\s\S]*\}", content)
        if brace_match:
            json_str = brace_match.group(0).strip()

    if json_str:
        try:
            parsed = json.loads(json_str)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
        if isinstance(json_str, str):
            inner = re.search(r'\{[\s\S]*\}', json_str)
            if inner:
                try:
                    parsed = json.loads(inner.group(0))
                    if isinstance(parsed, dict):
                        return parsed
                except json.JSONDecodeError:
                    pass

    is_safe = "safe" in content.lower() and "unsafe" not in content.lower()
    return {
        "isSafe": is_safe,
        "reason_en": content,
        "reason_zh": "安全" if is_safe else "检测到潜在的安全隐患 (解析失败，仅显示原始内容)",
        "bbox": None,
    }
