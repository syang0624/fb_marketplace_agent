"""BrightData Facebook Marketplace client + tolerant normalization (stdlib only)."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Optional

try:
    import requests
except ImportError:  # keeps the pure normalize/fixture/demo path stdlib-only
    requests = None

from runpod.lib.schema import Listing

BD_BASE = "https://api.brightdata.com"
# TODO-IN-TASK: replace default with the real Facebook Marketplace dataset id.
DATASET_ID = os.environ.get("BRIGHTDATA_DATASET_ID", "gd_facebook_marketplace")
_FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "iphone_listings.json"


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


def _extract_location(node: dict) -> Optional[str]:
    # Prefer an explicit text field; a bare `location` dict may be lat/lng coords
    # (no display name) and must not produce garbage.
    loc = _pick(node, ["location_text", "location", "city"])
    if isinstance(loc, str):
        return loc
    if isinstance(loc, dict):
        if isinstance(loc.get("display_name"), str):
            return loc["display_name"]
        parts = [p for p in (loc.get("city"), loc.get("state")) if isinstance(p, str)]
        if parts:
            return ", ".join(parts)
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
        location=_extract_location(node),
        images=_extract_images(node),
        raw=raw,
    )


def normalize_listings(items: list[dict]) -> list[Listing]:
    return [normalize_listing(it) for it in items]


def load_fixture_listings() -> list[Listing]:
    raw = json.loads(_FIXTURE_PATH.read_text())
    return normalize_listings(raw)


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def scrape_listings(urls: list[str], token: Optional[str]) -> list[Listing]:
    """Detail-by-URL via BrightData sync /scrape (<=20 urls). No token -> fixtures."""
    if not token:
        return load_fixture_listings()
    if requests is None:
        raise RuntimeError("the 'requests' package is required for live BrightData calls")
    resp = requests.post(
        f"{BD_BASE}/datasets/v3/scrape",
        headers=_headers(token),
        params={"dataset_id": DATASET_ID, "format": "json"},
        json=[{"url": u} for u in urls[:20]],
        timeout=180,
    )
    resp.raise_for_status()
    data = resp.json()
    items = data if isinstance(data, list) else data.get("data", data.get("results", []))
    return normalize_listings(items)


def trigger_search(query: str, location: str, limit: int, token: str) -> str:
    """Discovery via async /trigger -> returns snapshot_id to poll."""
    if requests is None:
        raise RuntimeError("the 'requests' package is required for live BrightData calls")
    resp = requests.post(
        f"{BD_BASE}/datasets/v3/trigger",
        headers=_headers(token),
        params={"dataset_id": DATASET_ID, "type": "discover_new", "discover_by": "keyword"},
        json=[{"keyword": query, "location": location, "limit": limit}],
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["snapshot_id"]


def fetch_snapshot(snapshot_id: str, token: str) -> Optional[list[Listing]]:
    """Poll a snapshot. Returns None while still running, listings when ready."""
    if requests is None:
        raise RuntimeError("the 'requests' package is required for live BrightData calls")
    resp = requests.get(
        f"{BD_BASE}/datasets/v3/snapshot/{snapshot_id}",
        headers={"Authorization": f"Bearer {token}"},
        params={"format": "json"},
        timeout=60,
    )
    if resp.status_code == 202:
        return None  # still building
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict) and data.get("status") in ("running", "building"):
        return None
    items = data if isinstance(data, list) else data.get("data", data.get("results", []))
    return normalize_listings(items)
