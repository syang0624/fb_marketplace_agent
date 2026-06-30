import runpod.lib.brightdata as bd


def test_scrape_listings_without_token_uses_fixtures():
    out = bd.scrape_listings(["https://fb.com/x"], token=None)
    assert len(out) >= 3
    assert any("iphone" in (l.title or "").lower() for l in out)


def test_scrape_listings_with_token_calls_sync_and_normalizes(monkeypatch):
    captured = {}

    class FakeResp:
        status_code = 200
        def raise_for_status(self): pass
        def json(self):
            return [{"url": "u", "name": "iPhone 13", "final_price": 300, "images": ["i"]}]

    def fake_post(url, headers=None, json=None, params=None, timeout=None):
        captured["url"] = url
        captured["auth"] = headers.get("Authorization")
        return FakeResp()

    monkeypatch.setattr(bd.requests, "post", fake_post)
    out = bd.scrape_listings(["https://fb.com/x"], token="TKN")
    assert captured["auth"] == "Bearer TKN"
    assert out[0].title == "iPhone 13"
    assert out[0].price == 300.0


def test_load_fixture_listings_shape():
    out = bd.load_fixture_listings()
    assert all(l.url for l in out)


def test_trigger_search_returns_snapshot_id(monkeypatch):
    captured = {}

    class FakeResp:
        status_code = 200
        def raise_for_status(self): pass
        def json(self): return {"snapshot_id": "snap123"}

    def fake_post(url, headers=None, json=None, params=None, timeout=None):
        captured["auth"] = headers.get("Authorization")
        captured["dataset"] = (params or {}).get("dataset_id")
        return FakeResp()

    monkeypatch.setattr(bd.requests, "post", fake_post)
    snap = bd.trigger_search("iPhone 13", "San Francisco", 10, token="TKN")
    assert snap == "snap123"
    assert captured["auth"] == "Bearer TKN"
    assert captured["dataset"] == bd.DATASET_ID


def test_fetch_snapshot_pending_returns_none(monkeypatch):
    class FakeResp:
        status_code = 202
        def raise_for_status(self): pass
        def json(self): return {}

    monkeypatch.setattr(bd.requests, "get", lambda *a, **k: FakeResp())
    assert bd.fetch_snapshot("snap123", token="TKN") is None


def test_fetch_snapshot_ready_returns_listings(monkeypatch):
    class FakeResp:
        status_code = 200
        def raise_for_status(self): pass
        def json(self): return [{"url": "u", "name": "iPhone 13", "final_price": 300, "images": ["i"]}]

    monkeypatch.setattr(bd.requests, "get", lambda *a, **k: FakeResp())
    out = bd.fetch_snapshot("snap123", token="TKN")
    assert out is not None and out[0].title == "iPhone 13" and out[0].price == 300.0
