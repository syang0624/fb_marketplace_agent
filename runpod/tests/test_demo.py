from runpod.demo import build_reports_offline


def test_offline_demo_builds_one_report_per_fixture_listing():
    reports = build_reports_offline()
    assert len(reports) >= 3
    for r in reports:
        assert r.listing.title
        assert r.overall_condition_grade in {"excellent", "good", "fair", "poor", "unknown"}
        assert "defect_count" in r.negotiation_evidence
