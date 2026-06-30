"""Hosted VLM defect detection via GMI Cloud (OpenAI-compatible chat API).

Lets the demo run real image-based defect detection without a RunPod GPU. When
GMI's vision models are unavailable (e.g. overloaded), `detect_defects` returns
None so the caller can fall back to a non-vision heuristic.
"""
from __future__ import annotations

import os
import time
from typing import Optional

from lib.defects import build_defect_prompt, parse_defect_response
from lib.schema import ImageDefectReport

GMI_BASE = (
    os.environ.get("GMI_MAAS_BASE_URL")
    or os.environ.get("GMI_API_BASE_URL")
    or "https://api.gmi-serving.com"
).rstrip("/")
GMI_KEY = os.environ.get("GMI_MAAS_API_KEY") or os.environ.get("GMI_API_KEY")
# Vision-capable models on GMI, tried in order.
VISION_MODELS = ["openai/gpt-4o-mini", "openai/gpt-4o"]


def detect_defects(
    image_url: str,
    models: Optional[list[str]] = None,
    retries: int = 2,
) -> Optional[ImageDefectReport]:
    """Run defect detection on one image URL via a GMI vision model.

    Returns an ImageDefectReport on success, or None if no model could be reached
    (so the caller can fall back). Requires GMI_MAAS_API_KEY / requests.
    """
    if not GMI_KEY or not image_url:
        return None
    try:
        import requests
    except ImportError:
        return None

    prompt = build_defect_prompt()
    for model in (models or VISION_MODELS):
        body = {
            "model": model,
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": image_url}},
            ]}],
            "max_tokens": 500,
            "temperature": 0,
        }
        for attempt in range(retries):
            try:
                resp = requests.post(
                    f"{GMI_BASE}/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GMI_KEY}"},
                    json=body,
                    timeout=60,
                )
            except Exception:
                break  # network error -> try next model
            if resp.status_code == 200:
                text = resp.json()["choices"][0]["message"]["content"]
                return parse_defect_response(text, image_url)
            if resp.status_code == 429:
                time.sleep(2 * (attempt + 1))
                continue  # overloaded -> retry
            break  # other error -> try next model
    return None
