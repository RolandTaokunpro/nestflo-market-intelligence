"""Unit tests for goldmine_jobs module — DB functions and uncovered branches."""

import json
import pytest
from goldmine_jobs import (
    ensure_table,
    insert_job,
    get_job,
    validate_postcode,
    validate_postcodes,
    sanitize_html,
    validate_budget,
    GoldmineJobRequest,
    GoldmineJobResponse,
)


class TestDBFunctions:
    def test_ensure_table_creates_and_is_idempotent(self, tmp_path, monkeypatch):
        import goldmine_jobs as mod
        db = tmp_path / "test.db"
        monkeypatch.setattr(mod, "DB_PATH", db)
        # First call creates
        ensure_table()
        assert db.exists()
        # Second call is idempotent
        ensure_table()

    def test_insert_and_get_job(self, tmp_path, monkeypatch):
        import goldmine_jobs as mod
        db = tmp_path / "test.db"
        monkeypatch.setattr(mod, "DB_PATH", db)
        ensure_table()

        insert_job(
            job_id="job-1",
            email="test@example.com",
            postcodes=["SN1", "BS5"],
            room_type="double",
            max_budget=800.0,
            estimated_completion="~30 minutes",
        )

        job = get_job("job-1")
        assert job is not None
        assert job["job_id"] == "job-1"
        assert job["email"] == "test@example.com"
        assert job["postcodes"] == ["SN1", "BS5"]
        assert job["room_type"] == "double"
        assert job["max_budget"] == 800.0
        assert job["status"] == "queued"
        assert job["estimated_completion"] == "~30 minutes"

    def test_get_job_nonexistent(self, tmp_path, monkeypatch):
        import goldmine_jobs as mod
        db = tmp_path / "test.db"
        monkeypatch.setattr(mod, "DB_PATH", db)
        ensure_table()
        assert get_job("nonexistent") is None

    def test_insert_job_optional_budget(self, tmp_path, monkeypatch):
        import goldmine_jobs as mod
        db = tmp_path / "test.db"
        monkeypatch.setattr(mod, "DB_PATH", db)
        ensure_table()

        insert_job(
            job_id="job-2",
            email="test@example.com",
            postcodes=["SN1"],
            room_type="any",
            max_budget=None,
            estimated_completion="~30 minutes",
        )

        job = get_job("job-2")
        assert job["max_budget"] is None


class TestPostcodeValidationModule:
    """Test validate_postcode imported from goldmine_jobs module."""

    def test_full_postcode_space_normalization(self):
        """Cover line 39: inserting space for compact full postcodes."""
        assert validate_postcode("SN11AA") == "SN1 1AA"

    def test_full_postcode_already_spaced(self):
        assert validate_postcode("SW1A 2AA") == "SW1A 2AA"

    def test_outcode_only(self):
        assert validate_postcode("SN1") == "SN1"

    def test_multi_postcode_sanitization(self):
        """HTML stripping applied to each postcode."""
        result = validate_postcodes("SN1, <b>BS5</b>")
        assert result == ["SN1", "BS5"]


class TestBudgetValidationModule:
    """Test validate_budget imported from goldmine_jobs module."""

    def test_valid_budget_float(self):
        assert validate_budget("800") == 800.0

    def test_empty_budget_none(self):
        assert validate_budget("") is None

    def test_none_budget_none(self):
        assert validate_budget(None) is None

    def test_non_numeric_raises(self):
        with pytest.raises(ValueError, match="budget must be a number"):
            validate_budget("twelve hundred")

    def test_negative_raises(self):
        with pytest.raises(ValueError, match="budget must be greater than 0"):
            validate_budget("-100")

    def test_zero_raises(self):
        with pytest.raises(ValueError, match="budget must be greater than 0"):
            validate_budget("0")


class TestPydanticModels:
    """Test Pydantic model validation."""

    def test_valid_request(self):
        req = GoldmineJobRequest(
            postcodes="SN1",
            room_type="double",
            max_budget="800",
            email="jane@hmolettings.co.uk",
        )
        assert req.postcodes == "SN1"
        assert req.room_type == "double"
        assert req.email == "jane@hmolettings.co.uk"

    def test_room_type_normalized_to_lowercase(self):
        req = GoldmineJobRequest(
            postcodes="SN1",
            room_type="DOUBLE",
            email="jane@hmolettings.co.uk",
        )
        assert req.room_type == "double"

    def test_room_type_en_suite_allowed(self):
        req = GoldmineJobRequest(
            postcodes="SN1",
            room_type="en-suite",
            email="jane@hmolettings.co.uk",
        )
        assert req.room_type == "en-suite"

    def test_invalid_room_type_raises(self):
        with pytest.raises(ValueError):
            GoldmineJobRequest(
                postcodes="SN1",
                room_type="penthouse",
                email="jane@hmolettings.co.uk",
            )

    def test_email_validated_by_pydantic(self):
        with pytest.raises(ValueError):
            GoldmineJobRequest(
                postcodes="SN1",
                email="not-an-email",
            )


class TestResponseModel:
    def test_response_model(self):
        resp = GoldmineJobResponse(
            job_id="abc-123",
            status="queued",
            estimated_completion="~30 minutes",
        )
        assert resp.job_id == "abc-123"
        assert resp.status == "queued"
        d = resp.model_dump()
        assert d["job_id"] == "abc-123"
