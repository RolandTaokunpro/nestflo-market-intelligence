/**
 * Bundled data for the /marketdata landing page.
 *
 * Every figure here is the verified August 2026 national snapshot from the HMO
 * warehouse (via Echo's staging). Do not edit a number: AC-21 requires every
 * KPI, median, listing count, district count and percentage to match SPEC.md
 * §4.2 exactly, and every figure carries "August 2026" attribution.
 */

export const MD_TOKENS = {
  navy: '#050913',
  navyLight: '#1B0457',
  navyCard: '#150343',
  orange: '#FF5943',
  orangeDark: '#EF4F34',
  cyan: '#10A8E3',
  blue: '#4906D0',
  purple: '#7907EE',
  lavender: '#C7BFF0',
  grey: '#8E94B8',
  offwhite: '#EDECE8',
} as const;

export const MD_GRADIENT_BRAND = 'linear-gradient(135deg, #FF5943 0%, #EF4F34 100%)';
export const MD_GRADIENT_SIGNATURE =
  'linear-gradient(135deg, #2D009E 0%, #B3304A 55%, #EF4F34 100%)';

/** Same booking target the shared SPA Header uses (AC-2). */
export const DEMO_BOOKING_URL = 'https://calendar.app.google/KSQx4rG9L6ytS4je7';

/**
 * Canonical Nestflo tokens as scoped CSS custom properties. They are applied to
 * the landing page root only — the rest of the SPA keeps the old palette in
 * tailwind.config.js / index.css (SPEC.md §4.1, risk R1).
 */
export const MD_STYLE_VARS: Record<string, string> = {
  '--md-navy': MD_TOKENS.navy,
  '--md-navy-light': MD_TOKENS.navyLight,
  '--md-navy-card': MD_TOKENS.navyCard,
  '--md-orange': MD_TOKENS.orange,
  '--md-orange-dark': MD_TOKENS.orangeDark,
  '--md-cyan': MD_TOKENS.cyan,
  '--md-blue': MD_TOKENS.blue,
  '--md-purple': MD_TOKENS.purple,
  '--md-lavender': MD_TOKENS.lavender,
  '--md-grey': MD_TOKENS.grey,
  '--md-offwhite': MD_TOKENS.offwhite,
  '--md-gradient-brand': MD_GRADIENT_BRAND,
  '--md-gradient-signature': MD_GRADIENT_SIGNATURE,
};

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export type EditionStatus = 'available' | 'pilot' | 'coming';

export interface Edition {
  key: string;
  year: number;
  month: number;
  label: string;
  status: EditionStatus;
  note: string;
  slug?: string;
  latest?: boolean;
}

export const EDITIONS: Record<string, Edition> = {
  '2026-07': {
    key: '2026-07',
    year: 2026,
    month: 7,
    label: 'July 2026',
    status: 'pilot',
    note: 'Pilot edition · partial coverage',
    slug: 'marketdata-07-2026',
  },
  '2026-08': {
    key: '2026-08',
    year: 2026,
    month: 8,
    label: 'August 2026',
    status: 'available',
    note: '1,730 districts · 41,884 listings · P50 £652',
    slug: 'marketdata-08-2026',
    latest: true,
  },
  '2026-09': {
    key: '2026-09',
    year: 2026,
    month: 9,
    label: 'September 2026',
    status: 'coming',
    note: 'Crawl in progress',
  },
  '2026-10': {
    key: '2026-10',
    year: 2026,
    month: 10,
    label: 'October 2026',
    status: 'coming',
    note: 'Coming soon',
  },
  '2026-11': {
    key: '2026-11',
    year: 2026,
    month: 11,
    label: 'November 2026',
    status: 'coming',
    note: 'Coming soon',
  },
  '2026-12': {
    key: '2026-12',
    year: 2026,
    month: 12,
    label: 'December 2026',
    status: 'coming',
    note: 'Coming soon',
  },
};

/** Browsable edition years. 2027 ships as a disabled tab with no data (D6). */
export const EDITION_YEARS = [2026, 2027];

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** The 12 months of a year, synthesising "coming soon" for unpublished months. */
export function editionsForYear(year: number): Edition[] {
  return MONTH_NAMES.map((name, index) => {
    const month = index + 1;
    const key = monthKey(year, month);
    return (
      EDITIONS[key] ?? {
        key,
        year,
        month,
        label: `${name} ${year}`,
        status: 'coming' as const,
        note: 'Coming soon',
      }
    );
  });
}

export function latestEditionKey(): string {
  return Object.values(EDITIONS)
    .filter((edition) => edition.latest)
    .map((edition) => edition.key)[0];
}

export interface RoomRow {
  type: string;
  listings: string;
  p50: string;
}

export interface RankRow {
  area: string;
  p50: string;
}

export interface SnapshotKpi {
  id: string;
  value: string;
  label: string;
}

export interface Snapshot {
  key: string;
  label: string;
  subline: string;
  attribution: string;
  kpis: SnapshotKpi[];
  rooms: RoomRow[];
  highest: RankRow[];
  lowest: RankRow[];
  split: { agency: number; private: number };
}

export const AUGUST_2026: Snapshot = {
  key: '2026-08',
  label: 'August 2026',
  attribution: 'August 2026',
  subline:
    'August 2026 · 41,884 live listings across 1,730 postcode districts and 117 towns & cities.',
  kpis: [
    { id: 'median', value: '£652', label: 'National median (double room)' },
    { id: 'listings', value: '41,884', label: 'Live listings' },
    { id: 'districts', value: '1,730', label: 'Postcode districts' },
    { id: 'available', value: '65.6%', label: 'Available now' },
  ],
  rooms: [
    { type: 'Double', listings: '25,889', p50: '£652' },
    { type: 'Double en-suite', listings: '6,234', p50: '£695' },
    { type: 'Studio', listings: '1,705', p50: '£750' },
    { type: 'Single', listings: '5,165', p50: '£600' },
  ],
  highest: [
    { area: 'EC1 — East Central London', p50: '£1,104' },
    { area: 'N6 — Highgate', p50: '£956' },
    { area: "NW8 — St John's Wood", p50: '£956' },
  ],
  lowest: [
    { area: 'E20 — Stratford', p50: '£398' },
    { area: 'AB24 — Aberdeen', p50: '£420' },
    { area: 'HD1 — Huddersfield', p50: '£430' },
  ],
  split: { agency: 23.9, private: 76.1 },
};

/**
 * Published snapshots keyed by edition. A month only renders KPI figures when
 * its snapshot is present here — nothing is derived or interpolated (AC-21).
 */
export const SNAPSHOTS: Record<string, Snapshot> = {
  '2026-08': AUGUST_2026,
};

export interface CityCard {
  name: string;
  range: string;
  /** Slug of the /rents/{slug}/ archive page, or null when no page exists yet. */
  slug: string | null;
}

export interface CityRegion {
  id: string;
  label: string;
  cities: CityCard[];
}

/** The mockup's curated city cards, each mapped to a verified /rents/ page. */
export const CURATED_REGIONS: CityRegion[] = [
  {
    id: 'london',
    label: 'London · 8 areas',
    cities: [
      { name: 'North London', range: 'N1–N22', slug: 'north-london' },
      { name: 'East London', range: 'E1–E20', slug: 'east-london' },
      { name: 'East Central', range: 'EC1–EC4', slug: 'east-central-london' },
      { name: 'West Central', range: 'WC1–WC2', slug: 'west-central-london' },
      { name: 'North West', range: 'NW1–NW11', slug: 'north-west-london' },
      { name: 'South East', range: 'SE1–SE28', slug: 'south-east-london' },
      { name: 'South West', range: 'SW1–SW20', slug: 'south-west-london' },
      { name: 'West London', range: 'W1–W14', slug: 'west-london' },
    ],
  },
  {
    id: 'england',
    label: 'England · popular',
    cities: [
      { name: 'Birmingham', range: 'B1–B98', slug: 'birmingham' },
      { name: 'Bristol', range: 'BS1–BS49', slug: 'bristol' },
      { name: 'Manchester', range: 'M1–M46', slug: 'manchester' },
      { name: 'Leeds', range: 'LS1–LS29', slug: 'leeds' },
      { name: 'Sheffield', range: 'S1–S81', slug: 'sheffield' },
      { name: 'Liverpool', range: 'L1–L40', slug: 'liverpool' },
      { name: 'Nottingham', range: 'NG1–NG34', slug: 'nottingham' },
      { name: 'Brighton', range: 'BN1–BN45', slug: 'brighton' },
      { name: 'Reading', range: 'RG1–RG45', slug: 'reading' },
      { name: '+ 94 more cities', range: 'Coming soon', slug: null },
    ],
  },
  {
    id: 'scotland',
    label: 'Scotland',
    cities: [
      { name: 'Aberdeen', range: 'AB10–AB56', slug: 'aberdeen' },
      { name: 'Edinburgh', range: 'EH1–EH55', slug: 'edinburgh' },
      { name: 'Glasgow', range: 'G1–G84', slug: 'glasgow' },
      { name: 'Dundee', range: 'DD1–DD11', slug: 'dundee' },
    ],
  },
  {
    id: 'wales-ni',
    label: 'Wales & Northern Ireland',
    cities: [
      { name: 'Cardiff', range: 'CF3–CF83', slug: 'cardiff' },
      { name: 'Swansea', range: 'SA1–SA73', slug: 'swansea' },
      { name: 'Newport', range: 'NP4–NP44', slug: 'newport' },
      { name: 'Belfast', range: 'BT1–BT94', slug: 'belfast' },
    ],
  },
];

/**
 * City slugs that ship with this repo: the directories under
 * backend/static_marketdata/rents/ (116 towns and cities). Used to guarantee the
 * landing page never emits a dead /rents/ link (AC-14).
 */
export const KNOWN_CITY_SLUGS = new Set<string>([
  'aberdeen', 'bath', 'belfast', 'birmingham', 'blackburn', 'blackpool', 'bolton',
  'bournemouth', 'bradford', 'brighton', 'bristol', 'bromley', 'cambridge', 'canterbury',
  'cardiff', 'carlisle', 'chelmsford', 'chester', 'cleveland', 'colchester', 'coventry',
  'crewe', 'croydon', 'darlington', 'dartford', 'derby', 'doncaster', 'dorchester',
  'dudley', 'dumfries', 'dundee', 'durham', 'east-central-london', 'east-london',
  'edinburgh', 'enfield', 'exeter', 'falkirk', 'glasgow', 'gloucester', 'guildford',
  'halifax', 'harrogate', 'harrow', 'hemel-hempstead', 'hereford', 'huddersfield', 'hull',
  'ilford', 'inverness', 'ipswich', 'kilmarnock', 'kingston-upon-thames', 'kirkcaldy',
  'lancaster', 'leeds', 'leicester', 'lincoln', 'liverpool', 'llandudno', 'luton',
  'manchester', 'medway', 'milton-keynes', 'motherwell', 'newcastle-upon-tyne', 'newport',
  'north-london', 'north-west-london', 'northampton', 'norwich', 'nottingham', 'oldham',
  'oxford', 'paisley', 'perth', 'peterborough', 'plymouth', 'portsmouth', 'preston',
  'reading', 'redhill', 'romford', 'salisbury', 'sheffield', 'shrewsbury', 'slough',
  'south-east-london', 'south-west-london', 'southall', 'southampton', 'southend-on-sea',
  'st-albans', 'stevenage', 'stockport', 'stoke-on-trent', 'sunderland', 'sutton',
  'swansea', 'swindon', 'taunton', 'telford', 'tonbridge', 'torquay', 'truro', 'twickenham',
  'wakefield', 'walsall', 'warrington', 'watford', 'west-central-london', 'west-london',
  'wigan', 'wolverhampton', 'worcester', 'york',
]);
