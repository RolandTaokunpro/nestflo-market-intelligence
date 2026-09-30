#!/usr/bin/env node
/**
 * Regenerates src/pages/marketdata/marketDataReports.ts from the report pages
 * that ship with this repo (backend/static_pages/marketdata-MM-YYYY.html),
 * which backend/main.py serves one route per month as /marketdata-MM-YYYY.
 * The generated map is the proof that a month link resolves, so the landing
 * page can never emit a dead report link (SPEC.md AC-12, James QA R1).
 *
 * Run from frontend/:  npm run generate:reports
 *
 * Re-run this whenever backend/static_pages/ changes; the test
 * "AC-12 report manifest — the shipped static page is the only truth" fails if
 * the committed map drifts from the files on disk, or if a month is marked
 * navigable without a report page (and vice versa).
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const STATIC_PAGES = resolve(here, '../../backend/static_pages');
const OUT = resolve(here, '../src/pages/marketdata/marketDataReports.ts');

/** A report page is marketdata-MM-YYYY.html — the /marketdata-MM-YYYY route. */
const REPORT_HTML = /^marketdata-(\d{2})-(\d{4})\.html$/;

function collect() {
  return readdirSync(STATIC_PAGES, { withFileTypes: true })
    .filter((entry) => entry.isFile() && REPORT_HTML.test(entry.name))
    .map((entry) => {
      const [, month, year] = entry.name.match(REPORT_HTML);
      return { slug: entry.name.replace(/\.html$/, ''), key: `${year}-${month}` };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

function render(reports) {
  const slugs = reports.map((report) => `'${report.slug}'`).join(', ');
  const keys = reports.map((report) => `'${report.key}'`).join(', ');
  const shipped = reports.map((report) => report.slug).join(', ');
  const noun = reports.length === 1 ? 'report page' : 'report pages';

  return `/**
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
 * ${reports.length} ${noun}: ${shipped}.
 */

/** Slugs ('marketdata-MM-YYYY') of the shipped report pages. */
export const KNOWN_REPORT_SLUGS: ReadonlySet<string> = new Set([${slugs}]);

/** The same pages as edition keys ('YYYY-MM', the EDITIONS key form). */
export const KNOWN_EDITION_KEYS: ReadonlySet<string> = new Set([${keys}]);
`;
}

const reports = collect();
writeFileSync(OUT, render(reports), 'utf8');
process.stdout.write(
  `marketDataReports.ts: ${reports.length} report pages (${reports
    .map((report) => report.slug)
    .join(', ')})\n`
);
