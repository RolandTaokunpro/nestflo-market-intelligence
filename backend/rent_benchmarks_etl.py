#!/usr/bin/env python3
"""
Rent Benchmarks ETL — imports Echo's flat-file rent analysis JSONs into
backend/data/rent_benchmarks.db (SQLite).

Run this LOCALLY on the Mac mini (where memory/echo/reports/ actually lives —
it is a sibling of this repo, not inside it, and Render never has access to
it). Commit the resulting .db file; it ships as a build artifact baked into
the Docker image (see Dockerfile). Re-run + commit + push to refresh data.
This sidesteps the "is Render's disk ephemeral" question entirely: the API
never writes to the DB at runtime, so persistence across deploys is moot.

Usage:
    python3 rent_benchmarks_etl.py [--source-dir PATH] [--db-path PATH]

Source layout expected (Echo's workspace):
    {source-dir}/reports/{POSTCODE}/{POSTCODE}_analysis.json   (v1 or v2 schema)
    {source-dir}/integrity/*.json                               (zero-listing backfill)

Zero-hallucination: any district/room_type this script cannot parse is
logged and excluded — never inserted with fabricated or guessed values (AC 5).
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

ROOM_TYPES = ["single", "double", "double_ensuite", "studio"]

DEFAULT_SOURCE_DIR = Path.home() / ".openclaw" / "workspace" / "memory" / "echo"
DEFAULT_DB_PATH = Path(__file__).resolve().parent / "data" / "rent_benchmarks.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS rent_benchmarks (
    postcode_district      TEXT NOT NULL,
    room_type              TEXT NOT NULL,
    month                  TEXT NOT NULL,
    data_tier              TEXT NOT NULL,   -- large | medium | thin | zero
    status                 TEXT NOT NULL,   -- available | limited | no_data
    total_listings         INTEGER,
    p25                    REAL,
    p50                    REAL,
    p75                    REAL,
    mean                   REAL,
    min_rent               REAL,
    max_rent               REAL,
    bills_included_count   INTEGER,
    bills_included_mean    REAL,
    bills_excluded_count   INTEGER,
    bills_excluded_mean    REAL,
    last_updated           TEXT,
    schema_source_version  TEXT NOT NULL,
    thin_listing_rents_json TEXT,           -- raw individual rents for thin tier (AC 11), JSON array
    comparables_json       TEXT,            -- up to 5 comparables, JSON array (AC 18)
    PRIMARY KEY (postcode_district, room_type, month)
);
CREATE INDEX IF NOT EXISTS idx_rent_benchmarks_district ON rent_benchmarks(postcode_district);
"""


def month_from_iso(ts: str | None) -> str | None:
    if not ts:
        return None
    try:
        return ts[:7]  # YYYY-MM
    except Exception:
        return None


def tier_for_count(n: int) -> str:
    if n >= 8:
        return "large"
    if n >= 3:
        return "medium"
    if n >= 1:
        return "thin"
    return "zero"


def status_for_tier(tier: str) -> str:
    return {"large": "available", "medium": "available", "thin": "limited", "zero": "no_data"}[tier]


def compute_bills_split(listings: list[dict]) -> tuple[int, float | None, int, float | None]:
    """From a FULL listing set (raw_listings.json), split bills included/excluded.
    Only called when we have the complete per-district listing list, not just
    the top-5 comparables — using a 5-sample subset to represent bills stats
    for the whole district would be a partial-sample fabrication risk."""
    inc = [l["rent_pcm"] for l in listings if l.get("bills_included") is True and l.get("rent_pcm") is not None]
    exc = [l["rent_pcm"] for l in listings if l.get("bills_included") is False and l.get("rent_pcm") is not None]
    inc_mean = round(sum(inc) / len(inc), 2) if inc else None
    exc_mean = round(sum(exc) / len(exc), 2) if exc else None
    return len(inc), inc_mean, len(exc), exc_mean


def parse_v2_room(room: dict) -> dict | None:
    """v2 schema: analyses{room_type} with median/p25/p75/total_listings_found/status.

    A third variant exists in the live corpus (CF3, CF5 — 2026-05 dry-run-mock
    fixtures) that uses 'true_market_average' instead of median/p25/p75 inside
    an otherwise-v2-shaped room object, with status='complete' regardless of
    sample size. Not documented in Echo's research brief §2.4 (which only
    describes true_market_average as a v1/value_summary[] field) — discovered
    during ETL dev by diffing DB output against source JSON. Flagged for
    Hawk/Roland: is 'true_market_average' a mean or median? Named as an
    average, so treated here as MEAN only, never substituted for p50 — do not
    fabricate a percentile from a mean (zero-hallucination, AC 5/9-15)."""
    status = room.get("status")
    if status in ("no_listings",):
        return {"total_listings": 0, "p25": None, "p50": None, "p75": None,
                "mean": None, "min_rent": None, "max_rent": None,
                "comparables": []}
    if status == "insufficient_data":
        # thin tier — no aggregate stats, only whatever raw listing count is given
        n = room.get("total_listings_found", room.get("valid_with_rent", 0)) or 0
        return {"total_listings": n, "p25": None, "p50": None, "p75": None,
                "mean": None, "min_rent": None, "max_rent": None,
                "comparables": room.get("comparables", [])}
    if status in ("complete", "median_only"):
        n = room.get("total_listings_found", room.get("valid_with_rent", 0)) or 0
        min_r = room.get("min_rent")
        max_r = room.get("max_rent")
        median = room.get("median")
        mean = room.get("true_market_average")  # only source of central tendency in this variant
        return {"total_listings": n, "p25": room.get("p25"), "p50": median,
                "p75": room.get("p75"), "mean": mean, "min_rent": min_r, "max_rent": max_r,
                "comparables": room.get("comparables", [])}
    # Unrecognised status for this room — cannot safely parse, skip (AC 5)
    return None


def parse_v1_room(room: dict) -> dict | None:
    """v1 schema (per research brief): value_summary[] with market_avg.
    No live v1 fixture exists in the current corpus (confirmed via scan of
    memory/echo/reports/); this path is written defensively per Echo's brief
    description but is UNTESTED against a real v1 file. Flagged for Hawk/James
    review — if a v1 file ever surfaces, verify this branch against it before
    trusting its output."""
    vs = room.get("value_summary")
    if not vs or not isinstance(vs, list):
        return None
    valid = [v for v in vs if isinstance(v.get("rent_pcm"), (int, float))]
    n = len(valid)
    if n == 0:
        return {"total_listings": 0, "p25": None, "p50": None, "p75": None,
                "mean": room.get("market_avg"), "min_rent": None, "max_rent": None,
                "comparables": []}
    rents = sorted(v["rent_pcm"] for v in valid)
    mean = room.get("market_avg")
    return {"total_listings": n, "p25": None, "p50": None, "p75": None,
            "mean": mean, "min_rent": rents[0], "max_rent": rents[-1],
            "comparables": room.get("comparables", [])[:5]}


def load_raw_listings(district_dir: Path, postcode: str) -> dict[str, list[dict]] | None:
    """Full per-room-type listing set, when available, for bills-split stats."""
    raw_path = district_dir / f"{postcode}_raw_listings.json"
    if not raw_path.exists():
        return None
    try:
        data = json.loads(raw_path.read_text())
    except Exception as e:
        print(f"  ⚠️  {postcode}: unparseable raw_listings.json ({e}) — bills split will be omitted")
        return None
    by_type: dict[str, list[dict]] = {rt: [] for rt in ROOM_TYPES}
    for listing in data.get("listings", []):
        rt = listing.get("room_type")
        if rt in by_type:
            by_type[rt].append(listing)
    return by_type


def process_district_analysis(path: Path, conn: sqlite3.Connection, stats: dict) -> None:
    postcode = path.stem.replace("_analysis", "")
    try:
        data = json.loads(path.read_text())
    except Exception as e:
        print(f"  ❌ {postcode}: unparseable JSON ({e}) — skipped entirely")
        stats["skipped"].append((postcode, f"unparseable JSON: {e}"))
        return

    analysed_at = data.get("analysed_at") or (data.get("crawl_metadata") or {}).get("crawl_timestamp_utc")
    month = month_from_iso(analysed_at)
    if not month:
        print(f"  ❌ {postcode}: no timestamp found — skipped entirely")
        stats["skipped"].append((postcode, "no timestamp"))
        return

    analyses = data.get("analyses")
    if not isinstance(analyses, dict):
        print(f"  ❌ {postcode}: no 'analyses' object — skipped entirely")
        stats["skipped"].append((postcode, "no analyses object"))
        return

    raw_by_type = load_raw_listings(path.parent, postcode)

    for room_type in ROOM_TYPES:
        room = analyses.get(room_type)
        if room is None:
            stats["skipped"].append((f"{postcode}/{room_type}", "room type absent from analyses"))
            continue

        schema_version = "v2"
        parsed = parse_v2_room(room)
        if parsed is None:
            parsed = parse_v1_room(room)
            schema_version = "v1"
        if parsed is None:
            print(f"  ❌ {postcode}/{room_type}: unrecognised schema — skipped, not fabricated")
            stats["skipped"].append((f"{postcode}/{room_type}", "unrecognised schema/status"))
            continue

        n = parsed["total_listings"]
        tier = tier_for_count(n)
        status = status_for_tier(tier)

        p25 = parsed["p25"] if tier == "large" else None
        p75 = parsed["p75"] if tier == "large" else None
        p50 = parsed["p50"] if tier in ("large", "medium") else None
        mean = parsed["mean"] if tier in ("large", "medium") else None
        min_rent = parsed["min_rent"] if tier in ("large", "medium") else None
        max_rent = parsed["max_rent"] if tier in ("large", "medium") else None

        thin_rents_json = None
        if tier == "thin":
            # insufficient_data rooms have no 'comparables' key on the analysis
            # JSON (parse_v2_room only populates it for complete/median_only
            # status) — the real per-listing rents live in raw_listings.json,
            # already loaded as raw_by_type for the large/medium bills-split.
            raw_listings = (raw_by_type or {}).get(room_type, [])
            rents = [l.get("rent_pcm") for l in raw_listings if l.get("rent_pcm") is not None]
            thin_rents_json = json.dumps(rents) if rents else None

        bi_count = bi_mean = be_count = be_mean = None
        if tier in ("large", "medium") and raw_by_type is not None:
            listings = raw_by_type.get(room_type, [])
            if listings:
                bi_count, bi_mean, be_count, be_mean = compute_bills_split(listings)

        comparables = (parsed.get("comparables") or [])[:5]
        # Strip fields outside the public/partner boundary (AC 18): no
        # advertiser contact details, no full street address.
        safe_comparables = []
        for c in comparables:
            safe_comparables.append({
                "ad_id": c.get("ad_id"),
                "rent": c.get("rent_pcm"),
                "bills_status": "included" if c.get("bills_included") else "excluded",
                "furnished": c.get("furnished"),
                "deposit": c.get("deposit_gbp"),
                "availability": c.get("available_from"),
            })
        comparables_json = json.dumps(safe_comparables) if safe_comparables else None

        conn.execute(
            """INSERT INTO rent_benchmarks
               (postcode_district, room_type, month, data_tier, status, total_listings,
                p25, p50, p75, mean, min_rent, max_rent,
                bills_included_count, bills_included_mean, bills_excluded_count, bills_excluded_mean,
                last_updated, schema_source_version, thin_listing_rents_json, comparables_json)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(postcode_district, room_type, month) DO UPDATE SET
                 data_tier=excluded.data_tier, status=excluded.status, total_listings=excluded.total_listings,
                 p25=excluded.p25, p50=excluded.p50, p75=excluded.p75, mean=excluded.mean,
                 min_rent=excluded.min_rent, max_rent=excluded.max_rent,
                 bills_included_count=excluded.bills_included_count, bills_included_mean=excluded.bills_included_mean,
                 bills_excluded_count=excluded.bills_excluded_count, bills_excluded_mean=excluded.bills_excluded_mean,
                 last_updated=excluded.last_updated, schema_source_version=excluded.schema_source_version,
                 thin_listing_rents_json=excluded.thin_listing_rents_json, comparables_json=excluded.comparables_json
            """,
            (postcode, room_type, month, tier, status, n,
             p25, p50, p75, mean, min_rent, max_rent,
             bi_count, bi_mean, be_count, be_mean,
             analysed_at, schema_version, thin_rents_json, comparables_json),
        )
        stats["rows_upserted"] += 1

    stats["districts_processed"] += 1


def backfill_zero_districts(source_dir: Path, conn: sqlite3.Connection, stats: dict) -> None:
    """Districts confirmed zero-listing in integrity coverage snapshots that
    have no analysis JSON of their own (AC 2)."""
    integrity_dir = source_dir / "integrity"
    if not integrity_dir.exists():
        return

    known = {row[0] for row in conn.execute("SELECT DISTINCT postcode_district FROM rent_benchmarks")}

    for f in sorted(integrity_dir.glob("*.json")):
        try:
            data = json.loads(f.read_text())
        except Exception as e:
            stats["skipped"].append((f.name, f"unparseable integrity file: {e}"))
            continue

        month = data.get("month") or month_from_iso(data.get("checked_at") or data.get("generated_at"))
        if not month:
            continue

        # Two shapes seen: {"counts": {district: n}} and {"districts": {district: {"listings": n}}}
        counts = {}
        if isinstance(data.get("counts"), dict):
            counts = data["counts"]
        elif isinstance(data.get("districts"), dict):
            counts = {d: v.get("listings", 0) for d, v in data["districts"].items() if isinstance(v, dict)}

        for district, n in counts.items():
            if n != 0:
                continue
            if district in known:
                continue  # has its own analysis JSON already (may not be zero — don't override real data)
            for room_type in ROOM_TYPES:
                conn.execute(
                    """INSERT OR IGNORE INTO rent_benchmarks
                       (postcode_district, room_type, month, data_tier, status, total_listings,
                        p25, p50, p75, mean, min_rent, max_rent,
                        bills_included_count, bills_included_mean, bills_excluded_count, bills_excluded_mean,
                        last_updated, schema_source_version, thin_listing_rents_json, comparables_json)
                       VALUES (?,?,?,?,?,?,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,?,?,NULL,NULL)
                    """,
                    (district, room_type, month, "zero", "no_data", 0,
                     data.get("checked_at") or data.get("generated_at"), "integrity_precheck"),
                )
                stats["rows_upserted"] += 1
            stats["zero_districts_backfilled"].add(district)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR,
                     help="Echo's memory/echo/ directory (default: ~/.openclaw/workspace/memory/echo)")
    ap.add_argument("--db-path", type=Path, default=DEFAULT_DB_PATH)
    args = ap.parse_args()

    source_dir = args.source_dir
    reports_dir = source_dir / "reports"
    if not reports_dir.exists():
        print(f"❌ Source reports dir not found: {reports_dir}")
        sys.exit(1)

    args.db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(args.db_path)
    conn.executescript(SCHEMA)

    stats = {
        "districts_processed": 0,
        "rows_upserted": 0,
        "skipped": [],
        "zero_districts_backfilled": set(),
    }

    EXCLUDE_DIRS = {"_integrity", "data", "screenshots", "target_vs_comparable"}
    analysis_files = sorted(
        p for p in reports_dir.glob("*/*_analysis.json")
        if p.parent.name not in EXCLUDE_DIRS
    )

    print(f"Found {len(analysis_files)} district analysis JSON files under {reports_dir}")
    for path in analysis_files:
        process_district_analysis(path, conn, stats)

    backfill_zero_districts(source_dir, conn, stats)

    conn.commit()

    total_districts = conn.execute("SELECT COUNT(DISTINCT postcode_district) FROM rent_benchmarks").fetchone()[0]
    total_rows = conn.execute("SELECT COUNT(*) FROM rent_benchmarks").fetchone()[0]

    print("\n=== ETL Run Summary ===")
    print(f"Districts with own analysis JSON processed: {stats['districts_processed']}")
    print(f"Zero-listing districts backfilled from integrity snapshots: {len(stats['zero_districts_backfilled'])}")
    print(f"Rows inserted/updated: {stats['rows_upserted']}")
    print(f"Total districts in DB: {total_districts}")
    print(f"Total rows in DB: {total_rows}")
    print(f"Districts/room-types skipped (unparseable, excluded — not fabricated): {len(stats['skipped'])}")
    for name, reason in stats["skipped"]:
        print(f"  - {name}: {reason}")
    print(f"\nDB written to: {args.db_path}")
    conn.close()


if __name__ == "__main__":
    main()
