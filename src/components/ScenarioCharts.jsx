import { useId, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import ConditionChart from './ConditionChart.jsx';
import { PsiTag } from './PsiSources.jsx';
import { kPaPerAtm } from '../lib/scenario.mjs';
import { explorerUrl } from './EvidenceWorkspace.jsx';

export function AtmosphereEvidence({ coverage, scenario, psi, onInspect }) {
  const { paired, exact, nearby, box, nearbyBox } = coverage;
  const [tab, setTab] = useState(exact.length ? 'close' : 'wider');
  const [all, setAll] = useState(false);
  const [fullChart, setFullChart] = useState(!nearby.length);
  const listId = useId();
  const closeIds = new Set(exact.map((row) => row.id));
  const wider = nearby.filter((row) => !closeIds.has(row.id));
  const displayed = tab === 'close' ? exact : wider;
  const distance = (row) =>
    Math.hypot(
      (row.oxygen.value - scenario.oxygen) / 2,
      (row.pressure.value - scenario.pressure) / (0.05 * kPaPerAtm),
    );
  const rows = [...displayed].sort((a, b) => distance(a) - distance(b));
  const accessions = new Set(nearby.map((row) => row.accession));
  const names = Object.fromEntries(psi.investigations.map((item) => [item.acc, item.acronym]));
  return (
    <section className="chart-panel evidence-plot scenario-chart" id="atmosphere-evidence">
      <header className="plot-heading">
        <h2>Has NASA tested fire in this air?</h2>
        <p>
          Each dot is a test with both measurements. The shaded box marks ±2 oxygen percentage
          points and ±0.05 atm around your cabin. Select a group of dots to open its source rows.
        </p>
      </header>
      {nearby.length > 0 && (
        <div className="scenario-evidence-switch" role="group" aria-label="Chart range">
          <button type="button" aria-pressed={!fullChart} onClick={() => setFullChart(false)}>
            Cabin neighbourhood ({nearby.length})
          </button>
          <button type="button" aria-pressed={fullChart} onClick={() => setFullChart(true)}>
            All paired tests ({paired.length})
          </button>
        </div>
      )}
      <ConditionChart
        records={fullChart ? paired : nearby}
        box={box}
        bounds={fullChart ? undefined : nearbyBox}
        nearbyBox={nearbyBox}
        references={fullChart}
        onInspect={onInspect}
        mode="scenario"
        boxLabel={'Your ' + scenario.name}
        experimentNames={names}
      />
      <p className="scenario-takeaway">
        <strong>
          {exact.length} tests inside your habitat’s conditions · {nearby.length} tests nearby
        </strong>
      </p>
      <p>
        Nearby means within ±6 oxygen percentage points and ±0.15 atm, including any tests inside
        the box.
      </p>
      {nearby.length > 0 && (
        <a className="button" href={explorerUrl(scenario)}>
          Explore these {nearby.length} NASA records <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      )}
      <div className="scenario-source-list">
        <h3>Open the original measurements</h3>
        <div className="scenario-evidence-switch" role="group" aria-label="Source match range">
          {[
            ['close', 'Close', exact.length],
            ['wider', 'Wider', wider.length],
          ].map(([id, label, count]) => (
            <button
              type="button"
              key={id}
              aria-pressed={tab === id}
              onClick={() => {
                setTab(id);
                setAll(false);
              }}
            >
              {label} ({count})
            </button>
          ))}
        </div>
        <p role="status">
          {rows.length
            ? `Showing ${all ? rows.length : Math.min(5, rows.length)} of ${rows.length} ${tab} matches.`
            : 'There are no tests in this window.'}
        </p>
        <ul id={listId}>
          {rows.slice(0, all ? rows.length : 5).map((row) => (
            <li key={row.id}>
              <div>
                <strong>
                  {names[row.accession] || row.accession} · {row.label}
                </strong>
                <small>
                  {row.accession} · {row.fuel || 'Fuel unreported'} · {row.oxygen.value}% O₂ ·{' '}
                  {(row.pressure.value / kPaPerAtm).toFixed(2)} atm
                </small>
              </div>
              <button
                type="button"
                aria-label={`Inspect NASA test ${row.accession} ${row.label}`}
                onClick={() => onInspect([row])}
              >
                Source row <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {rows.length > 5 && (
          <button
            type="button"
            aria-controls={listId}
            aria-expanded={all}
            onClick={() => setAll(!all)}
          >
            {all ? 'Show first five' : `Show all ${rows.length} matches`}
          </button>
        )}
      </div>
      <div className="psi-links">
        {psi.investigations
          .filter((item) => accessions.has(item.acc))
          .map((item) => (
            <PsiTag key={item.acc} investigation={item} label={item.acronym + ' · ' + item.acc} />
          ))}
      </div>
    </section>
  );
}

export function OxygenRanges({ psi, oxygen }) {
  const heading = useId();
  const items = psi.investigations.filter((item) => item.o2).sort((a, b) => b.o2[1] - a.o2[1]);
  const max = Math.min(
    100,
    Math.max(45, Math.ceil((oxygen + 4) / 5) * 5, ...items.map((item) => item.o2[1] + 4)),
  );
  const crosses = (item) => oxygen >= item.o2[0] && oxygen <= item.o2[1];
  const pct = (value) => (100 * value) / max + '%';
  return (
    <section className="chart-panel evidence-plot scenario-chart" aria-labelledby={heading}>
      <header className="plot-heading">
        <h2 id={heading}>Which experiments reached this oxygen level?</h2>
        <p>
          Bars show the lowest and highest measured ambient oxygen. Violet marks ranges that span
          your setting.
        </p>
      </header>
      <p className="range-references">
        <span>Dashed: Earth air (21%)</span>
        <span>Solid: Your habitat ({oxygen}% O₂)</span>
      </p>
      <ul className="oxygen-ranges">
        {items.map((item) => (
          <li
            key={item.acc}
            title={item.title + ': ' + item.o2.map((v) => Number(v.toFixed(1))).join('–') + '% O₂'}
          >
            <a href={'/investigation/' + item.acc}>{item.acronym}</a>
            <div className="range-track" aria-hidden="true">
              <div className="earth-reference" style={{ left: pct(21) }} />
              <div className="habitat-reference" style={{ left: pct(oxygen) }} />
              <div
                className={'range-bar' + (crosses(item) ? ' crosses' : '')}
                style={{ left: pct(item.o2[0]), width: pct(item.o2[1] - item.o2[0]) }}
              />
            </div>
            <span>{item.o2.map((v) => Number(v.toFixed(1))).join('–')}%</span>
          </li>
        ))}
      </ul>
      <p>
        <strong>{items.filter(crosses).length} investigations span your oxygen setting.</strong> A
        range can include values between recorded tests. Check the scatter for measurements at a
        similar pressure.
      </p>
    </section>
  );
}
