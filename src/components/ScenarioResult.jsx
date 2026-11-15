import { ArrowDown, Eye, Flame, FireExtinguisher } from 'lucide-react';
import { HabitatResults } from './Habitat.jsx';
import { AtmosphereEvidence, OxygenRanges } from './ScenarioCharts.jsx';
import { PsiTag } from './PsiSources.jsx';
import { PageTitle } from './ui.jsx';
import { buildPsi } from '../lib/psi.mjs';
import { scenarioCoverage } from '../lib/scenario.mjs';
import { analystUrl } from '../lib/routes.mjs';
import { rankInvestigations } from '../lib/habitat.mjs';

const safety = [
  [
    'prevention',
    'Prevention',
    Flame,
    'Cabin materials need testing at the oxygen and pressure your crew will use.',
    'Cabin material choice',
  ],
  [
    'detection',
    'Detection',
    Eye,
    'Check whether cabin airflow carries smoke to the detectors.',
    'Smoke detector placement and design',
  ],
  [
    'suppression',
    'Suppression',
    FireExtinguisher,
    'Extinguisher performance depends on the fuel and fire size.',
    'Extinguisher selection and testing',
  ],
];

export default function ScenarioResult({ dataset, scenario, onInspect, controls }) {
  const psi = buildPsi(dataset);
  const coverage = scenarioCoverage(dataset.records, scenario);
  const { exact, nearby } = coverage;
  const ranking = rankInvestigations(dataset, scenario);
  const position = new Map(
    ranking.map(({ investigation }, index) => [investigation.accession, index]),
  );
  const difference = scenario.oxygen - 21;
  const atm = Number(scenario.atm.toFixed(3));
  const question =
    'What are the fire risks for ' +
    scenario.name +
    ' at ' +
    scenario.oxygen +
    '% oxygen and ' +
    atm +
    ' atm?';
  return (
    <>
      <PageTitle
        title={'Habitat risk: ' + scenario.name}
        description={
          scenario.oxygen +
          '% O₂ · ' +
          atm +
          ' atm · ' +
          scenario.gravityG +
          ' g' +
          (scenario.note ? ' · ' + scenario.note : '')
        }
      />
      <section className="scenario-verdict" aria-label="Habitat risk and evidence">
        <div>
          <span>Fire safety verdict</span>
          <h2>
            {exact.length
              ? 'Some cabin conditions have been tested'
              : 'Fire risk is uncertain in this air'}
          </h2>
          <p>
            {difference > 0
              ? 'Oxygen is ' +
                Number(difference.toFixed(1)) +
                ' percentage points above the Space Station reference. '
              : ''}
            {exact.length
              ? 'Matching air helps select relevant tests. Materials, airflow and gravity still need separate evidence.'
              : 'No paired NASA test in this snapshot falls inside the selected oxygen and pressure window.'}
          </p>
        </div>
        <div className="unrated-score">
          <strong>Risk score</strong>
          <span>Unrated</span>
          <small>Estimating risk needs a validated model.</small>
        </div>
      </section>
      {controls}
      <a className="button scenario-jump" href="#atmosphere-evidence">
        See matching NASA tests <ArrowDown size={16} aria-hidden="true" />
      </a>
      <AtmosphereEvidence coverage={coverage} scenario={scenario} psi={psi} onInspect={onInspect} />
      <OxygenRanges psi={psi} oxygen={scenario.oxygen} />
      <section className="scenario-risks" aria-label="Fire safety considerations">
        {safety.map(([area, label, Icon, line, informs]) => (
          <article key={area} className="scenario-risk">
            <Icon size={23} aria-hidden="true" />
            <h2>{label}</h2>
            <p>{line}</p>
            <p className="muted">
              <strong>Informs:</strong> {informs}
            </p>
            <div className="psi-links">
              {psi.investigations
                .filter((item) => item.area === area)
                .sort((a, b) => position.get(a.acc) - position.get(b.acc))
                .slice(0, 3)
                .map((item) => (
                  <PsiTag
                    key={item.acc}
                    investigation={item}
                    label={item.acronym + ' · ' + item.acc}
                  />
                ))}
            </div>
          </article>
        ))}
      </section>
      <section className="scenario-evidence">
        <h2>What the evidence says</h2>
        <p>
          <strong>Evidence:</strong> {exact.length} tests fall inside the cabin window and{' '}
          {nearby.length - exact.length} more fall within the wider window.
        </p>
        <p>
          <strong>Interpretation:</strong> Compare fuel, geometry and airflow before drawing
          conclusions from nearby tests.
        </p>
        <p>
          <strong>Safety consideration:</strong> Use the results to plan follow-up tests. Cabin
          qualification needs separate engineering evidence.
        </p>
        <a className="button primary" href={analystUrl(question, scenario)}>
          Ask the AI about this habitat
        </a>
      </section>
      <details className="legacy-evidence">
        <summary>Open the investigation ranking, exports and full methods</summary>
        <HabitatResults dataset={dataset} habitat={scenario} onInspect={onInspect} />
      </details>
    </>
  );
}
