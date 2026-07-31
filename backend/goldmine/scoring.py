"""Goldmine scoring engine — pure functions, no I/O.

Built strictly to Compass's Gherkin Scenario: blocks (spec.md). Signals not
yet backed by a scenario are not implemented.
"""
from __future__ import annotations

import re
from typing import Any


class ScoringError(Exception):
    """Raised when a signal cannot be scored due to missing required data."""

    def __init__(self, code: str, http_status: int):
        self.code = code
        self.http_status = http_status
        super().__init__(code)


# ---------------------------------------------------------------------------
# R1 — price gap vs district median
# ---------------------------------------------------------------------------

R1_FLAG_THRESHOLD = 70


def score_r1_price_gap(rent: float | None, median: float | None) -> dict[str, Any]:
    """Score a listing's rent against the district median for its room type.

    Gap = (median - rent) / median * 100. A gap of >=15% scores above the
    flag threshold (>70); at-median listings score below 30.
    """
    if rent is None:
        raise ScoringError(code="price_required", http_status=400)
    if median is None or median == 0:
        raise ScoringError(code="median_required", http_status=400)

    gap_pct = (median - rent) / median * 100

    if gap_pct >= 15:
        score = 70 + gap_pct
    else:
        score = max(0.0, gap_pct)

    return {"score": score, "flagged": score > R1_FLAG_THRESHOLD}


# ---------------------------------------------------------------------------
# R2 — photo quality (vision-scored condition, 1-5)
# ---------------------------------------------------------------------------

R2_FLAG_THRESHOLD = 70
R2_POOR_MEDIAN = 3


def score_r2_photo_quality(photo_condition_scores: list[int]) -> dict[str, Any]:
    """Median of per-photo condition scores (1-5), scaled to 0-100.

    Median >= 4 -> high score (>70). Median < 3 -> low score (<30).
    """
    if not photo_condition_scores:
        return {"score": 0, "flagged": False}

    scores = sorted(photo_condition_scores)
    n = len(scores)
    mid = n // 2
    median = scores[mid] if n % 2 == 1 else (scores[mid - 1] + scores[mid]) / 2

    score = (median - 1) * 25  # 1-5 scale -> 0-100

    return {"score": score, "flagged": median <= R2_POOR_MEDIAN}


# ---------------------------------------------------------------------------
# R3 — availability (now vs future date)
# ---------------------------------------------------------------------------

_NOW_WORDS = re.compile(r"\b(now|immediate(?:ly)?|today|asap)\b", re.IGNORECASE)


def score_r3_availability(availability_text: str) -> dict[str, Any]:
    """"Available now"/"immediate" language scores high; a future date in
    the text (e.g. "available from 15 September 2026") scores low."""
    is_now = bool(_NOW_WORDS.search(availability_text or ""))
    score = 90 if is_now else 10
    return {"score": score, "flagged": is_now}


# ---------------------------------------------------------------------------
# R4 — urgency language in description
# ---------------------------------------------------------------------------

_URGENCY_KEYWORDS = (
    "must go", "immediate move-in", "urgent", "asap", "act fast",
    "won't last", "priced to sell",
)


def score_r4_urgency_language(description: str) -> dict[str, Any]:
    """Case-insensitive keyword match against a fixed urgency-phrase list.
    Any match scores high (>60); no matches score low (<30). Binary per
    spec.md -- only the 2+ matches and 0 matches scenarios exist; no
    exactly-one-match scenario, so no exactly-one-match branch."""
    lowered = (description or "").lower()
    matches = [kw for kw in _URGENCY_KEYWORDS if kw in lowered]
    score = 80 if matches else 5
    return {"score": score, "matches": matches, "flagged": len(matches) > 0}


# ---------------------------------------------------------------------------
# R5 — lowered tenant requirements
# ---------------------------------------------------------------------------

_LENIENT_FLAGS = ("no_deposit", "couples_ok", "dss_ok", "pets_ok", "short_let")
R5_POINTS_PER_FLAG = 25
R5_MAX_SCORE = 100


def score_r5_lowered_requirements(tenant_prefs: dict[str, Any]) -> dict[str, Any]:
    """2+ lenient flags (no_deposit, couples_ok, dss_ok, pets_ok, short_let)
    score high (>60); no flags score low (<30)."""
    flags = [k for k in _LENIENT_FLAGS if tenant_prefs.get(k) is True]
    score = min(len(flags) * R5_POINTS_PER_FLAG, R5_MAX_SCORE)
    return {"score": score, "flags": flags, "flagged": len(flags) > 0}


# ---------------------------------------------------------------------------
# R6 — listing age (days on market)
# ---------------------------------------------------------------------------

R6_OLD_DAYS = 21


def score_r6_listing_age(days_on_market: int) -> dict[str, Any]:
    """>=21 days on market scores high (>60); <=7 days scores low (<30).
    Binary per spec.md -- only the >=21-day and <=7-day scenarios exist;
    no middle-range (8-20 day) scenario, so no middle-range branch."""
    if days_on_market >= R6_OLD_DAYS:
        score = 75
    else:
        score = 5
    return {"score": score, "flagged": days_on_market >= R6_OLD_DAYS}


# ---------------------------------------------------------------------------
# R7 — price drop (strikethrough original vs current)
# ---------------------------------------------------------------------------

R7_DROP_THRESHOLD_PCT = 5


def score_r7_price_drop(original_price: float | None, current_price: float) -> dict[str, Any]:
    """Drop = (original - current) / original * 100. A drop scores high
    (>70); no original/strikethrough price scores low (<20)."""
    if original_price is None or original_price <= current_price:
        return {"score": 0, "drop_pct": 0.0, "flagged": False}

    drop_pct = (original_price - current_price) / original_price * 100
    score = 70 + drop_pct if drop_pct >= R7_DROP_THRESHOLD_PCT else drop_pct
    return {"score": score, "drop_pct": drop_pct, "flagged": drop_pct >= R7_DROP_THRESHOLD_PCT}


# ---------------------------------------------------------------------------
# R8 — portfolio voids (same landlord, multiple listings)
# ---------------------------------------------------------------------------

R8_MULTI_LISTING_MIN = 2


def score_r8_portfolio_voids(active_listing_count: int, distinct_postcodes: int,
                             listings_over_30_days: int) -> dict[str, Any]:
    """2+ active listings for the same landlord with 2+ aged >30 days scores
    high (>60); a single-listing landlord scores low (<20)."""
    if active_listing_count < R8_MULTI_LISTING_MIN:
        return {"score": 10, "flagged": False}

    score = 50 + (listings_over_30_days * 10) + (distinct_postcodes * 5)
    score = min(score, 100)
    return {"score": score, "flagged": score > 60}
