"""Goldmine Jobs — public landing page job intake endpoint.

POST /api/goldmine/jobs
  - Accepts postcode(s), room type, optional max budget, email.
  - Validates, sanitizes, stores in SQLite goldmine_jobs table.
  - Returns 201 with job_id + estimated_completion.
  - No auth required (public form, consistent with /api/market-report).
"""

from __future__ import annotations

import datetime as dt
import json
import re
import sqlite3
from pathlib import Path

from pydantic import BaseModel, EmailStr, field_validator

# ── Paths ────────────────────────────────────────────────────────────────────
DB_PATH = Path.home() / ".goldmine" / "goldmine.db"

# ── UK Postcode Regex ────────────────────────────────────────────────────────
UK_POSTCODE_RE = re.compile(
    r"^[A-Z]{1,2}\d[A-Z\d]?(\s?\d[A-Z]{2})?$", re.IGNORECASE
)


# ── Validation Helpers ───────────────────────────────────────────────────────

def sanitize_html(value: str) -> str:
    """Strip HTML tags from a string value."""
    return re.sub(r"<[^>]*>", "", value)


def validate_postcode(raw: str) -> str:
    """Validate and normalize a single UK postcode."""
    if not raw or not raw.strip():
        raise ValueError("postcode must not be empty")
    stripped = raw.strip().upper()
    compact = stripped.replace(" ", "")
    if len(compact) >= 5:
        inward = compact[-3:]
        outward = compact[:-3]
        stripped = f"{outward} {inward}"
    if not UK_POSTCODE_RE.match(stripped):
        raise ValueError(f"invalid uk postcode: {stripped}")
    return stripped


def validate_postcodes(raw: str) -> list[str]:
    """Parse comma-separated postcodes, validate each, return normalized list."""
    if not raw or not raw.strip():
        raise ValueError("please enter at least one postcode")
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    if not parts:
        raise ValueError("please enter at least one postcode")
    return [validate_postcode(sanitize_html(p)) for p in parts]


def validate_budget(raw: str | None) -> float | None:
    """Validate and parse a budget value."""
    if raw is None or raw.strip() == "":
        return None
    try:
        val = float(raw.strip())
    except ValueError:
        raise ValueError("budget must be a number")
    if val <= 0:
        raise ValueError("budget must be greater than 0")
    return val


# ── Pydantic Models ──────────────────────────────────────────────────────────

class GoldmineJobRequest(BaseModel):
    postcodes: str
    room_type: str = "any"
    max_budget: str | None = None
    email: EmailStr

    @field_validator("room_type")
    @classmethod
    def room_type_must_be_valid_choice(cls, v: str) -> str:
        allowed = {"any", "single", "double", "double_ensuite", "studio", "en-suite"}
        if v.lower() not in allowed:
            raise ValueError(f"invalid room type: {v}")
        return v.lower()


class GoldmineJobResponse(BaseModel):
    job_id: str
    status: str
    estimated_completion: str


# ── Database ─────────────────────────────────────────────────────────────────

def ensure_table() -> None:
    """Create goldmine_jobs table if it doesn't exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS goldmine_jobs (
            job_id      TEXT PRIMARY KEY,
            email       TEXT NOT NULL,
            postcodes   TEXT NOT NULL,
            room_type   TEXT NOT NULL DEFAULT 'any',
            max_budget  REAL,
            status      TEXT NOT NULL DEFAULT 'queued',
            estimated_completion TEXT,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()


def insert_job(
    job_id: str,
    email: str,
    postcodes: list[str],
    room_type: str,
    max_budget: float | None,
    estimated_completion: str,
) -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute(
        """INSERT INTO goldmine_jobs (job_id, email, postcodes, room_type, max_budget, estimated_completion)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            job_id,
            email,
            json.dumps(postcodes),
            room_type,
            max_budget,
            estimated_completion,
        ),
    )
    conn.commit()
    conn.close()


def get_job(job_id: str) -> dict | None:
    conn = sqlite3.connect(str(DB_PATH))
    row = conn.execute(
        "SELECT * FROM goldmine_jobs WHERE job_id = ?", (job_id,)
    ).fetchone()
    conn.close()
    if row is None:
        return None
    return {
        "job_id": row[0],
        "email": row[1],
        "postcodes": json.loads(row[2]),
        "room_type": row[3],
        "max_budget": row[4],
        "status": row[5],
        "estimated_completion": row[6],
        "created_at": row[7],
    }
