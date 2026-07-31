"""Unit tests for goldmine.scoring — one test per Compass Gherkin Scenario.

Feature: Goldmine Listing Scoring (spec.md, Compass v3).
Bridge: test_<scenario_slug> per Scenario: block. Linus builds ONLY to these
scenarios (Blind Coder Constraint) — no additional behavior beyond what each
scenario asserts.
"""
import pytest

from goldmine.scoring import (
    score_r1_price_gap,
    score_r2_photo_quality,
    score_r3_availability,
    score_r4_urgency_language,
    score_r5_lowered_requirements,
    score_r6_listing_age,
    score_r7_price_drop,
    score_r8_portfolio_voids,
    ScoringError,
)


# --- R1: Price Gap ---

def test_listing_15pct_below_district_median_scores_high():
    # Given a listing priced £450/month in district SN1
    # And the SN1 median rent for that room type is £650/month
    # When the listing is scored against R1 (Price Gap)
    result = score_r1_price_gap(rent=450, median=650)
    # Then the R1 score exceeds 70
    # And the listing is flagged as "undervalued"
    assert result["score"] > 70
    assert result["flagged"] is True


def test_listing_at_district_median_scores_low():
    # Given a listing priced £650/month in district SN1
    # And the SN1 median rent for that room type is £650/month
    result = score_r1_price_gap(rent=650, median=650)
    # Then the R1 score is below 30
    # And the listing is NOT flagged as "undervalued"
    assert result["score"] < 30
    assert result["flagged"] is False


def test_missing_rent_data_returns_error():
    # Given a listing with no rent field
    # When the listing is scored against R1 (Price Gap)
    # Then the scoring returns an error "price_required"
    # And the HTTP status is 400
    with pytest.raises(ScoringError) as exc_info:
        score_r1_price_gap(rent=None, median=650)
    assert exc_info.value.code == "price_required"
    assert exc_info.value.http_status == 400


def test_zero_median_returns_error():
    # Given a listing priced £450/month with a district median of 0 (impossible)
    # When the listing is scored against R1 (Price Gap)
    # Then the scoring returns an error "median_required"
    # And the HTTP status is 400
    with pytest.raises(ScoringError) as exc_info:
        score_r1_price_gap(rent=450, median=0)
    assert exc_info.value.code == "median_required"
    assert exc_info.value.http_status == 400


def test_none_median_returns_error():
    # Given a listing priced £450/month with a None district median
    # When the listing is scored against R1 (Price Gap)
    # Then the scoring returns an error "median_required"
    # And the HTTP status is 400
    with pytest.raises(ScoringError) as exc_info:
        score_r1_price_gap(rent=450, median=None)
    assert exc_info.value.code == "median_required"
    assert exc_info.value.http_status == 400


# --- R2: Photo Quality ---

def test_empty_photo_list_returns_low_score():
    # Given a listing with zero photos (empty condition list)
    # When the listing is scored against R2 (Photo Quality)
    result = score_r2_photo_quality(photo_condition_scores=[])
    # Then the R2 score is exactly 0 (no data → zero confidence)
    assert result["score"] == 0
    # And the listing is NOT flagged
    assert result["flagged"] is False


def test_high_quality_photos_score_high():
    # Given a listing with 5 photos scoring 4+ on condition
    photos = [4, 4, 5, 4, 5]
    # When the listing is scored against R2 (Photo Quality)
    result = score_r2_photo_quality(photo_condition_scores=photos)
    # Then the R2 score exceeds 70
    assert result["score"] > 70


def test_no_photos_or_low_quality_photos_score_low():
    # Given a listing with 1 photo scoring below 3 on condition
    photos = [2]
    # When the listing is scored against R2 (Photo Quality)
    result = score_r2_photo_quality(photo_condition_scores=photos)
    # Then the R2 score is below 30
    assert result["score"] < 30


# --- R3: Availability ---

def test_immediately_available_listing_scores_high():
    # Given a listing with availability text "available now"
    # When the listing is scored against R3 (Availability)
    result = score_r3_availability(availability_text="available now")
    # Then the R3 score exceeds 80
    assert result["score"] > 80


def test_future_date_availability_scores_low():
    # Given a listing with availability text "available from 15 September 2026"
    # When the listing is scored against R3 (Availability)
    result = score_r3_availability(availability_text="available from 15 September 2026")
    # Then the R3 score is below 30
    assert result["score"] < 30


# --- R4: Urgency Language ---

def test_urgent_language_in_description_scores_high():
    # Given a listing description containing "must go" and "immediate move-in"
    description = "Great room, must go, immediate move-in preferred."
    # When the listing is scored against R4 (Urgency Language)
    result = score_r4_urgency_language(description=description)
    # Then the R4 score exceeds 60
    assert result["score"] > 60


def test_standard_description_scores_low():
    # Given a listing description with neutral language and no urgency keywords
    description = "Spacious double room in a quiet shared house near the station."
    # When the listing is scored against R4 (Urgency Language)
    result = score_r4_urgency_language(description=description)
    # Then the R4 score is below 30
    assert result["score"] < 30


# --- R5: Lowered Requirements ---

def test_flexible_requirements_signal_motivation():
    # Given a listing accepting "no deposit", "pets OK", and "DSS welcome"
    prefs = {"no_deposit": True, "pets_ok": True, "dss_ok": True}
    # When the listing is scored against R5 (Lowered Requirements)
    result = score_r5_lowered_requirements(tenant_prefs=prefs)
    # Then the R5 score exceeds 60
    assert result["score"] > 60


def test_standard_requirements_score_baseline():
    # Given a listing with standard deposit and referencing requirements only
    prefs = {"no_deposit": False, "pets_ok": False, "dss_ok": False}
    # When the listing is scored against R5 (Lowered Requirements)
    result = score_r5_lowered_requirements(tenant_prefs=prefs)
    # Then the R5 score is below 30
    assert result["score"] < 30


# --- R6: Listing Age ---

def test_old_listing_scores_high():
    # Given a listing first posted 45 days ago
    # When the listing is scored against R6 (Listing Age)
    result = score_r6_listing_age(days_on_market=45)
    # Then the R6 score exceeds 60
    assert result["score"] > 60


def test_fresh_listing_scores_low():
    # Given a listing first posted 2 days ago
    # When the listing is scored against R6 (Listing Age)
    result = score_r6_listing_age(days_on_market=2)
    # Then the R6 score is below 30
    assert result["score"] < 30


# --- R7: Price Drop ---

def test_price_drop_detected():
    # Given a listing with original price £600/month and current price £500/month
    # When the listing is scored against R7 (Price Drop)
    result = score_r7_price_drop(original_price=600, current_price=500)
    # Then the R7 score exceeds 70
    assert result["score"] > 70


def test_no_price_drop_baseline():
    # Given a listing with no strikethrough or original price
    # When the listing is scored against R7 (Price Drop)
    result = score_r7_price_drop(original_price=None, current_price=500)
    # Then the R7 score is below 20
    assert result["score"] < 20


# --- R8: Portfolio Voids ---

def test_same_landlord_with_multiple_listings():
    # Given a landlord with 4 active listings across 2 postcodes
    # And at least 2 listings have been active for more than 30 days
    result = score_r8_portfolio_voids(
        active_listing_count=4, distinct_postcodes=2, listings_over_30_days=2,
    )
    # Then the R8 score exceeds 60
    assert result["score"] > 60


def test_single_listing_landlord():
    # Given a landlord with 1 active listing
    result = score_r8_portfolio_voids(
        active_listing_count=1, distinct_postcodes=1, listings_over_30_days=0,
    )
    # Then the R8 score is below 20
    assert result["score"] < 20


# ======================================================================
# Hardening tests (mutation-killing)
# ======================================================================


# --- R1: Price Gap hardening ---

def test_r1_exactly_15pct_gap_boundary():
    """15.0% gap — boundary: gap_pct >= 15 triggers the high-score branch."""
    # rent=552.5, median=650 → (650-552.5)/650*100 = 15.0
    result = score_r1_price_gap(rent=552.5, median=650)
    assert result["score"] == pytest.approx(85.0)
    assert result["flagged"] is True


def test_r1_just_below_15pct_gap():
    """14.9% gap — just below the threshold, low-score branch."""
    # rent=553.15, median=650 → (650-553.15)/650*100 ≈ 14.9
    result = score_r1_price_gap(rent=553.2, median=650)
    assert result["score"] < 70
    assert result["flagged"] is False


def test_r1_at_median_exact_score_zero():
    """At-median listing returns exactly 0.0, not a computed small number."""
    result = score_r1_price_gap(rent=650, median=650)
    assert result["score"] == 0.0
    assert result["flagged"] is False


def test_r1_below_median_negative_gap_clamped():
    """Rent above median gives negative gap, clamped to 0.0."""
    result = score_r1_price_gap(rent=800, median=650)
    assert result["score"] == 0.0
    assert result["flagged"] is False


# --- R2: Photo Quality hardening ---

def test_r2_flagged_assertion_poor():
    """Median <= 3 triggers flagged=True."""
    result = score_r2_photo_quality([2, 3])  # median 2.5
    assert result["flagged"] is True
    # score = (2.5-1)*25 = 37.5
    assert result["score"] == pytest.approx(37.5)


def test_r2_not_flagged_good_quality():
    """Median > 3: not flagged."""
    result = score_r2_photo_quality([4, 5])  # median 4.5
    assert result["flagged"] is False
    assert result["score"] > 70


def test_r2_boundary_median_exactly_3():
    """Median == 3 exactly: at the poor threshold, flagged."""
    result = score_r2_photo_quality([3])
    assert result["flagged"] is True
    assert result["score"] == 50.0  # (3-1)*25


def test_r2_single_photo_median_4():
    """Single photo with median 4 — exact score 75, not flagged."""
    result = score_r2_photo_quality([4])
    assert result["score"] == 75.0
    assert result["flagged"] is False


# --- R3: Availability hardening ---

def test_r3_flagged_when_available_now():
    """Available now → flagged=True, score == 90."""
    result = score_r3_availability("available now")
    assert result["flagged"] is True
    assert result["score"] == 90


def test_r3_not_flagged_for_future_date():
    """Future date → flagged=False, score == 10."""
    result = score_r3_availability("available from 15 September 2026")
    assert result["flagged"] is False
    assert result["score"] == 10


def test_r3_none_or_empty_text_scores_low():
    """None or empty availability text → no match, score low."""
    result = score_r3_availability("")
    assert result["score"] == 10
    assert result["flagged"] is False


# --- R4: Urgency Language hardening ---

def test_r4_asserts_matches_list():
    """Verify the matches field contains the matched keywords."""
    result = score_r4_urgency_language("Great room, must go, urgent sale!")
    assert "must go" in result["matches"]
    assert "urgent" in result["matches"]
    assert result["score"] == 80
    assert result["flagged"] is True


def test_r4_no_matches_scores_low():
    """No urgency keywords → empty matches, score == 5."""
    result = score_r4_urgency_language("Standard description, nothing special.")
    assert result["matches"] == []
    assert result["score"] == 5
    assert result["flagged"] is False


def test_r4_none_description_handled():
    """None description → treated as empty string."""
    result = score_r4_urgency_language("")
    assert result["matches"] == []
    assert result["score"] == 5


# --- R5: Lowered Requirements hardening ---

def test_r5_asserts_flags_list():
    """Verify the flags field contains the matched preference keys."""
    prefs = {"no_deposit": True, "pets_ok": True}
    result = score_r5_lowered_requirements(tenant_prefs=prefs)
    assert "no_deposit" in result["flags"]
    assert "pets_ok" in result["flags"]
    assert result["flagged"] is True
    assert result["score"] == 50  # 2 * 25


def test_r5_all_five_flags_capped_at_100():
    """5 flags × 25 = 125, but max_score caps at 100."""
    prefs = {"no_deposit": True, "couples_ok": True, "dss_ok": True,
             "pets_ok": True, "short_let": True}
    result = score_r5_lowered_requirements(tenant_prefs=prefs)
    assert result["score"] == 100
    assert len(result["flags"]) == 5


def test_r5_no_flags_zero_score():
    """No lenient flags → score 0, not flagged."""
    prefs = {"no_deposit": False}
    result = score_r5_lowered_requirements(tenant_prefs=prefs)
    assert result["score"] == 0
    assert result["flagged"] is False
    assert result["flags"] == []


# --- R6: Listing Age hardening ---

def test_r6_exact_score_old_listing():
    """Old listing returns exactly 75, not 76 or 74."""
    result = score_r6_listing_age(days_on_market=45)
    assert result["score"] == 75
    assert result["flagged"] is True


def test_r6_boundary_exactly_21_days():
    """Exactly 21 days — at the old threshold, flagged."""
    result = score_r6_listing_age(days_on_market=21)
    assert result["score"] == 75
    assert result["flagged"] is True


def test_r6_boundary_20_days_not_old():
    """20 days — just below the threshold, not flagged, score == 5."""
    result = score_r6_listing_age(days_on_market=20)
    assert result["score"] == 5
    assert result["flagged"] is False


# --- R7: Price Drop hardening ---

def test_r7_asserts_drop_pct_and_flagged():
    """Verify drop_pct calculation and flagged field."""
    result = score_r7_price_drop(original_price=600, current_price=500)
    # drop = (600-500)/600*100 = 16.67%
    assert result["drop_pct"] == pytest.approx(16.666, abs=0.01)
    assert result["flagged"] is True


def test_r7_boundary_exactly_5pct_drop():
    """Exactly 5% drop — at the drop threshold, flagged."""
    # original=1000, current=950 → drop = (50)/1000*100 = 5.0
    result = score_r7_price_drop(original_price=1000, current_price=950)
    assert result["drop_pct"] == 5.0
    assert result["flagged"] is True
    assert result["score"] == 75.0  # 70 + 5


def test_r7_tiny_drop_below_threshold():
    """2% drop — below threshold, not flagged, score == drop_pct."""
    # original=1000, current=980 → drop = 2.0%
    result = score_r7_price_drop(original_price=1000, current_price=980)
    assert result["drop_pct"] == 2.0
    assert result["flagged"] is False
    assert result["score"] == 2.0


def test_r7_no_drop_original_equals_current():
    """original == current_price → no drop, score 0."""
    result = score_r7_price_drop(original_price=500, current_price=500)
    assert result["drop_pct"] == 0.0
    assert result["flagged"] is False
    assert result["score"] == 0


def test_r7_no_original_price_zero_score():
    """None original → score 0, drop_pct 0, not flagged."""
    result = score_r7_price_drop(original_price=None, current_price=500)
    assert result["score"] == 0
    assert result["drop_pct"] == 0.0
    assert result["flagged"] is False


# --- R8: Portfolio Voids hardening ---

def test_r8_exact_score_calculation():
    """Verify exact score formula: 50 + over30*10 + postcodes*5."""
    result = score_r8_portfolio_voids(
        active_listing_count=4, distinct_postcodes=2, listings_over_30_days=2,
    )
    assert result["score"] == 80  # 50 + 2*10 + 2*5
    assert result["flagged"] is True


def test_r8_boundary_two_listings():
    """Exactly 2 active listings — just at the multi-listing threshold."""
    result = score_r8_portfolio_voids(
        active_listing_count=2, distinct_postcodes=1, listings_over_30_days=0,
    )
    assert result["score"] == 55  # 50 + 0 + 5
    assert result["flagged"] is False


def test_r8_cap_at_100():
    """Score would exceed 100 — capped at 100."""
    result = score_r8_portfolio_voids(
        active_listing_count=10, distinct_postcodes=8, listings_over_30_days=10,
    )
    assert result["score"] == 100
    assert result["flagged"] is True


def test_r8_single_listing_exact_score():
    """Single listing returns exactly 10."""
    result = score_r8_portfolio_voids(
        active_listing_count=1, distinct_postcodes=1, listings_over_30_days=0,
    )
    assert result["score"] == 10
    assert result["flagged"] is False


# --- Extra mutation-killing boundary tests ---

def test_r4_single_match_flagged():
    """Exactly 1 urgency keyword → flagged is True, kills len>1 mutant."""
    result = score_r4_urgency_language("This deal is urgent!")
    assert result["flagged"] is True
    assert len(result["matches"]) == 1
    assert "urgent" in result["matches"]


def test_r5_single_flag_flagged():
    """Exactly 1 lenient flag → flagged is True, kills len>1 mutant."""
    prefs = {"no_deposit": True, "pets_ok": False}
    result = score_r5_lowered_requirements(tenant_prefs=prefs)
    assert result["flagged"] is True
    assert len(result["flags"]) == 1
    assert result["score"] == 25


def test_r7_equal_price_no_division_by_zero():
    """original == current → no drop, no crash. Kills <= vs < mutant."""
    result = score_r7_price_drop(original_price=500, current_price=500)
    assert result["score"] == 0
    assert result["drop_pct"] == 0.0
    assert result["flagged"] is False


def test_r2_odd_length_list_uses_median():
    """Odd-length list uses middle element directly, not average."""
    result = score_r2_photo_quality([2, 4, 5])  # median = 4
    assert result["score"] == 75.0  # (4-1)*25
    assert result["flagged"] is False


def test_r2_even_length_list_uses_average():
    """Even-length list uses average of two middle elements."""
    result = score_r2_photo_quality([2, 3, 4, 5])  # median = (3+4)/2 = 3.5
    assert result["score"] == pytest.approx(62.5)  # (3.5-1)*25
    assert result["flagged"] is False
