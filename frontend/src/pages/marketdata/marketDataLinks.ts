/**
 * Pure link/search helpers for the /marketdata landing page.
 *
 * The report pages (/marketdata-MM-YYYY) and the district archive
 * (/rents/{city}/{district}/) are served by FastAPI, outside the SPA, so every
 * link here is a full-page href — never a react-router target and never the
 * mockup's hash links (SPEC.md risk R4, AC-12, AC-14).
 */

import { CITIES, getCityByPostcode, validatePostcode, type City } from '../../data/cities';
import { KNOWN_CITY_SLUGS } from './marketData';
import { KNOWN_DISTRICT_SLUGS } from './marketDataDistricts';
import { KNOWN_EDITION_KEYS } from './marketDataReports';

export type SuggestionKind = 'City' | 'District';

export interface Suggestion {
  label: string;
  sub: string;
  href: string;
  kind: SuggestionKind;
}

/**
 * `/marketdata-08-2026` for the `2026-08` edition key. Formatting only — this is
 * not the link contract. Emit month links with `reportHref`, which refuses any
 * edition whose report page does not ship.
 */
export function reportPath(editionKey: string): string {
  const [year, month] = editionKey.split('-');
  return `/marketdata-${month}-${year}`;
}

/**
 * A report page exists only when backend/static_pages/marketdata-MM-YYYY.html
 * ships (and backend/main.py registers its route). July 2026 has an edition but
 * no report page, so it must never be linked (AC-12, James QA R1).
 */
export function hasReportPage(editionKey: string | null | undefined): boolean {
  return typeof editionKey === 'string' && KNOWN_EDITION_KEYS.has(editionKey);
}

/**
 * Href for a month link, or null when no report page is shipped — the caller
 * then renders a non-navigating cell instead of a link that soft-404s.
 */
export function reportHref(editionKey: string | null | undefined): string | null {
  if (typeof editionKey !== 'string' || !hasReportPage(editionKey)) return null;
  return reportPath(editionKey);
}

/** `/rents/bristol/` */
export function cityPath(slug: string): string {
  return `/rents/${slug}/`;
}

/** `/rents/bristol/bs1/` */
export function districtPath(citySlug: string, district: string): string {
  return `/rents/${citySlug}/${district.toLowerCase()}/`;
}

export function hasCityPage(slug: string | null | undefined): boolean {
  return typeof slug === 'string' && KNOWN_CITY_SLUGS.has(slug);
}

/**
 * A district page exists only when its directory ships under
 * backend/static_marketdata/rents/{city}/{district}/ — postcodes such as BS12
 * are valid but have no archive page, so they must not be linked (AC-14).
 */
export function hasDistrictPage(
  citySlug: string | null | undefined,
  district: string | null | undefined
): boolean {
  if (typeof citySlug !== 'string' || typeof district !== 'string') return false;
  return KNOWN_DISTRICT_SLUGS.has(`${citySlug}/${district.toLowerCase()}`);
}

/** Href for a city card, or null when no archive page exists (ComingSoon fallback). */
export function cityCardHref(slug: string | null | undefined): string | null {
  return slug && hasCityPage(slug) ? cityPath(slug) : null;
}

export function slugifyCity(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * The two London postcode areas whose archive slug is not a plain slugification
 * of their name ("Central London (EC)" -> east-central-london).
 */
const SLUG_OVERRIDES: Record<string, string> = {
  EC: 'east-central-london',
  WC: 'west-central-london',
};

export function slugForCity(city: City): string {
  return SLUG_OVERRIDES[city.prefix] ?? slugifyCity(city.name);
}

function matchesCityName(city: City, query: string): boolean {
  const name = city.name.toLowerCase();
  const needle = query.toLowerCase();
  return name.startsWith(needle) || name.split(' ').some((word) => word.startsWith(needle));
}

/**
 * City/district suggestions for the hero search. Only entries with a real
 * /rents/ page are returned, so the dropdown can never offer a dead link.
 * A postcode whose district archive is missing (BS12, M10) falls back to the
 * always-live city page instead of 404ing (AC-14).
 */
export function searchSuggestions(query: string, limit = 5): Suggestion[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const upper = trimmed.toUpperCase();
  if (validatePostcode(upper)) {
    const city = getCityByPostcode(upper);
    if (!city) return [];
    const slug = slugForCity(city);
    if (!hasCityPage(slug)) return [];

    const sub = `${city.name} · ${city.postcodes.length} districts`;
    return hasDistrictPage(slug, upper)
      ? [
          {
            label: upper,
            sub,
            href: districtPath(slug, upper),
            kind: 'District',
          },
        ]
      : [
          {
            label: upper,
            sub,
            href: cityPath(slug),
            kind: 'City',
          },
        ];
  }

  return CITIES.filter((city) => matchesCityName(city, trimmed))
    .slice(0, limit)
    .flatMap((city) => {
      const href = cityCardHref(slugForCity(city));
      return href
        ? [
            {
              label: city.name,
              sub: `${city.region} · ${city.postcodes.length} districts`,
              href,
              kind: 'City' as const,
            },
          ]
        : [];
    });
}
