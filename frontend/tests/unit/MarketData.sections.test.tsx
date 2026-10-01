/**
 * Section-level contract tests for the /marketdata landing page.
 * Covers SPEC.md §8 AC-1…AC-18 through the assembled page (plus the
 * navigator interactions AC-9/AC-10 and the link contracts TEST-3/4/5).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import MarketData from '../../src/pages/MarketData';
import { hasReportPage } from '../../src/pages/marketdata/marketDataLinks';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/marketdata']}>
      <MarketData />
    </MemoryRouter>
  );
}

afterEach(() => cleanup());

describe('AC-2 header — coral N logo and Book a Demo', () => {
  it('renders the coral "N" mark and the Nestflo wordmark', () => {
    renderPage();
    const banner = screen.getByRole('banner');
    const logo = within(banner).getByTestId('md-logo');
    expect(logo.tagName.toLowerCase()).toBe('svg');
    const fills = Array.from(logo.querySelectorAll('path')).map((p) => p.getAttribute('fill'));
    expect(fills).toEqual(['#FF5943', '#FF5943']);
    expect(banner).toHaveTextContent('Nestflo');
  });

  it('links Book a Demo to the Calendly booking URL', () => {
    renderPage();
    const demo = within(screen.getByRole('banner')).getByRole('link', { name: /book a demo/i });
    expect(demo).toHaveAttribute('href', 'https://calendly.com/roland-tao-kunpro/30min');
  });
});

describe('AC-3/AC-4 hero copy and search interaction', () => {
  it('renders the eyebrow, H1, search placeholder and hint', () => {
    renderPage();
    const hero = screen.getByTestId('md-sec-hero');
    expect(hero).toHaveTextContent('HMO Market Intelligence');
    expect(within(hero).getByRole('heading', { level: 1 })).toHaveTextContent(
      'Know what every room is worth, in any district, any month.'
    );
    expect(
      within(hero).getByPlaceholderText(
        'Search a city or postcode — e.g. Bristol, BS1, M12, N16'
      )
    ).toBeInTheDocument();
    expect(hero).toHaveTextContent(
      "Type a city name or postcode — we'll take you straight to that district's data."
    );
    expect(hero).toHaveTextContent('1,730 postcode districts');
  });

  it('opens a suggestion dropdown while typing and closes it when cleared', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByPlaceholderText(
      'Search a city or postcode — e.g. Bristol, BS1, M12, N16'
    );

    expect(screen.queryByRole('listbox')).toBeNull();

    await user.type(input, 'Bristol');
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getAllByRole('option').length).toBeGreaterThan(0);
    expect(listbox).toHaveTextContent('Bristol');
    expect(listbox).toHaveTextContent('City →');
    expect(within(listbox).getByRole('link', { name: /Bristol/ })).toHaveAttribute(
      'href',
      '/rents/bristol/'
    );

    await user.clear(input);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('never opens the dropdown for whitespace-only input', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByPlaceholderText(
      'Search a city or postcode — e.g. Bristol, BS1, M12, N16'
    );
    await user.type(input, '   ');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('suggests a district page with a "District →" affordance for a postcode', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByPlaceholderText(
      'Search a city or postcode — e.g. Bristol, BS1, M12, N16'
    );
    await user.type(input, 'BS1');
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveTextContent('District →');
    expect(within(listbox).getByRole('link', { name: /BS1/ })).toHaveAttribute(
      'href',
      '/rents/bristol/bs1/'
    );
  });

  it('shows an empty-state row when nothing matches', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByPlaceholderText(
      'Search a city or postcode — e.g. Bristol, BS1, M12, N16'
    );
    await user.type(input, 'zzzz');
    expect(screen.getByRole('listbox')).toHaveTextContent('No matching city or district.');
  });
});

describe('AC-5…AC-8 national insight panel', () => {
  it('shows the four headline KPIs, each attributed to August 2026', () => {
    renderPage();
    const cases = [
      ['md-kpi-median', '£652', 'National median (double room)'],
      ['md-kpi-listings', '41,884', 'Live listings'],
      ['md-kpi-districts', '1,730', 'Postcode districts'],
      ['md-kpi-available', '65.6%', 'Available now'],
    ] as const;

    for (const [testId, value, label] of cases) {
      const kpi = screen.getByTestId(testId);
      expect(kpi).toHaveTextContent(value);
      expect(kpi).toHaveTextContent(label);
      expect(kpi).toHaveTextContent('August 2026');
    }
  });

  it('states the edition sub-line with attribution', () => {
    renderPage();
    expect(screen.getByTestId('md-insight-sub')).toHaveTextContent(
      'August 2026 · 41,884 live listings across 1,730 postcode districts and 117 towns & cities.'
    );
  });

  it('shows the room-type table with exact listings and medians', () => {
    renderPage();
    const table = screen.getByTestId('md-roomtable');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(5);

    expect(rows[0]).toHaveTextContent('Room type');
    expect(rows[0]).toHaveTextContent('Listings');
    expect(rows[0]).toHaveTextContent('Median P50');

    const expected = [
      ['Double', '25,889', '£652'],
      ['Double en-suite', '6,234', '£695'],
      ['Studio', '1,705', '£750'],
      ['Single', '5,165', '£600'],
    ];
    expected.forEach(([type, listings, p50], i) => {
      expect(rows[i + 1]).toHaveTextContent(type);
      expect(rows[i + 1]).toHaveTextContent(listings);
      expect(rows[i + 1]).toHaveTextContent(p50);
    });
  });

  it('shows the highest and lowest median districts', () => {
    renderPage();
    const rows = within(screen.getByTestId('md-ranklist')).getAllByTestId('md-rank-row');
    expect(rows).toHaveLength(6);
    const expected = [
      ['EC1 — East Central London', '£1,104'],
      ['N6 — Highgate', '£956'],
      ["NW8 — St John's Wood", '£956'],
      ['E20 — Stratford', '£398'],
      ['AB24 — Aberdeen', '£420'],
      ['HD1 — Huddersfield', '£430'],
    ];
    expected.forEach(([area, p50], i) => {
      expect(rows[i]).toHaveTextContent(area);
      expect(rows[i]).toHaveTextContent(p50);
    });
    expect(screen.getByTestId('md-sec-insight')).toHaveTextContent(
      'Highest & lowest median (double room)'
    );
  });

  it('shows the agency/private split bar summing to 100%', () => {
    renderPage();
    const bar = screen.getByTestId('md-splitbar');
    const agency = within(bar).getByTestId('md-split-agency');
    const privat = within(bar).getByTestId('md-split-private');
    expect(agency).toHaveStyle({ width: '23.9%' });
    expect(privat).toHaveStyle({ width: '76.1%' });
    expect(screen.getByTestId('md-sec-insight')).toHaveTextContent('Agency 23.9%');
    expect(screen.getByTestId('md-sec-insight')).toHaveTextContent('Private 76.1%');
  });

  it('renders the insight empty state only when the edition is not available', () => {
    renderPage();
    expect(screen.queryByTestId('md-insight-empty')).toBeNull();
  });
});

describe('AC-9/AC-10 edition navigator', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    renderPage();
  });

  const insight = () => screen.getByTestId('md-sec-insight');

  it('shows 2026/2027 year tabs and marks each month of the selected year', () => {
    expect(within(insight()).getByRole('button', { name: '2026' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(insight()).getByRole('button', { name: '2027' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    expect(within(insight()).getByTestId('md-pill-2026-08')).toHaveAttribute(
      'aria-label',
      'August 2026 — Latest edition'
    );
    // July carries approved pilot copy, but no marketdata-07-2026 report page
    // ships (QA R1), so the pill is a disabled coming-soon entry like the rest.
    expect(within(insight()).getByTestId('md-pill-2026-07')).toHaveAttribute(
      'aria-label',
      'July 2026 — Coming soon'
    );
    for (const month of ['01', '02', '03', '04', '05', '06', '07', '09', '10', '11', '12']) {
      const pill = within(insight()).getByTestId(`md-pill-2026-${month}`);
      expect(pill).toHaveAttribute('aria-label', expect.stringContaining('Coming soon'));
      expect(pill).toBeDisabled();
    }
    expect(within(insight()).getByTestId('md-pill-2026-09')).toHaveTextContent('September');
  });

  it('renders the empty state for a coming-soon month and jumps back to the latest edition', async () => {
    await user.click(within(insight()).getByRole('button', { name: '2027' }));

    expect(screen.getByTestId('md-insight-empty')).toBeInTheDocument();
    expect(screen.getByTestId('md-empty-title')).toHaveTextContent('January 2027');
    expect(screen.getByTestId('md-empty-note')).toHaveTextContent('Coming soon');
    expect(screen.getByTestId('md-empty-sub')).toHaveTextContent(
      'August 2026 is the latest full edition.'
    );
    expect(screen.queryByTestId('md-kpi-median')).toBeNull();

    await user.click(within(insight()).getByRole('button', { name: 'View latest edition' }));

    expect(screen.getByTestId('md-kpi-median')).toHaveTextContent('£652');
    expect(within(insight()).getByRole('button', { name: '2026' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(insight()).getByTestId('md-pill-2026-08')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('does not offer July 2026 as a selectable edition while its report page is missing', async () => {
    // QA R1: July used to be selectable and showed a "pilot" empty state, which
    // implied a July edition a visitor could read. No marketdata-07-2026 report
    // page exists, so the pill is disabled and the navigator stays on August.
    const july = within(insight()).getByTestId('md-pill-2026-07');
    expect(july).toBeDisabled();
    expect(july).toHaveAttribute('aria-pressed', 'false');
    expect(july).toHaveClass('md-coming');

    await user.click(within(insight()).getByTestId('md-pill-2026-08'));
    expect(screen.getByTestId('md-kpi-median')).toHaveTextContent('£652');
    expect(screen.queryByTestId('md-insight-empty')).toBeNull();
    expect(screen.getByTestId('md-insight-sub')).toHaveTextContent('August 2026');
    expect(within(insight()).getByTestId('md-pill-2026-07')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('re-selects the latest available edition when switching year back to 2026', async () => {
    await user.click(within(insight()).getByRole('button', { name: '2027' }));
    expect(screen.getByTestId('md-insight-empty')).toBeInTheDocument();

    await user.click(within(insight()).getByRole('button', { name: '2026' }));
    expect(screen.getByTestId('md-kpi-median')).toHaveTextContent('£652');
    expect(within(insight()).getByRole('button', { name: '2026' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('marks every 2027 month as coming soon and disabled', async () => {
    await user.click(within(insight()).getByRole('button', { name: '2027' }));
    for (let month = 1; month <= 12; month += 1) {
      const key = `2027-${String(month).padStart(2, '0')}`;
      const pill = within(insight()).getByTestId(`md-pill-${key}`);
      expect(pill).toBeDisabled();
    }
  });
});

describe('AC-11/AC-12 monthly snapshots grid', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    renderPage();
  });

  const snapshots = () => screen.getByTestId('md-sec-snapshots');

  it('shows year tabs and a 12-cell grid for the selected year', () => {
    expect(within(snapshots()).getByRole('button', { name: '2026' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(snapshots()).getByRole('button', { name: '2027' })).toBeInTheDocument();
    expect(within(snapshots()).getAllByTestId(/^md-cell-/)).toHaveLength(12);
  });

  it('marks August latest, July unlinked and the rest coming soon', () => {
    const august = screen.getByTestId('md-cell-2026-08');
    expect(august.tagName).toBe('A');
    expect(august).toHaveAttribute('href', '/marketdata-08-2026');
    expect(august).toHaveTextContent('Latest snapshot');

    // QA R1: no marketdata-07-2026.html ships, so July is not a link — a dead
    // href here soft-404s through the SPA catch-all.
    const july = screen.getByTestId('md-cell-2026-07');
    expect(july.tagName).toBe('DIV');
    expect(july).toHaveAttribute('aria-disabled', 'true');
    expect(july).not.toHaveAttribute('href');
    expect(july).toHaveTextContent('Pilot edition · partial coverage');

    const september = screen.getByTestId('md-cell-2026-09');
    expect(september.tagName).toBe('DIV');
    expect(september).toHaveAttribute('aria-disabled', 'true');
    expect(september).toHaveTextContent('Crawl in progress');

    for (const month of ['01', '02', '03', '04', '05', '06', '10', '11', '12']) {
      const cell = screen.getByTestId(`md-cell-2026-${month}`);
      expect(cell.tagName).toBe('DIV');
      expect(cell).toHaveAttribute('aria-disabled', 'true');
      expect(cell).toHaveTextContent('Coming soon');
    }
  });

  it('emits no /marketdata- link for a month whose report page does not ship (QA R1)', () => {
    const monthLinks = Array.from(document.querySelectorAll('a[href^="/marketdata-"]'));
    expect(monthLinks.length).toBeGreaterThan(0);
    for (const link of monthLinks) {
      const slug = (link.getAttribute('href') ?? '').slice(1);
      const [, month, year] = slug.split('-');
      expect(hasReportPage(`${year}-${month}`)).toBe(true);
    }
    // The direction that failed QA: July is present as a cell, never as a link.
    const july = screen.getByTestId('md-cell-2026-07');
    expect(july.tagName).not.toBe('A');
    expect(document.querySelectorAll('a[href="/marketdata-07-2026"]')).toHaveLength(0);
  });

  it('renders all 12 months of 2027 as disabled with no links', () => {
    return user.click(within(snapshots()).getByRole('button', { name: '2027' })).then(() => {
      const cells = within(snapshots()).getAllByTestId(/^md-cell-2027-/);
      expect(cells).toHaveLength(12);
      for (const cell of cells) {
        expect(cell.tagName).toBe('DIV');
        expect(cell).toHaveAttribute('aria-disabled', 'true');
      }
      expect(within(snapshots()).queryAllByRole('link')).toHaveLength(0);
    });
  });

  it('shows the four-way legend', () => {
    const legend = screen.getByTestId('md-legend');
    expect(legend).toHaveTextContent('Available');
    expect(legend).toHaveTextContent('Latest snapshot');
    expect(legend).toHaveTextContent('Pilot (partial coverage)');
    expect(legend).toHaveTextContent('Coming soon');
  });

  it('emits no hash-only or empty links anywhere on the page', () => {
    renderPage();
    expect(document.querySelectorAll('a[href="#"]')).toHaveLength(0);
    expect(document.querySelectorAll('a[href^="#marketdata"]')).toHaveLength(0);
    for (const link of Array.from(document.querySelectorAll('a'))) {
      expect(link.getAttribute('href')).toBeTruthy();
    }
  });
});

describe('AC-13/AC-14 rents by city', () => {
  it('groups city cards into the four regions', () => {
    renderPage();
    expect(within(screen.getByTestId('md-region-london')).getAllByTestId('md-city-card')).toHaveLength(8);
    expect(screen.getByTestId('md-region-london')).toHaveTextContent('London · 8 areas');
    expect(screen.getByTestId('md-region-england')).toHaveTextContent('England · popular');
    expect(screen.getByTestId('md-region-scotland')).toHaveTextContent('Scotland');
    expect(screen.getByTestId('md-region-wales-ni')).toHaveTextContent(
      'Wales & Northern Ireland'
    );
  });

  it('shows each city name with its postcode-prefix range', () => {
    renderPage();
    const bristol = screen.getByRole('link', { name: /Bristol/ });
    expect(bristol).toHaveAttribute('href', '/rents/bristol/');
    expect(bristol).toHaveTextContent('BS1–BS49');
    expect(screen.getByRole('link', { name: /Aberdeen/ })).toHaveTextContent('AB10–AB56');
  });

  it('links all 25 curated cities through full-page anchors', () => {
    renderPage();
    const cards = screen.getAllByTestId('md-city-card');
    expect(cards).toHaveLength(25);
    for (const card of cards) {
      expect(card.tagName).toBe('A');
      expect(card.getAttribute('href')).toMatch(/^\/rents\/[a-z-]+\/$/);
    }
  });

  it('renders a non-navigating Coming soon card when no page exists', () => {
    renderPage();
    const soon = screen.getByTestId('md-city-soon');
    expect(soon.tagName).toBe('SPAN');
    expect(soon).toHaveAttribute('aria-disabled', 'true');
    expect(soon).toHaveTextContent('+ 94 more cities');
    expect(soon).toHaveTextContent('Coming soon');
  });
});

describe('AC-15 navigation steps', () => {
  it('shows three levels linking to real paths', () => {
    renderPage();
    const steps = screen.getByTestId('md-sec-steps');
    expect(within(steps).getByTestId('md-step-1')).toHaveTextContent('Level 1');
    expect(within(steps).getByTestId('md-step-1')).toHaveTextContent('Month & year');
    expect(within(steps).getByRole('link', { name: '/marketdata-08-2026' })).toHaveAttribute(
      'href',
      '/marketdata-08-2026'
    );
    expect(within(steps).getByTestId('md-step-2')).toHaveTextContent('City');
    expect(within(steps).getByRole('link', { name: '/rents/bristol/' })).toHaveAttribute(
      'href',
      '/rents/bristol/'
    );
    expect(within(steps).getByTestId('md-step-3')).toHaveTextContent('Postcode district');
    expect(within(steps).getByRole('link', { name: '/rents/bristol/bs1/' })).toHaveAttribute(
      'href',
      '/rents/bristol/bs1/'
    );
  });
});

describe('AC-16 footer', () => {
  it('shows brand, contact details and both link columns', () => {
    renderPage();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByTestId('md-logo')).toBeInTheDocument();
    expect(footer).toHaveTextContent('Nestflo');
    expect(footer).toHaveTextContent('Proudly built in Bristol, UK.');
    expect(within(footer).getByRole('link', { name: 'hello@nestflo.ai' })).toHaveAttribute(
      'href',
      'mailto:hello@nestflo.ai'
    );
    expect(within(footer).getByRole('link', { name: '0330 133 8626' })).toHaveAttribute(
      'href',
      'tel:03301338626'
    );
    expect(footer).toHaveTextContent('Products');
    expect(within(footer).getByRole('link', { name: 'HMO Market Reports' })).toHaveAttribute(
      'href',
      '/market-reports'
    );
    expect(within(footer).getByRole('link', { name: 'Target vs Comparables' })).toHaveAttribute(
      'href',
      '/target-vs-comparable'
    );
    expect(within(footer).getByRole('link', { name: 'Market Data' })).toHaveAttribute(
      'href',
      '/marketdata'
    );
    expect(within(footer).getByRole('link', { name: 'District Rents Archive' })).toHaveAttribute(
      'href',
      '/rents/'
    );
    expect(footer).toHaveTextContent('Company');
    expect(within(footer).getByRole('link', { name: 'Terms & Conditions' })).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'Cookie Policy' })).toBeInTheDocument();
  });
});

describe('AC-18/AC-19 render hygiene and keyboard access', () => {
  it('emits no console errors or warnings', () => {
    const errors: unknown[][] = [];
    const warns: unknown[][] = [];
    const errorSpy = vi_spy('error', errors);
    const warnSpy = vi_spy('warn', warns);
    try {
      renderPage();
      expect(errors).toEqual([]);
      expect(warns).toEqual([]);
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('gives every interactive element an accessible name and keeps it focusable', () => {
    const { container } = renderPage();
    const interactive = Array.from(container.querySelectorAll('a, button'));
    expect(interactive.length).toBeGreaterThan(30);
    for (const el of interactive) {
      expect((el.textContent ?? '').trim()).not.toBe('');
      expect(el.getAttribute('tabindex')).not.toBe('-1');
    }
  });
});

// Small helper so the console assertions read clearly.
function vi_spy(level: 'error' | 'warn', sink: unknown[][]) {
  const spy = vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
    sink.push(args);
  });
  return spy;
}
