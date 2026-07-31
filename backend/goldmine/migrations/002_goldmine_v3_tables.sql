-- 002_goldmine_v3_tables.sql
-- Goldmine Finder v3 — Supabase migration (spec t_324f79e6 Deploy Notes).
-- New tables: goldmine_listings, goldmine_landlords.
-- Additive only: no existing table is altered. Rollback: drop both tables
-- (see bottom). Target: Supabase Postgres (project woizfpsocqvzuerdseys).
--
-- NOTE (deploy-time reality): the v3 code shipped in this release does NOT
-- read/write these tables yet — the crawler/store integration is a separate
-- feature with its own Gherkin scenarios (Linus t_3c153a7e, CLAUDE.md
-- "Explicitly NOT built"). This migration provisions the schema per the
-- spec's Deploy Notes so the store integration has a landing zone.
--
-- Pipeline writes use the service role key (bypasses RLS by design).
-- Client (anon/authenticated) access is read-only via the policies below.
-- RLS is required by spec Security Requirements for both tables.

-- ────────────────────────────────────────────────────────────────────────
-- Tables
-- ────────────────────────────────────────────────────────────────────────

create table if not exists goldmine_listings (
    id uuid primary key default gen_random_uuid(),
    spareroom_ad_id text not null unique,
    url text not null,
    title text,
    postcode_district text not null,
    room_type text,
    advertiser_name text,
    rent_pcm numeric,
    original_rent_pcm numeric,          -- strikethrough capture (R7)
    available_now boolean,
    available_from date,
    description_text text,
    tenant_prefs jsonb,                 -- {couples_ok, pets_ok, dss_ok, short_term_ok}
    photo_urls jsonb,
    composite_score integer check (composite_score between 0 and 100),
    tier text check (tier in ('gold','silver','watch','none')),
    signals jsonb,                      -- per-signal points/flag/status/evidence
    scoring_version text,
    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create table if not exists goldmine_landlords (
    id uuid primary key default gen_random_uuid(),
    advertiser_name text not null unique,
    active_listing_count integer not null default 0,
    listings jsonb,                     -- spareroom_ad_ids in portfolio
    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────
-- RLS (spec Security Requirements: RLS required on both tables)
-- ────────────────────────────────────────────────────────────────────────

alter table goldmine_listings enable row level security;
alter table goldmine_landlords enable row level security;

-- Read-only for authenticated users; service role (pipeline) bypasses RLS.
create policy goldmine_listings_select on goldmine_listings
    for select using (true);

create policy goldmine_landlords_select on goldmine_landlords
    for select using (true);

-- No insert/update/delete policies for client roles: only the service role
-- writes. Service role bypasses RLS.

-- ────────────────────────────────────────────────────────────────────────
-- Rollback (documented for Deploy Notes / t_aefed00f)
-- ────────────────────────────────────────────────────────────────────────
-- drop policy if exists goldmine_landlords_select on goldmine_landlords;
-- drop policy if exists goldmine_listings_select on goldmine_listings;
-- drop table if exists goldmine_landlords;
-- drop table if exists goldmine_listings;
