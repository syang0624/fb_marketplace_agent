from runpod.lib.schema import Listing, Defect, ImageDefectReport
from runpod.lib.pipeline import overall_grade, negotiation_evidence, assemble_deal_report


def _rep(grade, defects=()):
    return ImageDefectReport(image_url="i", defects=list(defects), condition_grade=grade)


def test_overall_grade_takes_worst():
    assert overall_grade([_rep("excellent"), _rep("poor"), _rep("good")]) == "poor"


def test_overall_grade_unknown_when_empty():
    assert overall_grade([]) == "unknown"


def test_negotiation_evidence_lists_severe_defects():
    listing = Listing(url="u", title="iPhone 12", price=300.0)
    reps = [_rep("poor", [Defect("crack", "screen", "severe", 0.9, "cracked")])]
    ev = negotiation_evidence(listing, reps)
    assert any("screen" in r for r in ev["reasons"])
    assert ev["defect_count"] == 1


def test_assemble_deal_report_merges():
    listing = Listing(url="u", title="iPhone 12", price=300.0)
    reps = [_rep("fair", [Defect("scratch", "back", "minor", 0.5, "")])]
    report = assemble_deal_report(listing, reps, comparables=[{"price": 350}])
    assert report.overall_condition_grade == "fair"
    assert report.comparables == [{"price": 350}]
    assert report.negotiation_evidence["defect_count"] == 1
