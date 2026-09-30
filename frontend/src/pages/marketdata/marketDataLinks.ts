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

export type SuggestionKind = 'City' | 'District';

export interface Suggestion {
  label: string;
  sub: string;
  href: string;
  kind: SuggestionKind;
}

/** `/marketdata-08-2026` for the `2026-08` edition key. */
export function reportPath(editionKey: string): string {
  const [year, month] = editionKey.split('-');
  return `/marketdata-${month}-${year}`;
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
 */
export function searchSuggestions(query: string, limit = 5): Suggestion[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const upper = trimmed.toUpperCase();
  if (validatePostcode(upper)) {
    const city = getCityByPostcode(upper);
    if (!city) return [];
    const slug = slugForCity(city);
    return hasCityPage(slug)
      ? [
          {
            label: upper,
            sub: `${city.name} · ${city.postcodes.length} districts`,
            href: districtPath(slug, upper),
            kind: 'District',
          },
        ]
      : [];
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
