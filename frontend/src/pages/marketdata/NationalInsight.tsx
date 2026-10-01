import { useState } from 'react';
import {
  AUGUST_2026,
  EDITIONS,
  EDITION_YEARS,
  MONTH_NAMES,
  SNAPSHOTS,
  editionsForYear,
  latestEditionKey,
  monthKey,
  type Edition,
  type EditionStatus,
  type Snapshot,
} from './marketData';

const STATUS_LABEL: Record<EditionStatus, string> = {
  available: 'Available',
  pilot: 'Pilot · partial coverage',
  coming: 'Coming soon',
};

function pillLabel(edition: Edition): string {
  return edition.latest
    ? `${edition.label} — Latest edition`
    : `${edition.label} — ${STATUS_LABEL[edition.status]}`;
}

function labelFromKey(key: string): string {
  const [year, month] = key.split('-');
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

function SnapshotPanel({ snapshot }: { snapshot: Snapshot }) {
  return (
    <>
      <p className="md-sec-sub" data-testid="md-insight-sub">
        {snapshot.subline}
      </p>
      <div className="md-insight">
        <div className="md-panel">
          <div className="md-kpi-row">
            {snapshot.kpis.map((kpi) => (
              <div className="md-kpi" key={kpi.id} data-testid={`md-kpi-${kpi.id}`}>
                <div className="md-k">{kpi.value}</div>
                <div className="md-l">{kpi.label}</div>
                <div className="md-attrib">{snapshot.attribution}</div>
              </div>
            ))}
          </div>
          <table className="md-roomtable" data-testid="md-roomtable">
            <caption className="md-visually-hidden">
              Median HMO room rent by room type, {snapshot.attribution}
            </caption>
            <thead>
              <tr>
                <th scope="col">Room type</th>
                <th scope="col" className="md-num">
                  Listings
                </th>
                <th scope="col" className="md-num">
                  Median P50
                </th>
              </tr>
            </thead>
            <tbody>
              {snapshot.rooms.map((room) => (
                <tr key={room.type}>
                  <td>{room.type}</td>
                  <td className="md-num">{room.listings}</td>
                  <td className="md-num md-p50">{room.p50}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md-panel">
          <h3 className="md-panel-title">Highest &amp; lowest median (double room)</h3>
          <ul className="md-ranklist" data-testid="md-ranklist">
            {snapshot.highest.map((row) => (
              <li className="md-top" key={row.area} data-testid="md-rank-row">
                <span>{row.area}</span>
                <span className="md-r">{row.p50}</span>
              </li>
            ))}
            <li className="md-ellipsis" aria-hidden="true">
              <span>…</span>
            </li>
            {snapshot.lowest.map((row) => (
              <li className="md-low" key={row.area} data-testid="md-rank-row">
                <span>{row.area}</span>
                <span className="md-r">{row.p50}</span>
              </li>
            ))}
          </ul>
          <h3 className="md-panel-title">Agent vs private listings</h3>
          <div
            className="md-splitbar"
            data-testid="md-splitbar"
            role="img"
            aria-label={`Advertiser split: agency ${snapshot.split.agency}%, private ${snapshot.split.private}%`}
          >
            <span
              className="md-split-a"
              data-testid="md-split-agency"
              style={{ width: `${snapshot.split.agency}%` }}
            />
            <span
              className="md-split-b"
              data-testid="md-split-private"
              style={{ width: `${snapshot.split.private}%` }}
            />
          </div>
          <div className="md-split-labels">
            <span>Agency {snapshot.split.agency}%</span>
            <span>Private {snapshot.split.private}%</span>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * National HMO Room Rental Insight: KPIs, room table, rank lists, split bar and
 * the edition navigator. Figures render only from a published snapshot.
 */
export default function NationalInsight() {
  const latest = latestEditionKey();
  const [year, setYear] = useState(2026);
  const [selectedKey, setSelectedKey] = useState(latest);

  const months = editionsForYear(year);
  const snapshot = SNAPSHOTS[selectedKey];
  const selectedEdition = EDITIONS[selectedKey];
  const emptyTitle = selectedEdition?.label ?? labelFromKey(selectedKey);
  const emptyNote = selectedEdition?.note ?? 'Coming soon';

  function selectYear(nextYear: number) {
    setYear(nextYear);
    const yearLatest = editionsForYear(nextYear).find((edition) => edition.latest);
    setSelectedKey(yearLatest ? yearLatest.key : monthKey(nextYear, 1));
  }

  function goLatest() {
    const edition = EDITIONS[latest];
    setYear(edition.year);
    setSelectedKey(edition.key);
  }

  return (
    <section className="md-section" data-testid="md-sec-insight" aria-labelledby="md-insight-title">
      <p className="md-sec-eyebrow">National HMO Room Rental Insight</p>
      <h2 className="md-sec-title" id="md-insight-title">
        The national picture, at a glance
      </h2>

      <div className="md-insight-nav">
        <div className="md-yeartabs" role="group" aria-label="Edition year">
          {EDITION_YEARS.map((editionYear) => (
            <button
              key={editionYear}
              type="button"
              className={`md-yeartab${editionYear === year ? ' md-active' : ''}`}
              aria-pressed={editionYear === year}
              onClick={() => selectYear(editionYear)}
            >
              {editionYear}
            </button>
          ))}
        </div>
        <div className="md-mpills" role="group" aria-label="Edition month">
          {months.map((edition) => (
            <button
              key={edition.key}
              type="button"
              className={`md-mpill md-${edition.status}${edition.latest ? ' md-latest' : ''}${
                edition.key === selectedKey ? ' md-active' : ''
              }`}
              data-testid={`md-pill-${edition.key}`}
              aria-label={pillLabel(edition)}
              aria-pressed={edition.key === selectedKey}
              disabled={edition.status === 'coming'}
              onClick={() => setSelectedKey(edition.key)}
            >
              {MONTH_NAMES[edition.month - 1]}
            </button>
          ))}
        </div>
      </div>

      {snapshot ? (
        <SnapshotPanel snapshot={snapshot} />
      ) : (
        <div className="md-insight-empty" data-testid="md-insight-empty">
          <div className="md-empty-emoji" aria-hidden="true">
            ⏳
          </div>
          <div className="md-empty-title" data-testid="md-empty-title">
            {emptyTitle}
          </div>
          <p className="md-empty-note" data-testid="md-empty-note">
            {emptyNote}
          </p>
          <p className="md-empty-sub" data-testid="md-empty-sub">
            {AUGUST_2026.attribution} is the latest full edition.
          </p>
          <button type="button" className="md-btn-demo" onClick={goLatest}>
            View latest edition
          </button>
        </div>
      )}
    </section>
  );
}
