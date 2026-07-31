"""Integration tests for the Goldmine API — auth + empty-state scenarios.

Feature: Goldmine Listing Scoring (spec.md, Compass v3).
Gherkin bridge: test_<scenario_slug> per Scenario: block.
"""
import pytest
from fastapi.testclient import TestClient

from goldmine.api import create_app


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("GOLDMINE_API_KEY", "test-key-123")
    app = create_app()
    return TestClient(app)


# --- Auth ---

def test_unauthenticated_user_rejected(client):
    # Given no valid auth token
    # When POST /api/goldmine/score is called
    response = client.post("/api/goldmine/score", json={})
    # Then the response status is 401 Unauthorized
    assert response.status_code == 401


# --- Empty State ---

def test_empty_district_returns_empty_results(client):
    # Given postcode "ZZ99" has no SpareRoom listings
    # When GET /api/goldmine/district/ZZ99 is called
    response = client.get(
        "/api/goldmine/district/ZZ99",
        headers={"X-API-Key": "test-key-123"},
    )
    # Then the response status is 200
    assert response.status_code == 200
    # And the result set is empty
    body = response.json()
    assert body["results"] == []
    # And the response includes "total_listings: 0"
    assert body["total_listings"] == 0


# --- Auth hardening (mutation-killing) ---

def test_wrong_api_key_rejected(client):
    """Wrong X-API-Key → 401. Kills hmac.compare_digest negation mutants."""
    response = client.post(
        "/api/goldmine/score",
        headers={"X-API-Key": "wrong-key"},
    )
    assert response.status_code == 401


def test_no_env_var_fails_closed(monkeypatch):
    """No GOLDMINE_API_KEY env var → all requests 401 (fail-closed)."""
    monkeypatch.delenv("GOLDMINE_API_KEY", raising=False)
    from goldmine.api import create_app
    from fastapi.testclient import TestClient
    app = create_app()
    no_key_client = TestClient(app)
    response = no_key_client.post(
        "/api/goldmine/score",
        headers={"X-API-Key": "any-key"},
    )
    assert response.status_code == 401


def test_valid_key_returns_200(client):
    """Correct key → 200. Exercises all three guard conditions positively."""
    response = client.post(
        "/api/goldmine/score",
        headers={"X-API-Key": "test-key-123"},
        json={},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "scored"}


def test_district_with_valid_key_returns_200(client):
    """Valid auth on district endpoint — 200, empty results."""
    response = client.get(
        "/api/goldmine/district/SN1",
        headers={"X-API-Key": "test-key-123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total_listings"] == 0
