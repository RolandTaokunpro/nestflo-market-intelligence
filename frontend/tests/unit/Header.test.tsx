/**
 * Contract tests for the shared site header navigation.
 *
 * Source of truth: SPEC.md (t_71db9224) — "Site Header Navigation (responsive)".
 * One test group per Gherkin Scenario; every Scenario: block is mapped 1:1 below.
 *
 * Responsive behaviour: the header selects its inline vs. hamburger layout from
 * `window.matchMedia('(min-width: 768px)')` (Tailwind's `md`), so jsdom — which
 * performs no CSS layout — can still exercise each breakpoint for real by
 * mocking matchMedia with an implementation that evaluates `min-width` queries.
 * The breakpoint literals below mirror the spec's stated 768 / 1024 px boundaries.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import Header from '../../src/components/Header';

const MD = 768; // Tailwind md
const LG = 1024; // Tailwind lg
const MIN_WIDTH = /\(min-width:\s*(\d+)px\)/;
const MAX_WIDTH = /\(max-width:\s*(\d+)px\)/;

type ChangeListener = (event: MediaQueryListEvent) => void;

const listeners = new Map<string, Set<ChangeListener>>();
let currentWidth = LG;

function evaluate(query: string, width: number): boolean {
  const min = MIN_WIDTH.exec(query);
  if (min) return width >= Number(min[1]);
  const max = MAX_WIDTH.exec(query);
  if (max) return width <= Number(max[1]);
  return false;
}

/** Replace window.matchMedia with a fake that truly evaluates min-width queries. */
function mockViewport(width: number) {
  currentWidth = width;
  listeners.clear();
  window.matchMedia = vi.fn((query: string) => {
    const bucket = listeners.get(query) ?? new Set<ChangeListener>();
    listeners.set(query, bucket);
    return {
      media: query,
      get matches() {
        return evaluate(query, currentWidth);
      },
      onchange: null,
      addEventListener: (_type: string, listener: ChangeListener) => bucket.add(listener),
      removeEventListener: (_type: string, listener: ChangeListener) =>
        bucket.delete(listener),
      addListener: (listener: ChangeListener) => bucket.add(listener),
      removeListener: (listener: ChangeListener) => bucket.delete(listener),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  }) as unknown as typeof window.matchMedia;
}

/** Simulate a browser resize: fire `change` on every subscribed media query. */
function resizeViewport(width: number) {
  currentWidth = width;
  for (const [query, bucket] of listeners) {
    const matches = evaluate(query, width);
    for (const listener of Array.from(bucket)) {
      listener({ matches, media: query } as MediaQueryListEvent);
    }
  }
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location-probe">{location.pathname}</span>;
}

function renderHeader(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
      <LocationProbe />
    </MemoryRouter>
  );
}

const NAV_LABELS = ['Market Data', 'HMO Market Reports', 'Benchmark a Listing'];

const expectedLinks = () => {
  const nav = screen.getByRole('navigation');
  const links = within(nav).getAllByRole('link');
  return { nav, links, labels: links.map((l) => l.textContent?.trim()) };
};

beforeEach(() => {
  mockViewport(LG);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Scenario: Desktop nav renders the three links in order with Book a Demo', () => {
  it('renders a navigation landmark with the three links in order plus Book a Demo', () => {
    mockViewport(LG);
    renderHeader('/');

    const { labels } = expectedLinks();
    expect(labels).toEqual([...NAV_LABELS, 'Book a Demo']);
  });

  it('points each nav link at its destination and opens Book a Demo safely', () => {
    mockViewport(LG);
    renderHeader('/');

    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('link', { name: 'Market Data' })).toHaveAttribute(
      'href',
      '/marketdata'
    );
    expect(within(nav).getByRole('link', { name: 'HMO Market Reports' })).toHaveAttribute(
      'href',
      '/market-reports'
    );
    expect(
      within(nav).getByRole('link', { name: 'Benchmark a Listing' })
    ).toHaveAttribute('href', '/target-vs-comparable');

    const demo = within(nav).getByRole('link', { name: 'Book a Demo' });
    expect(demo).toHaveAttribute('target', '_blank');
    expect(demo.getAttribute('rel')).toContain('noopener');
    expect(demo.getAttribute('rel')).toContain('noreferrer');
  });
});

describe('Scenario: Book a Demo is an external absolute link', () => {
  it('renders Book a Demo as an anchor with an absolute https href', () => {
    renderHeader('/');

    const demo = screen.getByRole('link', { name: 'Book a Demo' });
    expect(demo.tagName.toLowerCase()).toBe('a');
    expect(demo.getAttribute('href')).toMatch(/^https:\/\//);
  });
});

describe('Scenario: Nav links are router links, not full-page anchors', () => {
  it.each(NAV_LABELS)('routes the SPA to the destination when "%s" is clicked', async (label) => {
    const user = userEvent.setup();
    mockViewport(LG);
    renderHeader('/');

    const href = screen.getByRole('link', { name: label }).getAttribute('href');
    await user.click(screen.getByRole('link', { name: label }));

    // A plain <a> would leave the in-memory router untouched; a <Link> updates it.
    expect(screen.getByTestId('location-probe')).toHaveTextContent(href as string);
  });
});

describe('Scenario: The old "← Home" link is absent', () => {
  it('renders no "← Home" affordance on a non-home route', () => {
    renderHeader('/market-reports');
    expect(screen.queryByText('← Home')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '← Home' })).not.toBeInTheDocument();
  });
});

describe('Scenario: Tablet header keeps all links on one row', () => {
  it.each([
    ['lower bound', MD],
    ['upper bound', LG - 1],
  ])('at %s (%ipx) renders all three links and Book a Demo on one non-wrapping row', (_n, width) => {
    mockViewport(width);
    renderHeader('/');

    const { labels } = expectedLinks();
    expect(labels).toEqual([...NAV_LABELS, 'Book a Demo']);

    const row = document.querySelector('[data-testid="header-nav-inline"]');
    expect(row).not.toBeNull();
    expect(row?.className).toContain('flex-nowrap');
    expect(row?.className).not.toContain('flex-wrap');

    for (const label of NAV_LABELS) {
      const link = screen.getByRole('link', { name: label });
      expect(link.className).toContain('whitespace-nowrap');
    }
  });
});

/**
 * Hawk review of feat/site-header-nav @ 55acac4, finding Q1: the tablet tier does not
 * merely keep the row from wrapping, it *tightens* the spacing, and the desktop tier
 * loosens it again. jsdom applies no CSS, so the tier in force at a given width is
 * resolved from each element's own class list — modelling only the base utility and its
 * `lg:` override, because the header uses default Tailwind breakpoints only (spec D6).
 * That makes the assertion fail if the base tier is loosened, if the `lg:` override is
 * dropped, or if the override is pointed back at the tight value.
 */
function effectiveUtility(el: Element, axis: 'gap' | 'px', width: number): string | null {
  const pattern = new RegExp(`^(lg:)?${axis}-(\\d+)$`);
  const matches = el.className
    .split(/\s+/)
    .map((token) => pattern.exec(token))
    .filter((m): m is RegExpExecArray => m !== null);
  const base = matches.find((m) => !m[1]);
  const lg = matches.find((m) => m[1]);
  const inForce = width >= LG && lg ? lg : base;
  return inForce ? `${axis}-${inForce[2]}` : null;
}

describe('Scenario: Tablet tightens the nav spacing and desktop loosens it', () => {
  it.each([
    ['tablet lower bound', MD],
    ['tablet upper bound', LG - 1],
  ])('at %s (%ipx) the nav row and links use the tightened tier', (_n, width) => {
    mockViewport(width);
    renderHeader('/');

    const nav = screen.getByRole('navigation');
    const row = document.querySelector('[data-testid="header-nav-inline"]') as Element;

    expect(effectiveUtility(nav, 'gap', width)).toBe('gap-2');
    expect(effectiveUtility(row, 'gap', width)).toBe('gap-2');

    for (const label of NAV_LABELS) {
      const link = screen.getByRole('link', { name: label });
      expect(effectiveUtility(link, 'px', width)).toBe('px-2');
    }
  });

  it.each([
    ['desktop lower bound', LG],
    ['desktop', 1280],
  ])('at %s (%ipx) the same elements use the roomier tier', (_n, width) => {
    mockViewport(width);
    renderHeader('/');

    const nav = screen.getByRole('navigation');
    const row = document.querySelector('[data-testid="header-nav-inline"]') as Element;

    expect(effectiveUtility(nav, 'gap', width)).toBe('gap-6');
    expect(effectiveUtility(row, 'gap', width)).toBe('gap-6');

    for (const label of NAV_LABELS) {
      const link = screen.getByRole('link', { name: label });
      expect(effectiveUtility(link, 'px', width)).toBe('px-3');
    }
  });

  it('makes the tablet tier strictly tighter than the desktop tier', () => {
    mockViewport(MD);
    const { unmount } = renderHeader('/');
    const tablet = {
      gap: effectiveUtility(screen.getByRole('navigation'), 'gap', MD),
      px: effectiveUtility(screen.getByRole('link', { name: 'Market Data' }), 'px', MD),
    };
    unmount();

    mockViewport(LG);
    renderHeader('/');
    const desktop = {
      gap: effectiveUtility(screen.getByRole('navigation'), 'gap', LG),
      px: effectiveUtility(screen.getByRole('link', { name: 'Market Data' }), 'px', LG),
    };

    expect(Number(tablet.gap?.split('-')[1])).toBeLessThan(
      Number(desktop.gap?.split('-')[1])
    );
    expect(Number(tablet.px?.split('-')[1])).toBeLessThan(Number(desktop.px?.split('-')[1]));
  });
});

describe('Scenario: Mobile collapses nav into a hamburger', () => {
  it.each([
    ['320px', 320],
    ['767px', MD - 1],
  ])('at %s hides the inline links and shows a collapsed "Open menu" button', (_n, width) => {
    mockViewport(width);
    renderHeader('/');

    expect(document.querySelector('[data-testid="header-nav-inline"]')).toBeNull();

    const nav = screen.getByRole('navigation');
    expect(within(nav).queryAllByRole('link')).toHaveLength(0);

    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Scenario: Mobile hamburger expands a vertical list', () => {
  it('expands to a vertical list of the three links plus Book a Demo', async () => {
    const user = userEvent.setup();
    mockViewport(375);
    renderHeader('/');

    const toggle = screen.getByRole('button', { name: 'Open menu' });
    await user.click(toggle);

    const open = screen.getByRole('button', { name: 'Close menu' });
    expect(open).toHaveAttribute('aria-expanded', 'true');

    const panel = screen.getByTestId('header-mobile-menu');
    expect(panel.className).toContain('flex-col');
    expect(within(panel).getAllByRole('link').map((l) => l.textContent?.trim())).toEqual([
      ...NAV_LABELS,
      'Book a Demo',
    ]);
  });
});

describe('Scenario: Mobile expanded menu closes on navigation', () => {
  it('closes the menu and resets aria-expanded when a nav link is activated', async () => {
    const user = userEvent.setup();
    mockViewport(375);
    renderHeader('/');

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const panel = screen.getByTestId('header-mobile-menu');
    await user.click(within(panel).getByRole('link', { name: 'Market Data' }));

    expect(screen.getByTestId('location-probe')).toHaveTextContent('/marketdata');
    expect(document.querySelector('[data-testid="header-mobile-menu"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});

describe('Scenario: No horizontal scroll or overlap down to 320px', () => {
  it('declares no minimum width above the 320px viewport on any header element', async () => {
    const user = userEvent.setup();
    mockViewport(320);
    renderHeader('/');
    // Open the panel too: the expanded menu is part of the 320px requirement.
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const header = screen.getByRole('banner');
    const offenders: string[] = [];
    for (const el of Array.from(header.querySelectorAll<HTMLElement>('*'))) {
      const min = /min-w-\[(\d+)px\]/.exec(el.className);
      const fixed = /(^|\s)w-\[(\d+)px\]/.exec(el.className);
      const w = Number(min?.[1] ?? fixed?.[2] ?? 0);
      if (w > 320) offenders.push(`${el.tagName}.${el.className}`);
    }
    expect(offenders).toEqual([]);
    // The expanded panel must be bounded by the viewport, not the content.
    expect(screen.getByTestId('header-mobile-menu').className).toContain('max-w-full');
  });

  it('keeps every nav label in the mobile panel free of clipping classes', async () => {
    const user = userEvent.setup();
    mockViewport(320);
    renderHeader('/');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const panel = screen.getByTestId('header-mobile-menu');
    for (const link of within(panel).getAllByRole('link')) {
      expect(link.className).not.toMatch(/\btruncate\b/);
      expect(link.className).not.toMatch(/\boverflow-hidden\b/);
    }
  });
});

describe('Scenario: Active nav item is highlighted on a matching route', () => {
  it('marks only the matching link as current', () => {
    mockViewport(LG);
    renderHeader('/market-reports');

    const active = screen.getByRole('link', { name: 'HMO Market Reports' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active.className).toContain('bg-white/10');

    for (const label of ['Market Data', 'Benchmark a Listing']) {
      const link = screen.getByRole('link', { name: label });
      expect(link).not.toHaveAttribute('aria-current');
      expect(link.className).not.toContain('bg-white/10');
      expect(link.className).toContain('text-brand-grey');
    }
  });

  it('does not treat a longer path as a prefix match', () => {
    mockViewport(LG);
    renderHeader('/market-reports/annual');

    expect(screen.getByRole('link', { name: 'HMO Market Reports' })).not.toHaveAttribute(
      'aria-current'
    );
  });
});

describe('Scenario: No nav item is active on Home', () => {
  it.each(NAV_LABELS)('leaves "%s" inactive at the "/" route', (label) => {
    mockViewport(LG);
    renderHeader('/');
    expect(screen.getByRole('link', { name: label })).not.toHaveAttribute('aria-current');
  });
});

describe('Responsive layout tracks the live viewport', () => {
  it('switches from inline nav to hamburger when the viewport shrinks past md', () => {
    mockViewport(LG);
    renderHeader('/');
    expect(document.querySelector('[data-testid="header-nav-inline"]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Open menu' })).toBeNull();

    act(() => resizeViewport(MD - 1));

    expect(document.querySelector('[data-testid="header-nav-inline"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('switches back to inline nav when the viewport grows past md and tabs the menu shut', async () => {
    const user = userEvent.setup();
    mockViewport(375);
    renderHeader('/');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByTestId('header-mobile-menu')).toBeInTheDocument();

    act(() => resizeViewport(MD));

    expect(document.querySelector('[data-testid="header-mobile-menu"]')).toBeNull();
    expect(document.querySelector('[data-testid="header-nav-inline"]')).not.toBeNull();
  });

  it('falls back to the collapsed nav where matchMedia is unavailable', () => {
    // @ts-expect-error simulating a non-browser environment
    delete window.matchMedia;
    renderHeader('/');

    expect(document.querySelector('[data-testid="header-nav-inline"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });
});

describe('Scenario: Shared header uses only the shared-header palette tokens', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/Header.tsx'), 'utf8');

  it('applies no canon landing-page token', () => {
    expect(source).not.toMatch(/(^|[\s"'])md-[a-z]/);
    expect(source).not.toMatch(/--md-/);
    expect(source).not.toMatch(/MD_(TOKENS|STYLE_VARS|GRADIENT)/);
    expect(source).not.toMatch(/pages\/marketdata/);
    expect(source).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });

  it('uses only shared palette colour utilities', () => {
    const SHARED = new Set([
      'navy',
      'navy-light',
      'navy-card',
      'orange',
      'orange-dark',
      'brand-cyan',
      'brand-blue',
      'brand-purple',
      'brand-lavender',
      'brand-grey',
      'offwhite',
      'white',
      'black',
      'transparent',
      'current',
      'inherit',
    ]);
    const STRUCTURAL = new Set(['b', 't', 'l', 'r', 'x', 'y', 'none', 'collapse', 'separate']);
    // Non-colour utilities that share a colour-utility prefix.
    const NON_COLOUR = new Set([
      'xs',
      'sm',
      'base',
      'lg',
      'xl',
      '2xl',
      '3xl',
      '4xl',
      '5xl',
      'left',
      'center',
      'right',
      'justify',
      'start',
      'end',
      'ellipsis',
      'clip',
      'nowrap',
      'balance',
      'pretty',
    ]);
    // Shared palette gradient utility defined in tailwind.config.js.
    const SHARED_UTILITY = new Set(['gradient-brand']);
    const tokens = Array.from(
      source.matchAll(/\b(?:text|bg|border|from|via|to)-[a-z][a-z0-9/.-]*/g)
    ).map((match) => match[0]);
    const offenders = tokens
      .map((token) => token.slice(token.indexOf('-') + 1))
      .map((value) => value.split('/')[0])
      .filter(
        (value) =>
          !STRUCTURAL.has(value) &&
          !NON_COLOUR.has(value) &&
          !SHARED_UTILITY.has(value) &&
          !SHARED.has(value)
      );
    expect(offenders).toEqual([]);
  });
});
