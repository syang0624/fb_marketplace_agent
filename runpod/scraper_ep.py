"""RunPod Flash CPU endpoint: BrightData Facebook Marketplace scraping."""
from runpod_flash import Endpoint, CpuInstanceType

scraper = Endpoint(
    name="fbm-scraper",
    cpu=CpuInstanceType.CPU5C_2_4,
    workers=(1, 3),
    max_concurrency=4,
    dependencies=["requests"],
)


@scraper.post("/listing")
async def listing(data: dict):
    import os
    from runpod.lib.brightdata import scrape_listings
    from runpod.lib.schema import to_jsonable

    urls = data.get("urls") or ([data["url"]] if data.get("url") else [])
    token = os.environ.get("BRIGHTDATA_API_TOKEN")
    listings = scrape_listings(urls, token)
    return {"listings": [to_jsonable(l) for l in listings]}


@scraper.post("/search")
async def search(data: dict):
    import os
    from runpod.lib.brightdata import trigger_search, load_fixture_listings
    from runpod.lib.schema import to_jsonable

    token = os.environ.get("BRIGHTDATA_API_TOKEN")
    if not token:
        return {"listings": [to_jsonable(l) for l in load_fixture_listings()], "snapshot_id": None}
    snapshot_id = trigger_search(
        data.get("query", "iPhone"), data.get("location", ""), int(data.get("limit", 10)), token
    )
    return {"snapshot_id": snapshot_id, "listings": None}


@scraper.post("/snapshot")
async def snapshot(data: dict):
    import os
    from runpod.lib.brightdata import fetch_snapshot
    from runpod.lib.schema import to_jsonable

    token = os.environ.get("BRIGHTDATA_API_TOKEN")
    listings = fetch_snapshot(data["snapshot_id"], token)
    if listings is None:
        return {"status": "pending", "listings": None}
    return {"status": "ready", "listings": [to_jsonable(l) for l in listings]}


@scraper.post("/comparables")
async def comparables(data: dict):
    # Phase 2: BrightData SERP-based comparable prices. Stubbed for now.
    return {"comparables": [], "note": "phase-2 stub"}
