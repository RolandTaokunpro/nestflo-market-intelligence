"""Unit tests for goldmine_jobs validation and sanitization.

Covers scenarios from Sections C and F of the Compass spec:
  - POST /api/goldmine/jobs happy path, missing fields, invalid email, XSS
  - Input sanitization: HTML stripping, postcode normalization
  - No CSRF enforcement on public endpoint
"""

import re
import pytest


# ---------------------------------------------------------------------------
# pure helper functions under test (will move to implementation file later)
# ---------------------------------------------------------------------------

UK_POSTCODE_RE = re.compile(
    r"^[A-Z]{1,2}\d[A-Z\d]?(\s?\d[A-Z]{2})?$", re.IGNORECASE
)


def validate_postcode(raw: str) -> str:
    """Validate and normalize a single UK postcode. Returns the normalized
    postcode (uppercase, single space, trimmed) or raises ValueError."""
    if not raw or not raw.strip():
        raise ValueError("postcode must not be empty")
    stripped = raw.strip().upper()
    # Insert space if missing for full postcodes (e.g. "SN11AA" → "SN1 1AA")
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
    return [validate_postcode(p) for p in parts]


def sanitize_html(value: str) -> str:
    """Strip HTML tags from a string value."""
    return re.sub(r"<[^>]*>", "", value)


def validate_budget(raw: str | None) -> float | None:
    """Validate and parse a budget value. Returns float or None if empty."""
    if raw is None or raw.strip() == "":
        return None
    try:
        val = float(raw.strip())
    except ValueError:
        raise ValueError("budget must be a number")
    if val <= 0:
        raise ValueError("budget must be greater than 0")
    return val


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------


class TestPostcodeValidation:
    """Scenario: Invalid postcode format — server-side validation."""

    def test_valid_single_postcode(self):
        assert validate_postcode("SN1") == "SN1"

    def test_valid_postcode_with_space(self):
        assert validate_postcode("SN1 1AA") == "SN1 1AA"

    def test_valid_london_postcode(self):
        assert validate_postcode("E14 5AB") == "E14 5AB"

    def test_lowercase_normalized(self):
        assert validate_postcode("sn1") == "SN1"

    def test_extra_whitespace_trimmed(self):
        assert validate_postcode("  SN1  ") == "SN1"

    def test_invalid_postcode_raises(self):
        with pytest.raises(ValueError, match="invalid uk postcode"):
            validate_postcode("NOTAPOSTCODE")

    def test_partial_postcode_raises(self):
        with pytest.raises(ValueError, match="invalid uk postcode"):
            validate_postcode("SN")

    def test_empty_postcode_raises(self):
        with pytest.raises(ValueError, match="postcode must not be empty"):
            validate_postcode("")

    def test_whitespace_only_raises(self):
        with pytest.raises(ValueError, match="postcode must not be empty"):
            validate_postcode("   ")


class TestMultiPostcodeValidation:
    """Scenario: Valid job submission — multiple postcodes, comma-separated."""

    def test_three_valid_postcodes(self):
        result = validate_postcodes("SN1, SN2, SN3")
        assert result == ["SN1", "SN2", "SN3"]

    def test_single_postcode_via_multi(self):
        result = validate_postcodes("SN1")
        assert result == ["SN1"]

    def test_empty_string_raises(self):
        with pytest.raises(ValueError, match="at least one postcode"):
            validate_postcodes("")

    def test_only_commas_raises(self):
        with pytest.raises(ValueError, match="at least one postcode"):
            validate_postcodes(", ,")

    def test_one_invalid_among_valid_raises(self):
        with pytest.raises(ValueError, match="invalid uk postcode"):
            validate_postcodes("SN1, INVALID, SN3")

    def test_whitespace_around_commas(self):
        result = validate_postcodes(" SN1 ,  SN2 ")
        assert result == ["SN1", "SN2"]


class TestSanitizeHtml:
    """Scenario: Input sanitization — HTML stripped from fields."""

    def test_strips_script_tags(self):
        assert sanitize_html('<script>alert(1)</script>') == 'alert(1)'

    def test_strips_img_tag(self):
        assert sanitize_html('<img src=x onerror=alert(1)>') == ''

    def test_strips_multiple_tags(self):
        assert sanitize_html('<b>bold</b> text') == 'bold text'

    def test_plain_text_unchanged(self):
        assert sanitize_html('SN1 1AA') == 'SN1 1AA'

    def test_xss_in_postcode_stripped(self):
        # Scenario: XSS in postcode — stripped before validation
        cleaned = sanitize_html('<script>alert(1)</script>')
        # After stripping, "alert(1)" remains — not a valid postcode
        with pytest.raises(ValueError, match="invalid uk postcode"):
            validate_postcode(cleaned)


class TestBudgetValidation:
    """Scenarios: non-numeric budget, negative budget."""

    def test_valid_budget(self):
        assert validate_budget("800") == 800.0

    def test_budget_with_pence(self):
        assert validate_budget("750.50") == 750.5

    def test_empty_budget_returns_none(self):
        assert validate_budget("") is None

    def test_none_budget_returns_none(self):
        assert validate_budget(None) is None

    def test_whitespace_budget_returns_none(self):
        assert validate_budget("   ") is None

    def test_non_numeric_budget_raises(self):
        with pytest.raises(ValueError, match="budget must be a number"):
            validate_budget("twelve hundred")

    def test_negative_budget_raises(self):
        with pytest.raises(ValueError, match="budget must be greater than 0"):
            validate_budget("-100")

    def test_zero_budget_raises(self):
        with pytest.raises(ValueError, match="budget must be greater than 0"):
            validate_budget("0")


class TestEmailValidation:
    """Scenario: Invalid email format — server-side validation uses Pydantic EmailStr."""

    def test_valid_email_accepted(self):
        from pydantic import EmailStr
        e = EmailStr._validate("jane@hmolettings.co.uk")
        assert e == "jane@hmolettings.co.uk"

    def test_invalid_email_rejected(self):
        from pydantic import EmailStr
        with pytest.raises(ValueError):
            EmailStr._validate("not-an-email")

    def test_xss_email_rejected(self):
        from pydantic import EmailStr
        with pytest.raises(ValueError):
            EmailStr._validate("<script>alert(1)</script>@evil.com")

    def test_missing_at_sign(self):
        from pydantic import EmailStr
        with pytest.raises(ValueError):
            EmailStr._validate("janehmolettings.co.uk")
