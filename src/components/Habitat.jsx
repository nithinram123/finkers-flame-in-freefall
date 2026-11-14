import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  Eye,
  FireExtinguisher,
  Flame,
  Globe2,
  Moon,
  Rocket,
  Satellite,
  Truck,
} from 'lucide-react';
import {
  atmosphereSource,
  habitatProfiles,
  habitatWindow,
  isPaired,
  rankInvestigations,
} from '../lib/habitat.mjs';
import ConditionChart from './ConditionChart.jsx';
import { ExportButton, PageTitle } from './ui.jsx';

const icons = { iss: Satellite, spacecraft: Rocket, lunar: Moon, rover: Truck, mars: Globe2 };
const flameSource =
  'https://www.nasa.gov/missions/station/iss-research/studying-combustion-and-fire-safety/';

export function FlameDemo({ gravity = 'Microgravity' }) {
  const [override, setOverride] = useState(null);
  const partial = gravity === 'Lunar gravity' || gravity === 'Martian gravity';
  const mode = override || (partial ? 'partial' : 'micro');
  const copy = {
    micro: 'With little buoyant flow, a quiet flame can become round.',
    earth: 'On Earth, hot gases rise and can give a flame its teardrop shape.',
    partial: 'The snapshot has no direct flame measurements at this surface gravity.',
  };
  return (
    <figure className="flame-demo">
      <div className={`flame-stage flame-${mode}`} aria-hidden="true">
        <span className="flame-shape" />
      </div>
      <figcaption>
        <strong>Flame shape and gravity</strong>
        <p>{copy[mode]}</p>
        <div className="flame-controls" role="group" aria-label="Flame illustration gravity">
          {[
            [partial ? 'partial' : 'micro', partial ? gravity : 'Microgravity'],
            ...(partial ? [['micro', 'Microgravity']] : []),
            ['earth', 'Earth gravity'],
          ].map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={mode === key}
              onClick={() => setOverride(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <a href={flameSource} target="_blank" rel="noreferrer">
          NASA combustion research
        </a>
      </figcaption>
    </figure>
  );
}

export function HabitatPicker() {
  return (
    <>
      <PageTitle
        eyebrow="Habitat briefing"
        title="Where are you going?"
        description="Choose a cabin to see which NASA combustion tests come closest to its conditions."
      />
      <div className="habitat-list">
        {habitatProfiles.map((habitat) => {
          const Icon = icons[habitat.id];
          return (
            <a className="habitat-card" href={`#/results/${habitat.id}`} key={habitat.id}>
              <span className="habitat-icon">
                <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="habitat-card-body">
                <strong>{habitat.name}</strong>
                <span>{habitat.description}</span>
              </span>
              <span className="habitat-values">
                {habitat.oxygen}% O₂ · {habitat.pressure} kPa
              </span>
              <ChevronRight size={19} aria-hidden="true" />
            </a>
          );
        })}
      </div>
      <p className="habitat-caption">
        ISS conditions are nominal. The other cabins are comparison scenarios.{' '}
        <a href={atmosphereSource} target="_blank" rel="noreferrer">
          NASA atmosphere reference
        </a>
      </p>
      <FlameDemo />
    </>
  );
}

export function HabitatContext({ habitat }) {
  if (!habitat) return null;
  return (
    <div className="habitat-context">
      <span>
        <strong>{habitat.name}</strong>
        <small>
          {habitat.oxygen}% O₂ · {habitat.pressure} kPa · {habitat.gravity}
          {!habitat.nominal && ' · illustrative scenario'}
        </small>
      </span>
      <a href="#/habitats">Change habitat</a>
    </div>
  );
}

const safetyAreas = [
  {
    name: 'Prevention',
    icon: Flame,
    id: 'PSI-25',
    informs: 'Material screening and airflow test design.',
    detail:
      'BASS-II investigates solid fuels in a low-speed flow duct. Its supplied table reports material and oxygen readings, with no normalized outcome field.',
  },
  {
    name: 'Detection',
    icon: Eye,
    id: 'PSI-102',
    informs: 'Smoke-detector response testing.',
    detail:
      'SAME sampled smoke from overheated spacecraft materials. Its supplied summary table reports materials, airflow, weight-loss rate and aging duration.',
  },
  {
    name: 'Suppression',
    icon: FireExtinguisher,
    id: 'PSI-69',
    informs: 'Which fuel and atmosphere combinations to test.',
    detail:
      'FLEX studied droplets. Its extinction observations depend on the fuel, droplet size, atmosphere and other test conditions.',
  },
];

function SafetyCards({ dataset }) {
  return (
    <section className="safety-section">
      <h2>What the experiments can tell us</h2>
      <div className="safety-cards">
        {safetyAreas.map(({ name, icon: Icon, id, informs, detail }) => {
          const investigation = dataset.investigations.find(({ accession }) => accession === id);
          const set = dataset.records.filter((row) => row.accession === id && !row.duplicateOf);
          const sentences = {
            Prevention:
              'NASA tested how airflow affects ignition and flame spread on solid materials.',
            Detection: 'NASA measured smoke from overheated spacecraft materials.',
            Suppression: 'FLEX recorded droplets going out under some test conditions.',
          };
          const measurements = {
            Prevention: `${set.filter((row) => row.oxygen.value !== null).length} source rows report an initial oxygen reading.`,
            Detection: `${set.filter((row) => row.airflow.value !== null).length} source entries report airflow.`,
            Suppression: `${set.filter((row) => row.outcome === 'Extinction').length} of ${set.filter((row) => row.kind === 'test record').length} droplet test records report extinction.`,
          };
          return (
            <article className="safety-card" key={id}>
              <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
              <div>
                <h3>{name}</h3>
                <p>{sentences[name]}</p>
                <small>Informs: {informs}</small>
                <small>{measurements[name]}</small>
                <details>
                  <summary>
                    Source: {investigation.name}, {id}
                  </summary>
                  <p>{detail}</p>
                  <a href={`#/investigation/${id}`}>
                    Open investigation and source rows <ArrowRight size={14} />
                  </a>
                </details>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function HabitatResults({ dataset, habitat, onInspect }) {
  const [expanded, setExpanded] = useState(false);
  const window = habitatWindow(habitat);
  const ranking = useMemo(() => rankInvestigations(dataset, habitat), [dataset, habitat]);
  const plotted = useMemo(() => dataset.records.filter(isPaired), [dataset]);
  const matching = ranking.flatMap((item) => item.matches);
  const studies = ranking.filter((item) => item.matches.length).length;
  const tableNames = new Map(dataset.tables.map((table) => [table.id, table.file]));
  const partial = ['Lunar gravity', 'Martian gravity'].includes(habitat.gravity);
  const ask = `#/ask/${habitat.id}`;
  return (
    <>
      <HabitatContext habitat={habitat} />
      <PageTitle
        eyebrow="Habitat briefing"
        title="What can we learn about fire here?"
        description="Read the evidence by safety goal, then inspect the tests closest to this cabin."
      />
      <section className="habitat-meter" aria-label="Habitat evidence coverage">
        <div>
          <h2>
            {matching.length ? 'Tests near these cabin conditions' : 'No tests match this window'}
          </h2>
          <p>
            {matching.length} of {plotted.length} paired test records across {studies}{' '}
            {studies === 1 ? 'investigation' : 'investigations'}. Coverage measures similarity in
            oxygen and pressure.
          </p>
        </div>
        <strong>
          {matching.length}
          <small>matching records</small>
        </strong>
        <progress
          aria-label="Proportion of paired records within the habitat window"
          value={matching.length}
          max={plotted.length || 1}
        />
      </section>
      <SafetyCards dataset={dataset} />
      <section className="chart-panel evidence-plot habitat-plot">
        <header className="plot-heading">
          <h2>Where the cabin sits among NASA tests</h2>
          <p>
            Shaded box: {window.x1}–{window.x2}% O₂ and {window.y1.toFixed(1)}–
            {window.y2.toFixed(1)} kPa. Earth and nominal ISS overlap at this scale.
          </p>
        </header>
        <ConditionChart records={plotted} box={window} references onInspect={onInspect} />
      </section>
      <details className="gap-panel" open={partial}>
        <summary>What we don’t know</summary>
        <div>
          <p>
            {plotted.length - matching.length} paired records sit outside this window.{' '}
            {ranking.filter((item) => !item.pairedCount).length} of the{' '}
            {dataset.investigations.length} investigations lack paired ambient oxygen and pressure.
          </p>
          <p>
            {partial
              ? `None of the plotted records validate combustion at ${habitat.gravity.toLowerCase()}.`
              : 'An atmosphere match leaves gravity, airflow, fuel geometry and test hardware to check separately.'}
          </p>
          <p>Unreported outcomes leave some tests useful only for mapping coverage.</p>
        </div>
      </details>
      <section className="rank-section">
        <div className="section-heading">
          <h2>Closest investigations</h2>
          <ExportButton
            filename={`flame-in-freefall-${habitat.id}-tests.csv`}
            headers={[
              'Habitat',
              'PSI accession',
              'Test',
              'Fuel',
              'Ambient oxygen (%)',
              'Pressure (kPa)',
              'Outcome',
              'Inside habitat window',
              'Source CSV',
              'CSV row',
            ]}
            rows={plotted.map((row) => [
              habitat.name,
              row.accession,
              row.label,
              row.fuel,
              row.oxygen.value,
              row.pressure.value,
              row.outcome,
              matching.includes(row) ? 'yes' : 'no',
              tableNames.get(row.tableId),
              row.row,
            ])}
          />
        </div>
        <ol className="rank-list">
          {ranking
            .slice(0, expanded ? ranking.length : 3)
            .map(({ investigation, matches, row, pairedCount }) => (
              <li key={investigation.accession}>
                <div>
                  <a href={`#/investigation/${investigation.accession}`}>{investigation.name}</a>
                  <p>
                    {row
                      ? `${matches.length} of ${pairedCount} paired records inside the window`
                      : 'No paired ambient oxygen and pressure in this snapshot'}
                  </p>
                  <small>
                    Source: {investigation.accession}
                    {row
                      ? ` · closest row: ${row.oxygen.value.toFixed(1)}% O₂, ${row.pressure.value.toFixed(1)} kPa`
                      : ''}
                  </small>
                </div>
                {row && (
                  <button type="button" onClick={() => onInspect([row])}>
                    Source row <ChevronRight size={15} />
                  </button>
                )}
              </li>
            ))}
        </ol>
        <div className="rank-actions">
          <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show top 3' : `See all ${ranking.length}`}
          </button>
          <a href={ask} className="button primary">
            Ask about this habitat <ArrowRight size={16} />
          </a>
        </div>
        <details className="ranking-method">
          <summary>How the ranking works</summary>
          <p>
            Investigations with a test inside the box come first. Within each group, the nearest
            single measured test determines priority. Distance combines oxygen difference in units
            of 2 percentage points and log pressure difference in units of 10%. Investigations
            without paired values go last. The tolerances are explorer settings.{' '}
            <a href={atmosphereSource} target="_blank" rel="noreferrer">
              NASA atmosphere reference
            </a>
          </p>
        </details>
      </section>
      <FlameDemo key={habitat.id} gravity={habitat.gravity} />
    </>
  );
}
