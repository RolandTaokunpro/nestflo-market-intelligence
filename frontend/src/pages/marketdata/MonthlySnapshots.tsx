import { useState } from 'react';
import { EDITION_YEARS, MONTH_NAMES, editionsForYear } from './marketData';
import { reportHref } from './marketDataLinks';

/**
 * Monthly Snapshots grid: year tabs plus a 12-cell month grid. A month is a
 * full-page link to its /marketdata-MM-YYYY report page only when that page
 * actually ships (reportHref is manifest-guarded); every other month is a
 * non-navigating cell (AC-12).
 */
export default function MonthlySnapshots() {
  const [year, setYear] = useState(2026);
  const months = editionsForYear(year);

  return (
    <section className="md-section" data-testid="md-sec-snapshots" aria-labelledby="md-snapshots-title">
      <p className="md-sec-eyebrow">Monthly Snapshots</p>
      <h2 className="md-sec-title" id="md-snapshots-title">
        Different month, different year
      </h2>
      <p className="md-sec-sub">National market data, one page per month. Pick a year, then a month.</p>

      <div className="md-yeartabs" role="group" aria-label="Snapshot year">
        {EDITION_YEARS.map((editionYear) => (
          <button
            key={editionYear}
            type="button"
            className={`md-yeartab${editionYear === year ? ' md-active' : ''}`}
            aria-pressed={editionYear === year}
            onClick={() => setYear(editionYear)}
          >
            {editionYear}
          </button>
        ))}
      </div>

      <div className="md-monthgrid">
        {months.map((edition) => {
          // The shipped report page is the only gate — an edition key with no
          // page on disk stays a non-navigating cell (QA R1).
          const href = reportHref(edition.key);
          const classes = ['md-mcell', href ? 'md-available' : 'md-coming', edition.latest ? 'md-latest' : '']
            .filter(Boolean)
            .join(' ');
          const cell = (
            <>
              <span className="md-mn">{MONTH_NAMES[edition.month - 1]}</span>
              <span className="md-ms">{edition.note}</span>
              {edition.latest && <span className="md-visually-hidden">Latest snapshot</span>}
            </>
          );

          return href ? (
            <a
              key={edition.key}
              className={classes}
              data-testid={`md-cell-${edition.key}`}
              href={href}
            >
              {cell}
            </a>
          ) : (
            <div
              key={edition.key}
              className={classes}
              data-testid={`md-cell-${edition.key}`}
              aria-disabled="true"
            >
              {cell}
            </div>
          );
        })}
      </div>

      <div className="md-legend" data-testid="md-legend">
        <span className="md-l-avail">Available</span>
        <span className="md-l-latest">Latest snapshot</span>
        <span className="md-l-pilot">Pilot (partial coverage)</span>
        <span className="md-l-coming">Coming soon</span>
      </div>
    </section>
  );
}
