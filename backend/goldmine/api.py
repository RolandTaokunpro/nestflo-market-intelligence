"""Goldmine API — FastAPI app for the two API-level Gherkin scenarios
(Auth, Empty State). Scoring logic lives in goldmine.scoring; this module
only wires HTTP routes + the API-key auth gate.
"""
from __future__ import annotations

import hmac
import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException


def require_api_key(x_api_key: str | None = Header(default=None)) -> str:
    """Auth gate. spec.md's one Auth scenario only asserts no-token -> 401.
    No scenario covers wrong-key or missing-server-config, so both fail
    closed to the same 401 rather than branching to 403/503."""
    expected = os.environ.get("GOLDMINE_API_KEY")
    if not expected or x_api_key is None or not hmac.compare_digest(
        x_api_key.encode("utf-8"), expected.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="authentication required")
    return x_api_key


def create_app() -> FastAPI:
    app = FastAPI()

    @app.post("/api/goldmine/score")
    def score_listing(x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
        require_api_key(x_api_key)
        return {"status": "scored"}

    @app.get("/api/goldmine/district/{district}")
    def get_district(district: str, x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
        require_api_key(x_api_key)
        # No live listing store wired yet — every district returns empty
        # until the crawler/store integration lands under its own scenario.
        return {"results": [], "total_listings": 0}

    return app
