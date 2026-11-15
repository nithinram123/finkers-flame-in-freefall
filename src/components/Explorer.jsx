import { useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { chartRecords, isTest } from '../lib/evidence.mjs';
import { coverage, inWindow } from '../lib/habitat.mjs';
import { readScenario, scenarioCoverage } from '../lib/scenario.mjs';
import ConditionChart, { metrics } from './ConditionChart.jsx';
import { EvidenceSteps } from './EvidenceWorkspace.jsx';
import FilterMenu from './FilterMenu.jsx';
import Records from './Records.jsx';
import { PageTitle } from './ui.jsx';

const defaults = { accession: '', x: 'oxygen', y: 'pressure', basis: 'ambient' };
const axes = Object.entries(metrics).map(([key, [label, unit]]) => [key, `${label} (${unit})`]);
const oxygenOptions = [
  ['ambient', 'Ambient chamber'],
  ['burner oxidizer', 'Burner stream'],
];
const earthWindow = { x1: 19, x2: 23, y1: 91.17, y2: 111.43 };

export function Coverage({ records }) {
  const counts = coverage(records);
  return (
    <section aria-label="Data coverage" className="coverage-strip">
      {[
        ['oxygen', 'Scalar oxygen'],
        ['pressure', 'Scalar pressure'],
        ['outcome', 'Outcome reported'],
        ['ranges', 'Ranges or lists'],
      ].map(([key, label]) => (
        <div className="coverage-item" key={key}>
          <span>{label}</span>
          <strong>
            {counts[key]} <small>/ {counts.total}</small>
          </strong>
          <progress aria-label={label} value={counts[key]} max={counts.total || 1} />
        </div>
      ))}
    </section>
  );
}

export default function Explorer({ dataset, onInspect, initialAccession, query }) {
  const [filters, setFilters] = useState({ ...defaults, accession: initialAccession || '' });
  const matchWindow = query?.get('scope');
  const cabin = useMemo(
    () =>
      (matchWindow === 'close' || matchWindow === 'nearby') && query?.has('preset')
        ? readScenario(query)
        : null,
    [query, matchWindow],
  );
  const selection = useMemo(() => {
    if (!cabin) return null;
    const matching = scenarioCoverage(dataset.records, cabin);
    return new Set(
      (matchWindow === 'close' ? matching.exact : matching.nearby).map(({ id }) => id),
    );
  }, [cabin, dataset, matchWindow]);
  const options = [
    ['', 'All investigations'],
    ...dataset.investigations
      .filter((item) => item.testRecordCount)
      .map((item) => [item.accession, item.name]),
  ];
  const oxygenRelevant = filters.x === 'oxygen' || filters.y === 'oxygen';
  const eligible = useMemo(
    () =>
      dataset.records.filter(
        (record) =>
          isTest(record) &&
          (!selection || selection.has(record.id)) &&
          (!filters.accession || record.accession === filters.accession),
      ),
    [dataset, filters.accession, selection],
  );
  const scope = useMemo(
    () => (oxygenRelevant ? eligible.filter((row) => row.oxygenBasis === filters.basis) : eligible),
    [eligible, oxygenRelevant, filters.basis],
  );
  const plotted = useMemo(
    () =>
      chartRecords(eligible, filters).filter((row) =>
        [filters.x, filters.y].every((key) => key !== 'pressure' || row.pressure.value > 0),
      ),
    [eligible, filters],
  );
  const ambientPlot =
    filters.x === 'oxygen' && filters.y === 'pressure' && filters.basis === 'ambient';
  const nearby = ambientPlot ? plotted.filter((row) => inWindow(row, earthWindow)).length : 0;
  const oxygenLevels = [...new Set(plotted.map((row) => row.oxygen.value))].sort((a, b) => a - b);
  const narrowOxygen = ambientPlot && oxygenLevels.length > 0 && oxygenLevels.length <= 3;
  const adjust = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const chips = [
    ['accession', options.find(([key]) => key === filters.accession)?.[1]],
    ['x', axes.find(([key]) => key === filters.x)?.[1]],
    ['y', axes.find(([key]) => key === filters.y)?.[1]],
    ['basis', oxygenOptions.find(([key]) => key === filters.basis)?.[1]],
  ].filter(([key]) => filters[key] !== defaults[key] && (key !== 'basis' || oxygenRelevant));
  return (
    <>
      <PageTitle
        eyebrow="NASA PSI research"
        title="What did NASA test?"
        description="Explore measured conditions and open any record to see the original NASA data."
      />
      <EvidenceSteps cabin={cabin} current="explorer" />
      {cabin && (
        <section className="explorer-cabin" aria-label="Active cabin filter">
          <span>
            <strong>{cabin.name}</strong> · {selection.size}{' '}
            {matchWindow === 'close' ? 'close' : 'nearby'} tests
          </span>
          <a href="/explorer">
            Browse the full archive <X size={14} aria-hidden="true" />
          </a>
        </section>
      )}
      <section aria-label="Chart filters" className="filters-panel">
        <div className="section-kicker">
          <SlidersHorizontal size={16} aria-hidden="true" /> Filter the evidence
        </div>
        <div className="explorer-controls">
          <FilterMenu
            label="Investigation"
            options={options}
            value={filters.accession}
            onChange={(value) => adjust('accession', value)}
          />
          <FilterMenu
            label="Horizontal axis"
            options={axes}
            value={filters.x}
            onChange={(value) => adjust('x', value)}
          />
          <FilterMenu
            label="Vertical axis"
            options={axes}
            value={filters.y}
            onChange={(value) => adjust('y', value)}
          />
          {oxygenRelevant && (
            <FilterMenu
              label="Oxygen location"
              options={oxygenOptions}
              value={filters.basis}
              onChange={(value) => adjust('basis', value)}
            />
          )}
        </div>
        {chips.length > 0 && (
          <div className="filter-chips">
            {chips.map(([key, label]) => (
              <button
                type="button"
                key={key}
                aria-label={`Remove ${label} filter`}
                onClick={() => adjust(key, defaults[key])}
              >
                {label}
                <X size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </section>
      <Coverage records={scope} />
      <section className="chart-panel evidence-plot" aria-label="Measured test conditions">
        <header className="plot-heading">
          <span className="eyebrow">Measured conditions</span>
          <h2>
            {narrowOxygen
              ? `These tests cover ${oxygenLevels.map((value) => `${Number(value.toFixed(2))}%`).join(' and ')} oxygen.`
              : ambientPlot && plotted.length
                ? nearby === plotted.length
                  ? 'Every plotted test sits near Earth and ISS conditions.'
                  : nearby > plotted.length / 2
                    ? 'Most plotted tests sit near Earth and ISS conditions.'
                    : nearby === 0
                      ? 'No plotted tests sit near Earth and ISS conditions.'
                      : 'The plotted tests span several cabin conditions.'
                : `${metrics[filters.y][0]} and ${metrics[filters.x][0].toLowerCase()}`}
          </h2>
          <p>
            {ambientPlot
              ? `${nearby} of ${plotted.length} plotted records fall within 2 oxygen percentage points and 10% pressure of the Earth / nominal ISS reference.`
              : `${plotted.length} of ${scope.length} records report both measurements.`}
          </p>
        </header>
        <ConditionChart
          records={plotted}
          x={filters.x}
          y={filters.y}
          references={ambientPlot}
          onInspect={onInspect}
        />
        <p className="chart-takeaway">
          {ambientPlot
            ? plotted.filter((row) => row.oxygen.value > 30).length +
              ' plotted tests used more than 30% ambient oxygen. Check pressure before comparing them with a cabin.'
            : plotted.length +
              ' records can be compared on these axes. Missing measurements are counted in the panel below.'}
        </p>
      </section>
      <details className="gap-panel">
        <summary>What we don’t know</summary>
        <div>
          <p>
            {scope.length - plotted.length} of {scope.length} records in this selection lack a
            usable pair of measurements. {scope.length - coverage(scope).outcome} lack a reported
            outcome.
          </p>
          {ambientPlot && (
            <p>
              {plotted.filter((row) => row.pressure.value < 70.3 && row.oxygen.value >= 30).length}{' '}
              plotted records combine at least 30% ambient oxygen with pressure below 70.3 kPa.
            </p>
          )}
          {filters.basis === 'burner oxidizer' && oxygenRelevant && (
            <p>
              Burner oxygen describes the gas fed to the flame. Habitat comparisons use the
              surrounding chamber’s oxygen.
            </p>
          )}
          <p>
            The snapshot gives no direct lunar or Martian surface-gravity validation. Empty regions
            describe this selection’s coverage.
          </p>
        </div>
      </details>
      <Records
        records={plotted}
        tables={dataset.tables}
        title="Plotted source records"
        onInspect={onInspect}
        key={Object.values(filters).join('-')}
      />
    </>
  );
}
