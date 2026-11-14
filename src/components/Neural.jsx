import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CircleGauge,
  Database,
  Network,
} from 'lucide-react';
import { kPaPerAtm, readScenario, scenarioCoverage, scenarioProfiles } from '../lib/scenario.mjs';
import { analystUrl } from '../lib/routes.mjs';
import './neural.css';

const format = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const number = (value) => format.format(value);
const seconds = (value) => number(value) + ' s';
const distance = (row, scenario) =>
  Math.hypot(
    (row.oxygen.value - scenario.oxygen) / 2,
    (row.pressure.value / kPaPerAtm - scenario.atm) / 0.05,
  );

function CoveragePlot({ scenario, coverage }) {
  const { box, nearbyBox, exact, nearby } = coverage;
  const span = nearbyBox.x2 - nearbyBox.x1;
  const height = nearbyBox.y2 - nearbyBox.y1;
  const x = (v) => 56 + ((v - nearbyBox.x1) / span) * 336;
  const y = (v) => 166 - ((v - nearbyBox.y1) / height) * 127;
  const exactIds = new Set(exact.map(({ id }) => id));
  return (
    <figure className="neural-plot">
      <svg viewBox="0 0 440 212" aria-hidden="true" focusable="false">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const u = x(nearbyBox.x1 + span * tick);
          const v = y(nearbyBox.y1 + height * tick);
          return (
            <g key={tick}>
              <path className="neural-gridline" d={`M${u} 39V166 M56 ${v}H392`} />
              {(tick === 0 || tick === 0.5 || tick === 1) && (
                <>
                  <text x={u} y="184" textAnchor="middle">
                    {number(nearbyBox.x1 + span * tick)}%
                  </text>
                  <text x="48" y={v + 4} textAnchor="end">
                    {number((nearbyBox.y1 + height * tick) / kPaPerAtm)}
                  </text>
                </>
              )}
            </g>
          );
        })}
        <rect
          className="neural-window"
          x={x(box.x1)}
          y={y(box.y2)}
          width={x(box.x2) - x(box.x1)}
          height={y(box.y1) - y(box.y2)}
          rx="3"
        />
        {nearby.map((row) => (
          <circle
            key={row.id}
            cx={x(row.oxygen.value)}
            cy={y(row.pressure.value)}
            r={exactIds.has(row.id) ? 3.6 : 3}
            className={exactIds.has(row.id) ? 'neural-dot exact' : 'neural-dot'}
          />
        ))}
        <path
          className="neural-target"
          d={`M${x(scenario.oxygen) - 5} ${y(scenario.pressure)}h10 M${x(scenario.oxygen)} ${y(scenario.pressure) - 5}v10`}
        />
        <text x="56" y="24">
          Pressure (atm)
        </text>
        <text x="224" y="204" textAnchor="middle">
          Ambient oxygen (%)
        </text>
      </svg>
      <figcaption>
        Each dot is a NASA test; some overlap. The cross marks the cabin and the dashed box marks
        the close match window.
      </figcaption>
    </figure>
  );
}

function NetworkPlot({ audit, example }) {
  const inputY = (i) => 25 + i * 28;
  const hiddenY = (i) => 32 + i * 32;
  return (
    <figure className="neural-network">
      <svg viewBox="0 0 410 218" aria-hidden="true" focusable="false">
        {audit.features.map((_, i) =>
          example.activations.map((_, j) => (
            <path
              key={i + ':' + j}
              className="neural-wire"
              d={`M135 ${inputY(i)}C188 ${inputY(i)} 190 ${hiddenY(j)} 236 ${hiddenY(j)}`}
            />
          )),
        )}
        {example.activations.map((_, j) => (
          <path
            key={j}
            className="neural-wire output"
            d={`M236 ${hiddenY(j)}C280 ${hiddenY(j)} 276 112 319 112`}
          />
        ))}
        {audit.features.map((name, i) => (
          <g key={name}>
            <text x="12" y={inputY(i) + 4}>
              {name}
            </text>
            <circle className="neural-node" cx="135" cy={inputY(i)} r="5" />
          </g>
        ))}
        {example.activations.map((value, i) => (
          <g key={i}>
            <circle
              className={value >= 0 ? 'neural-node positive' : 'neural-node negative'}
              cx="236"
              cy={hiddenY(i)}
              r={6 + Math.abs(value) * 3.5}
            />
            <text x="236" y={hiddenY(i) + 3} textAnchor="middle" className="neural-node-sign">
              {value >= 0 ? '+' : '−'}
            </text>
          </g>
        ))}
        <circle className="neural-node positive" cx="319" cy="112" r="8" />
        <text x="335" y="116">
          Burn time
        </text>
      </svg>
      <figcaption>
        Seven inputs, six hidden units, one output. Each hidden node shows the sign and relative
        size of its activation for the selected test.
      </figcaption>
    </figure>
  );
}

function ModelAudit({ records, onInspect }) {
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState(false);
  const [selection, setSelection] = useState('');
  useEffect(() => {
    const request = new AbortController();
    fetch('/data/neural.json', { signal: request.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Model check unavailable');
        return response.json();
      })
      .then((data) => {
        if (data.schemaVersion !== 1 || !data.predictions?.length)
          throw new Error('Invalid model check');
        setAudit(data);
      })
      .catch((cause) => {
        if (cause.name !== 'AbortError') setError(true);
      });
    return () => request.abort();
  }, []);
  if (!audit)
    return (
      <p role="status">
        {error
          ? 'The model check is unavailable. You can still browse and verify the NASA evidence above.'
          : 'Loading the FLEX model check…'}
      </p>
    );
  // One representative row per fold, selected without looking at prediction error.
  const examples = audit.folds
    .map((_, index) => audit.predictions.find(({ fold }) => fold === index + 1))
    .filter((item) => item && records.has(item.id));
  const example = examples.find(({ id }) => id === selection) || examples[0];
  const row = example && records.get(example.id);
  const groups = audit.folds.reduce((sum, fold) => sum + fold.groups.length, 0);
  return (
    <>
      <div className="neural-audit-metrics">
        <div>
          <small>Neural model · average miss</small>
          <strong>{seconds(audit.mae)}</strong>
        </div>
        <div>
          <small>Training median · average miss</small>
          <strong>{seconds(audit.baselineMae)}</strong>
        </div>
        <div>
          <small>Tests held out in turn</small>
          <strong>{number(audit.predictions.length)}</strong>
        </div>
      </div>
      <p className="neural-result">
        {audit.mae < audit.baselineMae
          ? 'The network missed by less than a simple median on these FLEX tests.'
          : 'The network did not improve on the simple median on these FLEX tests.'}{' '}
        This checks burn duration for liquid droplets, not ignition, material safety or fire risk in
        a habitat.
      </p>
      {row && (
        <div className="neural-model-grid">
          <NetworkPlot audit={audit} example={example} />
          <div className="neural-example">
            <label htmlFor="neural-example-select">Inspect a held-out FLEX test</label>
            <select
              id="neural-example-select"
              value={example.id}
              onChange={(event) => setSelection(event.target.value)}
            >
              {examples.map((item) => (
                <option key={item.id} value={item.id}>
                  Fold {item.fold} · {records.get(item.id).label}
                </option>
              ))}
            </select>
            <dl>
              <div>
                <dt>NASA measurement</dt>
                <dd>{seconds(example.observed)}</dd>
              </div>
              <div>
                <dt>Neural estimate</dt>
                <dd>{seconds(example.predicted)}</dd>
              </div>
              <div>
                <dt>Median estimate</dt>
                <dd>{seconds(example.baseline)}</dd>
              </div>
            </dl>
            <button className="neural-text-button" type="button" onClick={() => onInspect([row])}>
              Inspect original row <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      <details className="neural-methods">
        <summary>How the experiment was checked</summary>
        <p>
          Tests from NASA <a href="/investigation/PSI-69">PSI-69 (FLEX)</a> were grouped by
          atmospheric conditions: oxygen rounded to one percentage point and pressure rounded to 5
          kPa. Each of the {groups} groups was held out in one of five folds. Feature scaling and
          the median baseline used only that fold’s training data.
        </p>
        <p>
          The baseline uses the training median as its estimate for every held-out row. Average miss
          is mean absolute error in seconds. Similar atmospheres may still fall in adjacent groups;
          this is a check within one investigation. There is no validation against other fuels,
          solid samples or crewed habitats.
        </p>
        <p>
          OpenAI Codex assisted implementation and explanatory text. Training values come from NASA
          PSI; no training observations were generated by SI.
        </p>
      </details>
    </>
  );
}

export default function Neural({ dataset, onInspect, query }) {
  useEffect(() => {
    if (window.location.hash === '#neural-audit') {
      document.getElementById('neural-audit')?.scrollIntoView();
    }
  }, []);
  const initial = query.size ? query : new URLSearchParams({ preset: 'moon' });
  const [profile, setProfile] = useState(initial.get('preset') || 'custom');
  const [windowId, setWindowId] = useState(null);
  const scenario = useMemo(
    () =>
      readScenario(
        profile === initial.get('preset') || profile === 'custom'
          ? initial
          : new URLSearchParams({ preset: profile }),
      ),
    [profile, query],
  );
  const coverage = useMemo(() => scenarioCoverage(dataset.records, scenario), [dataset, scenario]);
  const records = useMemo(() => new Map(dataset.records.map((row) => [row.id, row])), [dataset]);
  const exactIds = useMemo(() => new Set(coverage.exact.map(({ id }) => id)), [coverage]);
  const adjacent = useMemo(
    () => coverage.nearby.filter(({ id }) => !exactIds.has(id)),
    [coverage, exactIds],
  );
  const windowName = windowId || (coverage.exact.length ? 'close' : 'nearby');
  const visible = windowName === 'close' ? coverage.exact : adjacent;
  const rows = useMemo(
    () => [...visible].sort((a, b) => distance(a, scenario) - distance(b, scenario)),
    [visible, scenario],
  );
  const scenarioLink =
    '/scenario?' +
    new URLSearchParams({
      preset: scenario.id,
      oxygen: scenario.oxygen,
      pressure: scenario.atm,
      gravity: scenario.gravityG,
    });

  return (
    <div className="neural-lab">
      <header className="neural-heading">
        <h1>Neural Evidence Lab</h1>
        <p>
          Find out what NASA actually tested near your cabin conditions, then see how well a neural
          model explains one set of measured burns.
        </p>
        <a
          href="#neural-audit"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById('neural-audit')?.focus();
          }}
        >
          Jump to the model check <ArrowDownRight size={16} aria-hidden="true" />
        </a>
      </header>
      <ol className="neural-pipeline" aria-label="Evidence workflow">
        {[
          [CircleGauge, 'Cabin conditions', '#neural-coverage'],
          [Database, 'NASA measurements', '#neural-records'],
          [Network, 'FLEX model check', '#neural-audit'],
        ].map(([Icon, title, target]) => (
          <li key={target}>
            <Icon size={21} aria-hidden="true" />
            <a href={target}>{title}</a>
          </li>
        ))}
      </ol>
      <section className="neural-panel" aria-labelledby="neural-coverage">
        <div className="neural-panel-head">
          <div>
            <h2 id="neural-coverage">Where the evidence reaches</h2>
          </div>
          <div className="neural-picker">
            <label htmlFor="neural-habitat">Cabin preset</label>
            <select
              id="neural-habitat"
              value={profile}
              onChange={(event) => {
                setProfile(event.target.value);
                setWindowId(null);
              }}
            >
              {scenarioProfiles
                .filter(
                  ({ id }) =>
                    id !== 'custom' ||
                    initial.has('oxygen') ||
                    initial.get('preset') === 'custom' ||
                    profile === 'custom',
                )
                .map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="neural-coverage-grid">
          <div className="neural-coverage-copy" aria-live="polite">
            <p className="neural-atmosphere">
              {number(scenario.oxygen)}% O₂ <span>·</span> {number(scenario.atm)} atm
            </p>
            <h3>
              {coverage.exact.length
                ? `${number(coverage.exact.length)} close matches`
                : 'No close matches'}
            </h3>
            <p>
              {number(adjacent.length)} wider matches, out of {number(coverage.paired.length)} valid
              tests with both measurements.
            </p>
            <p>
              {coverage.exact.length
                ? 'A match means similar oxygen and pressure. It does not mean that the fuel, gravity or cabin design matches.'
                : 'Nearby tests can guide the next questions. This dataset does not establish what happens at the selected cabin conditions.'}
            </p>
            <a href={scenarioLink}>
              Open full habitat analysis <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
          <CoveragePlot scenario={scenario} coverage={coverage} />
        </div>
        <div className="neural-records" id="neural-records">
          <div className="neural-record-head">
            <h3>Trace the source</h3>
            <div className="neural-segments" role="group" aria-label="Evidence range">
              <button
                type="button"
                aria-pressed={windowName === 'close'}
                onClick={() => setWindowId('close')}
              >
                Close · {number(coverage.exact.length)}
              </button>
              <button
                type="button"
                aria-pressed={windowName === 'nearby'}
                onClick={() => setWindowId('nearby')}
              >
                Wider · {number(adjacent.length)}
              </button>
            </div>
          </div>
          <p>
            Close: ±2 oxygen percentage points and ±0.05 atm. Wider: ±6 points and ±0.15 atm,
            excluding close matches.
          </p>
          <p role="status">
            {rows.length
              ? `Showing the ${Math.min(4, rows.length)} nearest of ${number(rows.length)} tests in this range.`
              : 'No source rows in this range.'}
          </p>
          {!!rows.length && (
            <ul className="neural-record-list">
              {rows.slice(0, 4).map((row) => (
                <li key={row.id}>
                  <div>
                    <strong>
                      {row.accession} · {row.label}
                    </strong>
                    <small>
                      {row.fuel || 'Fuel unreported'} · {number(row.oxygen.value)}% O₂ ·{' '}
                      {number(row.pressure.value / kPaPerAtm)} atm
                    </small>
                  </div>
                  <button
                    type="button"
                    className="neural-text-button"
                    onClick={() => onInspect([row])}
                    aria-label={`Inspect NASA source row ${row.accession} ${row.label}`}
                  >
                    Source row <ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section
        className="neural-panel"
        id="neural-audit"
        tabIndex={-1}
        aria-labelledby="neural-audit-title"
      >
        <div className="neural-panel-head">
          <div>
            <h2 id="neural-audit-title">Can the network estimate burn time?</h2>
          </div>
        </div>
        <p className="neural-model-intro">
          We held back whole sets of atmospheric conditions, then compared the model’s estimates
          with the burn times NASA measured.
        </p>
        <ModelAudit records={records} onInspect={onInspect} />
      </section>
      <footer className="neural-footer">
        <a
          href={analystUrl(
            'What has NASA tested near these cabin conditions, and what is still unknown?',
            scenario,
          )}
        >
          Ask the AI about this evidence <ArrowRight size={16} aria-hidden="true" />
        </a>
        <a href="/data-sources">
          Sources and methods <ArrowRight size={16} aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}
