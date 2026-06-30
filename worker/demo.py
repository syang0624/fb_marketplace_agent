"""End-to-end iPhone demo: scrape -> defects -> DealReport.

Offline mode (default) uses seeded fixtures + a description-derived stub defect
report, so it runs with no keys and no GPU.

Live mode (`--live "iPhone 13" 3`) scrapes real Facebook Marketplace listings via
the BrightData Web Unlocker and runs real image defect detection via GMI Cloud's
hosted vision model — no RunPod required. If GMI vision is unavailable it falls
back to the description heuristic so a full DealReport is always produced.
"""
from __future__ import annotations

import json
import sys

try:
    from lib.brightdata import load_fixture_listings, search_listings
    from lib.schema import Defect, ImageDefectReport, DealReport, to_jsonable
    from lib.pipeline import assemble_deal_report
except ModuleNotFoundError as exc:
    if exc.name != "runpod":
        raise
    from lib.brightdata import load_fixture_listings, search_listings
    from lib.schema import Defect, ImageDefectReport, DealReport, to_jsonable
    from lib.pipeline import assemble_deal_report


def _stub_report_for(listing) -> ImageDefectReport:
    desc = (listing.description or "").lower()
    image_url = listing.images[0] if listing.images else ""
    if "crack" in desc:
        return ImageDefectReport(
            image_url=image_url,
            defects=[Defect("crack", "screen", "severe", 0.9, "described as cracked")],
            condition_grade="poor",
            negotiation_summary="Seller states the screen is cracked.",
        )
    # naive keyword stub: skip negated mentions like "no scratches"
    if "scratch" in desc and "no scratch" not in desc:
        return ImageDefectReport(
            image_url=image_url,
            defects=[Defect("scratch", "body", "minor", 0.6, "described as scratched")],
            condition_grade="good",
            negotiation_summary="Minor scratches noted.",
        )
    return ImageDefectReport(image_url=image_url, condition_grade="excellent",
                             negotiation_summary="No defects described.")


def build_reports_offline() -> list[DealReport]:
    reports = []
    for listing in load_fixture_listings():
        reports.append(assemble_deal_report(listing, [_stub_report_for(listing)]))
    return reports


def build_reports_live(query: str = "iPhone 13", limit: int = 3) -> list[DealReport]:
    """Live: BrightData scrape + GMI hosted vision (stub fallback). No RunPod."""
    import os
    from lib.vision_gmi import detect_defects

    token = os.environ.get("BRIGHTDATA_API_TOKEN")
    reports = []
    for listing in search_listings(query, "", limit, token):
        image_url = listing.images[0] if listing.images else None
        report = detect_defects(image_url) if image_url else None
        source = "gmi-vision"
        if report is None:
            report = _stub_report_for(listing)
            source = "description-heuristic (GMI vision unavailable)"
        deal = assemble_deal_report(listing, [report])
        deal.negotiation_evidence["defect_source"] = source
        reports.append(deal)
    return reports


def main() -> None:
    args = sys.argv[1:]
    if args and args[0] == "--live":
        query = args[1] if len(args) > 1 else "iPhone 13"
        limit = int(args[2]) if len(args) > 2 else 3
        reports = build_reports_live(query, limit)
    else:
        reports = build_reports_offline()
    for report in reports:
        print(json.dumps(to_jsonable(report), indent=2))
        print("-" * 60)


if __name__ == "__main__":
    main()
