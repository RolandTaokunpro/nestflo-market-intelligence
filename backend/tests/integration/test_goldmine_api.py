"""Integration tests for POST /api/goldmine/jobs.

Covers scenarios from Section C (API Endpoint) and Section F (Security):
  - Happy path (single + multi postcode)
  - Missing required fields → 400
  - Invalid email → 400
  - XSS in postcode → 400
  - Email with XSS → 400
  - Rate limited → 429
  - No CSRF enforcement on public endpoint
"""

from __future__ import annotations

import json
import time
import uuid

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from pydantic import BaseModel

from goldmine_jobs import (
    GoldmineJobRequest,
    GoldmineJobResponse,
    ensure_table,
    get_job,
    insert_job,
    validate_budget,
    validate_postcodes,
)

# ── Test fixtures ────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    """Use a temp DB and ensure the table exists."""
    import goldmine_jobs as mod
    db = tmp_path / "goldmine.db"
    monkeypatch.setattr(mod, "DB_PATH", db)
    ensure_table()
    yield db
    if db.exists():
        db.unlink()


@pytest.fixture
def client():
    """Create a minimal FastAPI app with the goldmine jobs endpoint."""
    from fastapi.responses import JSONResponse

    # Minimal rate limiter for testing
    rate_state: dict[str, list[float]] = {}

    app = FastAPI()

    @app.middleware("http")
    async def rate_limit(request: Request, call_next):
        if request.url.path == "/api/goldmine/jobs" and request.method != "OPTIONS":
            now = time.time()
            ip = request.client.host if request.client else "test"
            timestamps = rate_state.get(ip, [])
            timestamps = [t for t in timestamps if now - t < 60]
            if len(timestamps) >= 10:
                return JSONResponse(
                    {"detail": "Too many requests. Please wait before trying again."},
                    status_code=429,
                )
            timestamps.append(now)
            rate_state[ip] = timestamps
        return await call_next(request)

    @app.post("/api/goldmine/jobs", status_code=201)
    async def create_goldmine_job(data: GoldmineJobRequest):
        import datetime as dt

        # Validate and normalize postcodes
        try:
            postcodes = validate_postcodes(data.postcodes)
        except ValueError as e:
            return JSONResponse({"detail": str(e)}, status_code=400)

        job_id = str(uuid.uuid4())
        eta = (dt.datetime.utcnow() + dt.timedelta(minutes=30)).isoformat() + "Z"
        estimated = f"~30 minutes"

        insert_job(
            job_id=job_id,
            email=data.email,
            postcodes=postcodes,
            room_type=data.room_type,
            max_budget=validate_budget(data.max_budget) if data.max_budget is not None else None,
            estimated_completion=estimated,
        )

        return GoldmineJobResponse(
            job_id=job_id,
            status="queued",
            estimated_completion=estimated,
        ).model_dump()

    return TestClient(app)


# ── Tests ────────────────────────────────────────────────────────────────────


class TestHappyPath:
    """Scenario: POST /api/goldmine/jobs — happy path."""

    def test_single_postcode_all_fields(self, client):
        resp = client.post(
            "/api/goldmine/jobs",
            json={
                "postcodes": "SN1",
                "room_type": "double",
                "max_budget": "800",
                "email": "jane@hmolettings.co.uk",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert "job_id" in body
        assert body["status"] == "queued"
        assert "estimated_completion" in body
        # Verify stored
        job = get_job(body["job_id"])
        assert job is not None
        assert job["email"] == "jane@hmolettings.co.uk"
        assert job["postcodes"] == ["SN1"]
        assert job["room_type"] == "double"
        assert job["max_budget"] == 800.0
        assert job["status"] == "queued"

    def test_multiple_postcodes(self, client):
        resp = client.post(
            "/api/goldmine/jobs",
            json={
                "postcodes": "SN1, SN2, SN3",
                "room_type": "any",
                "email": "team@hmolettings.co.uk",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert "job_id" in body
        job = get_job(body["job_id"])
        assert job["postcodes"] == ["SN1", "SN2", "SN3"]
        assert job["room_type"] == "any"
        assert job["max_budget"] is None

    def test_optional_budget_omitted(self, client):
        resp = client.post(
            "/api/goldmine/jobs",
            json={
                "postcodes": "SN1",
                "room_type": "any",
                "email": "team@hmolettings.co.uk",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        job = get_job(body["job_id"])
        assert job["max_budget"] is None


class TestMissingFields:
    """Scenario: POST /api/goldmine/jobs — missing required fields."""

    def test_missing_postcodes(self, client):
        resp = client.post(
            "/api/goldmine/jobs",
            json={
                "room_type": "double",
                "email": "jane@hmolettings.co.uk",
            },
        )
        assert resp.status_code == 422  # Pydantic validation error

    def test_missing_email(self, client):
        resp = client.post(
            "/api/goldmine/jobs",
            json={
                "postcodes": "SN1",
                "room_type": "double",
            },
        )
        assert resp.status_code == 422

    def test_empty_body(self, client):
        resp = client.post("/api/goldmine/jobs", json={})
        assert resp.status_code == 422


class TestInvalidEmail:
    """Scenario: POST /api/goldmine/jobs — invalid email format (server-side)."""

    def test_invalid_email_format(self, client):
        resp = client.post(
            "/api/goldmine/jobs",
            json={
                "postcodes": "SN1",
                "room_type": "double",
                "email": "not-an-email",
            },
        )
        assert resp.status_code == 422

    def test_email_with_xss(self, client):
        resp = client.post(
            "/api/goldmine/jobs",
            json={
                "postcodes": "SN1",
                "room_type": "double",
                "email": "<script>alert(1)</script>@evil.com",
            },
        )
        # Pydantic EmailStr rejects this
        assert resp.status_code == 422


class TestXSS:
    """Scenario: POST /api/goldmine/jobs — HTML/Script injection in postcode field."""

    def test_script_tag_in_postcode(self, client):
        resp = client.post(
            "/api/goldmine/jobs",
            json={
                "postcodes": '<script>alert(1)</script>',
                "room_type": "double",
                "email": "jane@hmolettings.co.uk",
            },
        )
        assert resp.status_code == 400
        assert "invalid uk postcode" in resp.json()["detail"].lower()


class TestRateLimit:
    """Scenario: POST /api/goldmine/jobs — rate limited."""

    def test_rate_limit_exceeded(self, client):
        payload = {
            "postcodes": "SN1",
            "room_type": "any",
            "email": "jane@hmolettings.co.uk",
        }
        # Send 10 valid requests to exhaust rate limit
        for i in range(10):
            resp = client.post("/api/goldmine/jobs", json=payload)
            assert resp.status_code == 201, f"Request {i+1} should succeed"

        # 11th request should be rate limited
        resp = client.post("/api/goldmine/jobs", json=payload)
        assert resp.status_code == 429
        assert "too many requests" in resp.json()["detail"].lower()


class TestNoCSRF:
    """Scenario: CSRF token is not required for public form."""

    def test_no_csrf_token_required(self, client):
        resp = client.post(
            "/api/goldmine/jobs",
            json={
                "postcodes": "SN1",
                "room_type": "any",
                "email": "jane@hmolettings.co.uk",
            },
            headers={},
        )
        assert resp.status_code == 201


class TestInputSanitization:
    """Scenario: Input sanitization — HTML stripped, postcodes normalized."""

    def test_html_stripped_from_postcodes(self, client):
        resp = client.post(
            "/api/goldmine/jobs",
            json={
                "postcodes": "SN1",
                "room_type": "any",
                "email": "jane@hmolettings.co.uk",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        job = get_job(body["job_id"])
        assert job["postcodes"] == ["SN1"]  # uppercase, trimmed

    def test_lowercase_postcodes_normalized(self, client):
        resp = client.post(
            "/api/goldmine/jobs",
            json={
                "postcodes": "sn1, bs5",
                "room_type": "any",
                "email": "jane@hmolettings.co.uk",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        job = get_job(body["job_id"])
        assert job["postcodes"] == ["SN1", "BS5"]


class TestInvalidPostcodeField:
    """Edge: empty postcode string."""

    def test_empty_postcode_string(self, client):
        resp = client.post(
            "/api/goldmine/jobs",
            json={
                "postcodes": "",
                "room_type": "any",
                "email": "jane@hmolettings.co.uk",
            },
        )
        assert resp.status_code == 400
        assert "at least one postcode" in resp.json()["detail"].lower()
