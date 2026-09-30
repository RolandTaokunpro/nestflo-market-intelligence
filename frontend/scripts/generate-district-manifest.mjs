#!/usr/bin/env node
/**
 * Regenerates src/pages/marketdata/marketDataDistricts.ts from the archive
 * directories that ship with this repo (backend/static_marketdata/rents/),
 * which FastAPI mounts at /rents/. The generated map is the proof that a
 * district page exists, so the landing-page search can never suggest a dead
 * link (SPEC.md AC-14, D7).
 *
 * Run from frontend/:  npm run generate:districts
 *
 * Re-run this whenever backend/static_marketdata/rents/ changes; the test
 * `AC-14 district manifest — the shipped archive is the only truth` fails if the
 * committed map drifts from the directories on disk.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const RENTS_ROOT = resolve(here, '../../backend/static_marketdata/rents');
const OUT = resolve(here, '../src/pages/marketdata/marketDataDistricts.ts');

/** A district directory is a lowercase postcode unit: bs1, m12, ec1, n16. */
const DISTRICT_DIR = /^[a-z]{1,2}\d{1,2}$/;

function collect() {
  const byCity = {};
  for (const city of readdirSync(RENTS_ROOT, { withFileTypes: true })) {
    if (!city.isDirectory()) continue;
    const districts = readdirSync(resolve(RENTS_ROOT, city.name), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && DISTRICT_DIR.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    if (districts.length > 0) byCity[city.name] = districts;
  }
  return byCity;
}

function render(byCity) {
  const cities = Object.keys(byCity).sort();
  const entries = cities.map((city) => {
    const districts = byCity[city].map((district) => `'${district}'`).join(', ');
    return `  '${city}': [${districts}],`;
  });
  const districtCount = cities.reduce((total, city) => total + byCity[city].length, 0);

  return `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Postcode districts that ship with this repo, keyed by city slug. Derived from
 * the directories under backend/static_marketdata/rents/, which FastAPI mounts at
 * /rents/ — a slug present here has a real archive page, so the landing-page
 * search can never emit a dead link (SPEC.md AC-14, ruling D7).
 *
 * Regenerate with:  npm run generate:districts
 * Verified against the directories on disk by frontend/tests/unit/marketData.test.ts.
 *
 * ${cities.length} cities, ${districtCount} districts.
 */

export const KNOWN_DISTRICTS: Record<string, readonly string[]> = {
${entries.join('\n')}
};

/** Flattened \`city/district\` slugs, e.g. \`bristol/bs1\`. */
export const KNOWN_DISTRICT_SLUGS: ReadonlySet<string> = new Set(
  Object.entries(KNOWN_DISTRICTS).flatMap(([city, districts]) =>
    districts.map((district) => \`\${city}/\${district}\`)
  )
);
`;
}

const byCity = collect();
writeFileSync(OUT, render(byCity), 'utf8');
const total = Object.values(byCity).reduce((sum, list) => sum + list.length, 0);
process.stdout.write(
  `marketDataDistricts.ts: ${Object.keys(byCity).length} cities, ${total} districts\n`
);
