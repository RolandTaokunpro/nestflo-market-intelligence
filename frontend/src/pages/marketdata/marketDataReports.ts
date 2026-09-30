/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Report pages that ship with this repo, derived from the
 * backend/static_pages/marketdata-MM-YYYY.html files that backend/main.py serves
 * as /marketdata-MM-YYYY. A month present here has a real, routed report page,
 * so the landing page can never emit a dead report link (SPEC.md AC-12, James QA R1).
 *
 * Regenerate with:  npm run generate:reports
 * Verified against the files on disk by frontend/tests/unit/marketData.test.ts.
 *
 * 1 report page: marketdata-08-2026.
 */

/** Slugs ('marketdata-MM-YYYY') of the shipped report pages. */
export const KNOWN_REPORT_SLUGS: ReadonlySet<string> = new Set(['marketdata-08-2026']);

/** The same pages as edition keys ('YYYY-MM', the EDITIONS key form). */
export const KNOWN_EDITION_KEYS: ReadonlySet<string> = new Set(['2026-08']);
