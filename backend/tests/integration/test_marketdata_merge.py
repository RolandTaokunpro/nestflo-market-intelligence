"""TestClient verification for the marketdata merge (PLAN_MARKETDATA_MERGE_V2 §7.3).

Covers: /rents/ static tree, national page, sitemap/robots/llms, SPA intact,
canonicals on the main domain, history sections present, 404 behaviour.
Run: cd backend && python -m pytest tests/integration/test_marketdata_merge.py -q
"""
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app

BACKEND = Path(__file__).resolve().parent.parent
MD = BACKEND / "static_marketdata"
CANON = "https://hmo-market-intelligence.co.uk"

client = TestClient(app)


def test_rent_index_200_canonical():
    r = client.get("/rents/")
    assert r.status_code == 200
    assert f'<link rel="canonical" href="{CANON}/rents/">' in r.text
    assert "August 2026" in r.text


def test_district_page_200_canonical_history():
    r = client.get("/rents/bristol/bs1/")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/html")
    assert f'<link rel="canonical" href="{CANON}/rents/bristol/bs1/">' in r.text
    assert "£890" in r.text and "August 2026" in r.text
    # one h1 only
    assert r.text.count("<h1>") == 1
    # og:image lives inside the /rents mount (React /assets untouched)
    assert 'content="' + CANON + '/rents/assets/nestflo-logo.jpg"' in r.text


def test_history_two_row_table_renders():
    r = client.get("/rents/reading/rg1/")
    assert r.status_code == 200
    assert "Rent history" in r.text
    assert "July 2026" in r.text and "August 2026" in r.text
    # July row: £675 from 81 listings (verified against warehouse SQL at build)
    assert re.search(r"<td>July 2026</td><td>£675</td><td>81</td>", r.text)


def test_history_archive_note_single_month():
    r = client.get("/rents/manchester/m12/")
    assert r.status_code == 200
    assert "Archive begins August 2026 — the first complete national month" in r.text


def test_city_hub_200():
    r = client.get("/rents/bristol/")
    assert r.status_code == 200
    assert f'href="{CANON}/rents/bristol/"' in r.text


def test_unknown_district_404():
    assert client.get("/rents/bristol/zz9/").status_code == 404
    assert client.get("/rents/no-such-city/").status_code == 404


def test_og_logo_served():
    r = client.get("/rents/assets/nestflo-logo.jpg")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"


def test_national_page_unchanged():
    r = client.get("/marketdata-08-2026")
    assert r.status_code == 200
    assert "41,884" in r.text  # total captured ad rows (listing_details COUNT)
    assert "1,730" in r.text


def test_sitemap_robots_llms():
    r = client.get("/sitemap.xml")
    assert r.status_code == 200
    sm = r.text
    assert sm.count("<loc>") == 1509
    assert f"{CANON}/rents/bristol/bs1/" in sm
    assert f"{CANON}/marketdata-08-2026</loc>" in sm
    robots = client.get("/robots.txt")
    assert robots.status_code == 200
    assert f"Sitemap: {CANON}/sitemap.xml" in robots.text
    assert "Disallow: /api/" in robots.text
    llms = client.get("/llms.txt")
    assert llms.status_code == 200
    assert "compact month-by-month summary table" in llms.text


def test_spa_still_served():
    # catch-all intact: unknown non-rents path serves the SPA shell
    r = client.get("/some-spa-route")
    assert r.status_code == 200
    assert "<div id=\"root\"" in r.text or 'id="root"' in r.text
    assert client.get("/health").json() == {"status": "ok"}


def test_every_sitemap_url_200():
    """Gate 5: every sitemap URL must resolve on the app (sampled exhaustively
    for /rents pages: full sweep of all 1,508)."""
    sm = client.get("/sitemap.xml").text
    locs = re.findall(r"<loc>([^<]+)</loc>", sm)
    assert len(locs) == 1509
    bad = []
    for loc in locs:
        path = loc.replace(CANON, "")
        rr = client.get(path)
        if rr.status_code != 200:
            bad.append((path, rr.status_code))
    assert not bad, f"{len(bad)} sitemap URLs non-200: {bad[:10]}"


def test_all_pages_under_50kb():
    big = [p for p in (MD / "rents").rglob("*.html") if p.stat().st_size > 50 * 1024]
    assert not big