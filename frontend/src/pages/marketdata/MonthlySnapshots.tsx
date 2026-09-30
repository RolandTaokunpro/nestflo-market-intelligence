import { useState } from 'react';
import { EDITION_YEARS, MONTH_NAMES, editionsForYear } from './marketData';
import { reportPath } from './marketDataLinks';

/**
 * Monthly Snapshots grid: year tabs plus a 12-cell month grid. Published months
 * are full-page links to the real /marketdata-MM-YYYY report pages; unpublished
 * months are non-navigating cells (AC-12).
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
          const href = edition.status === 'coming' ? null : reportPath(edition.key);
          const classes = [
            'md-mcell',
            edition.status === 'coming' ? 'md-coming' : 'md-available',
            edition.status === 'pilot' ? 'md-pilot' : '',
            edition.latest ? 'md-latest' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return href ? (
            <a
              key={edition.key}
              className={classes}
              data-testid={`md-cell-${edition.key}`}
              href={href}
            >
              <span className="md-mn">{MONTH_NAMES[edition.month - 1]}</span>
              <span className="md-ms">{edition.note}</span>
              {edition.latest && <span className="md-visually-hidden">Latest snapshot</span>}
              {edition.status === 'pilot' && (
                <span className="md-visually-hidden">Pilot (partial coverage)</span>
              )}
            </a>
          ) : (
            <div
              key={edition.key}
              className={classes}
              data-testid={`md-cell-${edition.key}`}
              aria-disabled="true"
            >
              <span className="md-mn">{MONTH_NAMES[edition.month - 1]}</span>
              <span className="md-ms">{edition.note}</span>
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
