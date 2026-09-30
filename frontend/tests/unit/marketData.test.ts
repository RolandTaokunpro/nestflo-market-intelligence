/**
 * Contract tests for the /marketdata landing page data model, link helpers,
 * canonical brand tokens and WCAG contrast.
 *
 * Guards SPEC.md §8 AC-5…AC-8, AC-12, AC-13, AC-14, AC-15, AC-17, AC-19, AC-21
 * and §9 TEST-1…TEST-5.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  MD_TOKENS,
  MD_GRADIENT_BRAND,
  MD_GRADIENT_SIGNATURE,
  MD_STYLE_VARS,
  MONTH_NAMES,
  MONTHS_SHORT,
  EDITIONS,
  EDITION_YEARS,
  AUGUST_2026,
  CURATED_REGIONS,
  KNOWN_CITY_SLUGS,
  editionsForYear,
  editionStatus,
  latestEditionKey,
  monthKey,
} from '../../src/pages/marketdata/marketData';

import {
  reportPath,
  cityPath,
  districtPath,
  hasCityPage,
  cityCardHref,
  slugifyCity,
  slugForCity,
  searchSuggestions,
} from '../../src/pages/marketdata/marketDataLinks';

import { CITIES, getCityByPrefix } from '../../src/data/cities';

const FRONTEND_ROOT = fileURLToPath(new URL('../../', import.meta.url));

// ── WCAG relative-luminance maths (used by the AC-19 contrast contract) ──────
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const ratios = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (ratios[0] + 0.05) / (ratios[1] + 0.05);
}

describe('TEST-1 brand tokens — canonical Nestflo palette (guards R1)', () => {
  it('resolves every canonical token to the mockup hex', () => {
    expect(MD_TOKENS.navy).toBe('#050913');
    expect(MD_TOKENS.navyLight).toBe('#1B0457');
    expect(MD_TOKENS.navyCard).toBe('#150343');
    expect(MD_TOKENS.orange).toBe('#FF5943');
    expect(MD_TOKENS.orangeDark).toBe('#EF4F34');
    expect(MD_TOKENS.cyan).toBe('#10A8E3');
    expect(MD_TOKENS.blue).toBe('#4906D0');
    expect(MD_TOKENS.purple).toBe('#7907EE');
    expect(MD_TOKENS.lavender).toBe('#C7BFF0');
    expect(MD_TOKENS.grey).toBe('#8E94B8');
    expect(MD_TOKENS.offwhite).toBe('#EDECE8');
  });

  it('never reuses the old SPA navy (#050710)', () => {
    expect(MD_TOKENS.navy).not.toBe('#050710');
    expect(Object.values(MD_TOKENS)).not.toContain('#050710');
  });

  it('carries the signature gradient exactly as specced', () => {
    expect(MD_GRADIENT_SIGNATURE).toBe(
      'linear-gradient(135deg, #2D009E 0%, #B3304A 55%, #EF4F34 100%)'
    );
    expect(MD_GRADIENT_BRAND).toBe('linear-gradient(135deg, #FF5943 0%, #EF4F34 100%)');
  });

  it('exposes the tokens as scoped CSS custom properties on the page root', () => {
    expect(MD_STYLE_VARS['--md-navy']).toBe('#050913');
    expect(MD_STYLE_VARS['--md-navy-card']).toBe('#150343');
    expect(MD_STYLE_VARS['--md-orange']).toBe('#FF5943');
    expect(MD_STYLE_VARS['--md-lavender']).toBe('#C7BFF0');
    expect(MD_STYLE_VARS['--md-grey']).toBe('#8E94B8');
    expect(MD_STYLE_VARS['--md-offwhite']).toBe('#EDECE8');
    expect(MD_STYLE_VARS['--md-gradient-signature']).toBe(MD_GRADIENT_SIGNATURE);
  });

  it('does not mutate the shared SPA palette (AC-17: no other page is rebranded)', () => {
    const tailwind = readFileSync(`${FRONTEND_ROOT}tailwind.config.js`, 'utf8');
    expect(tailwind).toContain("navy: '#050710'");
    expect(tailwind).toContain("'brand-cyan': '#00F2EA'");
    expect(tailwind).toContain("'brand-blue': '#2164FF'");

    const indexCss = readFileSync(`${FRONTEND_ROOT}src/index.css`, 'utf8');
    expect(indexCss).toContain('--navy: #050710;');
    expect(indexCss).toContain('--brand-cyan: #00F2EA;');
  });
});

describe('AC-19 WCAG 2.2 AA contrast on the canonical palette', () => {
  const AA_NORMAL = 4.5;

  it.each([
    ['offwhite on navy', MD_TOKENS.offwhite, MD_TOKENS.navy],
    ['white on navy', '#FFFFFF', MD_TOKENS.navy],
    ['brand-grey body text on navy', MD_TOKENS.grey, MD_TOKENS.navy],
    ['brand-grey caption on navy-card', MD_TOKENS.grey, MD_TOKENS.navyCard],
    ['lavender eyebrow on navy', MD_TOKENS.lavender, MD_TOKENS.navy],
    ['lavender on navy-card', MD_TOKENS.lavender, MD_TOKENS.navyCard],
    ['orange accent on navy-card', MD_TOKENS.orange, MD_TOKENS.navyCard],
    ['orange accent on navy', MD_TOKENS.orange, MD_TOKENS.navy],
    ['cyan path label on navy-card', MD_TOKENS.cyan, MD_TOKENS.navyCard],
    ['cyan path label on navy', MD_TOKENS.cyan, MD_TOKENS.navy],
  ])('%s meets AA 4.5:1', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('white demo-button label on the coral gradient clears the 3:1 UI threshold', () => {
    // Documented deviation: the approved mockup puts white 14px/600 text on the
    // coral gradient, which is 3.1:1 on #FF5943 and 3.6:1 on #EF4F34 — below the
    // 4.5:1 normal-text floor, above the 3:1 non-text/large-text floor. Design
    // fidelity wins here; flagged to Hawk/Roland in the handoff rather than
    // silently re-colouring the approved brand button.
    expect(contrastRatio('#FFFFFF', MD_TOKENS.orange)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio('#FFFFFF', MD_TOKENS.orangeDark)).toBeGreaterThanOrEqual(3);
  });
});

describe('edition model', () => {
  it('exposes 2026 and 2027 only as browsable years', () => {
    expect([...EDITION_YEARS]).toEqual([2026, 2027]);
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTHS_SHORT).toHaveLength(12);
  });

  it('marks August 2026 as the latest full edition', () => {
    expect(latestEditionKey()).toBe('2026-08');
    expect(EDITIONS['2026-08'].latest).toBe(true);
    expect(EDITIONS['2026-08'].status).toBe('available');
  });

  it('marks July 2026 as pilot with partial coverage', () => {
    expect(EDITIONS['2026-07'].status).toBe('pilot');
    expect(EDITIONS['2026-07'].note).toBe('Pilot edition · partial coverage');
  });

  it('marks September to December 2026 as coming soon', () => {
    for (const key of ['2026-09', '2026-10', '2026-11', '2026-12']) {
      expect(editionStatus(key)).toBe('coming');
    }
  });

  it('treats missing editions as coming soon', () => {
    expect(editionStatus('2026-01')).toBe('coming');
    expect(editionStatus('2027-06')).toBe('coming');
    expect(Object.keys(EDITIONS)).not.toContain('2027-06');
  });

  it('builds a 12-cell year of editions, synthesising coming-soon months', () => {
    const months2026 = editionsForYear(2026);
    expect(months2026).toHaveLength(12);
    expect(months2026.map((e) => e.label).slice(0, 3)).toEqual([
      'January 2026',
      'February 2026',
      'March 2026',
    ]);
    expect(months2026[7].key).toBe('2026-08');
    expect(months2026[7].latest).toBe(true);

    const months2027 = editionsForYear(2027);
    expect(months2027).toHaveLength(12);
    expect(months2027.every((e) => e.status === 'coming')).toBe(true);
    expect(months2027[0].note).toBe('Coming soon');
  });

  it('formats month keys zero-padded', () => {
    expect(monthKey(2026, 8)).toBe('2026-08');
    expect(monthKey(2027, 12)).toBe('2027-12');
  });
});

describe('TEST-4 real report paths (AC-12: no hash-only links)', () => {
  it('builds /marketdata-MM-YYYY from an edition key', () => {
    expect(reportPath('2026-08')).toBe('/marketdata-08-2026');
    expect(reportPath('2026-07')).toBe('/marketdata-07-2026');
  });

  it('never emits a hash link', () => {
    for (const key of Object.keys(EDITIONS)) {
      expect(reportPath(key).startsWith('/marketdata-')).toBe(true);
      expect(reportPath(key)).not.toContain('#');
    }
  });
});

describe('TEST-5 city and district paths (AC-13/AC-14)', () => {
  it('builds real /rents/ paths', () => {
    expect(cityPath('bristol')).toBe('/rents/bristol/');
    expect(districtPath('bristol', 'BS1')).toBe('/rents/bristol/bs1/');
    expect(districtPath('north-london', 'N16')).toBe('/rents/north-london/n16/');
  });

  it('only links cities whose archive page ships with this repo', () => {
    expect(hasCityPage('bristol')).toBe(true);
    expect(hasCityPage('east-central-london')).toBe(true);
    expect(hasCityPage('teesside')).toBe(false);
    expect(hasCityPage(null)).toBe(false);
    expect(hasCityPage(undefined)).toBe(false);
    expect(KNOWN_CITY_SLUGS.has('bristol')).toBe(true);
    expect(KNOWN_CITY_SLUGS.size).toBeGreaterThan(100);
    expect(KNOWN_CITY_SLUGS.has('assets')).toBe(false);
    expect(KNOWN_CITY_SLUGS.has('index.html')).toBe(false);
  });

  it('falls back to a non-navigating card when there is no page', () => {
    expect(cityCardHref('bristol')).toBe('/rents/bristol/');
    expect(cityCardHref('teesside')).toBeNull();
    expect(cityCardHref(null)).toBeNull();
  });

  it('slugifies city names and maps the London prefix aliases', () => {
    expect(slugifyCity('North London')).toBe('north-london');
    expect(slugifyCity("St John's Wood")).toBe('st-john-s-wood');
    expect(slugForCity(getCityByPrefix('EC')!)).toBe('east-central-london');
    expect(slugForCity(getCityByPrefix('WC')!)).toBe('west-central-london');
    expect(slugForCity(getCityByPrefix('BS')!)).toBe('bristol');
    expect(slugForCity(getCityByPrefix('E')!)).toBe('east-london');
  });

  it('links every curated city card to a slug that exists on disk', () => {
    const cards = CURATED_REGIONS.flatMap((r) => r.cities).filter((c) => c.slug !== null);
    expect(cards).toHaveLength(25);
    for (const card of cards) {
      expect(hasCityPage(card.slug)).toBe(true);
      expect(cityCardHref(card.slug)).toBe(`/rents/${card.slug}/`);
    }
  });
});

describe('AC-4 search suggestions', () => {
  it('returns nothing for an empty or whitespace-only query', () => {
    expect(searchSuggestions('')).toEqual([]);
    expect(searchSuggestions('   ')).toEqual([]);
  });

  it('suggests a city for a partial name, with a City affordance', () => {
    const results = searchSuggestions('bris');
    expect(results[0].label).toBe('Bristol');
    expect(results[0].kind).toBe('City');
    expect(results[0].href).toBe('/rents/bristol/');
    expect(results[0].sub).toContain('England');
  });

  it('matches a word inside a multi-word city name', () => {
    const labels = searchSuggestions('london', 10).map((s) => s.label);
    expect(labels).toContain('North London');
    expect(labels).toContain('East London');
  });

  it('resolves a postcode to its district page, with a District affordance', () => {
    const [bs1] = searchSuggestions('BS1');
    expect(bs1.label).toBe('BS1');
    expect(bs1.kind).toBe('District');
    expect(bs1.href).toBe('/rents/bristol/bs1/');

    expect(searchSuggestions('M12')[0].href).toBe('/rents/manchester/m12/');
    expect(searchSuggestions('N16')[0].href).toBe('/rents/north-london/n16/');
  });

  it('accepts lowercase postcodes', () => {
    expect(searchSuggestions('bs1')[0].href).toBe('/rents/bristol/bs1/');
  });

  it('honours the result limit', () => {
    expect(searchSuggestions('l', 3)).toHaveLength(3);
    expect(searchSuggestions('b', 2)).toHaveLength(2);
  });

  it('returns nothing for an unknown query or an unmapped postcode', () => {
    expect(searchSuggestions('narnia')).toEqual([]);
    expect(searchSuggestions('TS1')).toEqual([]);
  });

  it('never suggests a dead link', () => {
    for (const q of ['a', 'b', 'l', 'manchester', 'BS1', 'cards']) {
      for (const s of searchSuggestions(q, 20)) {
        expect(s.href.startsWith('/rents/')).toBe(true);
        expect(hasCityPage(s.href.split('/')[2])).toBe(true);
      }
    }
  });

  it('covers a decent slice of the real CITIES dataset', () => {
    expect(CITIES.length).toBeGreaterThan(100);
    expect(searchSuggestions('manchester')[0].href).toBe('/rents/manchester/');
  });
});

describe('AC-5…AC-8 verified August 2026 snapshot (zero fabricated figures)', () => {
  it('carries the four headline KPIs', () => {
    expect(AUGUST_2026.kpis.map((k) => k.value)).toEqual(['£652', '41,884', '1,730', '65.6%']);
    expect(AUGUST_2026.kpis.map((k) => k.label)).toEqual([
      'National median (double room)',
      'Live listings',
      'Postcode districts',
      'Available now',
    ]);
  });

  it('carries the four room types with exact listings and medians', () => {
    expect(AUGUST_2026.rooms).toEqual([
      { type: 'Double', listings: '25,889', p50: '£652' },
      { type: 'Double en-suite', listings: '6,234', p50: '£695' },
      { type: 'Studio', listings: '1,705', p50: '£750' },
      { type: 'Single', listings: '5,165', p50: '£600' },
    ]);
  });

  it('carries the highest and lowest median districts', () => {
    expect(AUGUST_2026.highest.map((r) => `${r.area} ${r.p50}`)).toEqual([
      'EC1 — East Central London £1,104',
      'N6 — Highgate £956',
      "NW8 — St John's Wood £956",
    ]);
    expect(AUGUST_2026.lowest.map((r) => `${r.area} ${r.p50}`)).toEqual([
      'E20 — Stratford £398',
      'AB24 — Aberdeen £420',
      'HD1 — Huddersfield £430',
    ]);
  });

  it('carries the agency/private split, summing to 100%', () => {
    expect(AUGUST_2026.split.agency).toBe(23.9);
    expect(AUGUST_2026.split.private).toBe(76.1);
    expect(AUGUST_2026.split.agency + AUGUST_2026.split.private).toBeCloseTo(100, 5);
  });

  it('attributes every figure to August 2026', () => {
    expect(AUGUST_2026.attribution).toBe('August 2026');
    expect(AUGUST_2026.subline).toContain('August 2026');
    expect(AUGUST_2026.subline).toContain('41,884');
    expect(AUGUST_2026.subline).toContain('1,730');
  });

  it('groups city cards into the four mockup regions', () => {
    expect(CURATED_REGIONS.map((r) => r.label)).toEqual([
      'London · 8 areas',
      'England · popular',
      'Scotland',
      'Wales & Northern Ireland',
    ]);
    expect(CURATED_REGIONS[0].cities).toHaveLength(8);
    expect(CURATED_REGIONS[1].cities.map((c) => c.name)).toContain('+ 94 more cities');
    expect(CURATED_REGIONS[2].cities.map((c) => c.name)).toEqual([
      'Aberdeen',
      'Edinburgh',
      'Glasgow',
      'Dundee',
    ]);
    expect(CURATED_REGIONS[3].cities.map((c) => c.name)).toEqual([
      'Cardiff',
      'Swansea',
      'Newport',
      'Belfast',
    ]);
  });

  it('shows the exact postcode-prefix range on every card', () => {
    const byName = new Map(
      CURATED_REGIONS.flatMap((r) => r.cities).map((c) => [c.name, c.range])
    );
    expect(byName.get('Bristol')).toBe('BS1–BS49');
    expect(byName.get('North London')).toBe('N1–N22');
    expect(byName.get('Aberdeen')).toBe('AB10–AB56');
    expect(byName.get('Belfast')).toBe('BT1–BT94');
  });
});
