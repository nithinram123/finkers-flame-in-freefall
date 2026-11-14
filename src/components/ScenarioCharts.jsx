import { useId } from 'react';
import ConditionChart from './ConditionChart.jsx';
import { PsiTag } from './PsiSources.jsx';
import { scenarioCoverage } from '../lib/scenario.mjs';

export function AtmosphereEvidence({ dataset, scenario, psi, onInspect }) {
  const { paired, exact, nearby, box } = scenarioCoverage(dataset.records, scenario);
  const accessions = new Set(nearby.map((row) => row.accession));
  const names = Object.fromEntries(psi.investigations.map((item) => [item.acc, item.acronym]));
  return (
    <section className="chart-panel evidence-plot scenario-chart">
      <header className="plot-heading">
        <h2>Has NASA tested fire in this air?</h2>
        <p>
          Each dot represents a test with both measurements. The shaded box marks ±2 oxygen
          percentage points and ±0.05 atm around your cabin.
        </p>
      </header>
      <ConditionChart
        records={paired}
        box={box}
        references
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
          Bars show the lowest and highest measured ambient oxygen. Orange marks ranges that span
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
