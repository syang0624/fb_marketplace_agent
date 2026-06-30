"""BrightData Facebook Marketplace client + tolerant normalization (stdlib only)."""
from __future__ import annotations

import re
from typing import Any, Optional

from runpod.lib.schema import Listing


def _to_number(value: Any) -> Optional[float]:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = re.sub(r"[^0-9.]", "", value)
        if cleaned:
            try:
                return float(cleaned)
            except ValueError:
                return None
    return None


def _pick(node: dict, keys: list[str]) -> Any:
    for k in keys:
        v = node.get(k)
        if v is not None:
            return v
    return None


def _extract_price(node: dict) -> Optional[float]:
    raw = _pick(node, ["final_price", "price", "initial_price", "amount"])
    if isinstance(raw, dict):
        formatted = _pick(raw, ["formatted_amount", "amount"])
        return _to_number(formatted)
    return _to_number(raw)


def _extract_images(node: dict) -> list[str]:
    images = _pick(node, ["images", "photos", "listing_photos"])
    out: list[str] = []
    if isinstance(images, list):
        for item in images:
            if isinstance(item, str):
                out.append(item)
            elif isinstance(item, dict):
                url = item.get("url") or item.get("uri")
                if url:
                    out.append(str(url))
    single = _pick(node, ["image", "primary_photo", "thumbnail"])
    if not out and isinstance(single, str):
        out.append(single)
    elif not out and isinstance(single, dict):
        url = single.get("url") or single.get("uri")
        if url:
            out.append(str(url))
    return out


def _extract_seller(node: dict) -> Optional[str]:
    raw = _pick(node, ["seller_name", "seller", "marketplace_listing_seller"])
    if isinstance(raw, str):
        return raw
    if isinstance(raw, dict):
        name = raw.get("name")
        return str(name) if name is not None else None
    return None


def normalize_listing(raw: dict) -> Listing:
    node = raw.get("node") if isinstance(raw.get("node"), dict) else raw
    listing_id = _pick(node, ["id", "listing_id", "item_id", "product_id"])
    return Listing(
        url=str(_pick(node, ["url", "listing_url", "link", "permalink"]) or ""),
        title=_pick(node, ["title", "name", "marketplace_listing_title"]),
        id=str(listing_id) if listing_id is not None else None,
        price=_extract_price(node),
        currency=_pick(node, ["currency"]),
        condition=_pick(node, ["condition"]),
        description=_pick(node, ["description", "redacted_description", "body"]),
        seller=_extract_seller(node),
        location=_pick(node, ["location", "location_text", "city"]) if isinstance(
            _pick(node, ["location", "location_text", "city"]), str
        ) else None,
        images=_extract_images(node),
        raw=raw,
    )


def normalize_listings(items: list[dict]) -> list[Listing]:
    return [normalize_listing(it) for it in items]
