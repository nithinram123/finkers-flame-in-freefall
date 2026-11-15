import { ArrowRight, ArrowUpRight, CheckCircle2, CircleHelp, Moon, Sparkles } from 'lucide-react';
import { readScenario, scenarioCoverage } from '../lib/scenario.mjs';
import { presetLinks } from './missionDestinations.mjs';

const moon = readScenario(new URLSearchParams({ preset: 'moon' }));
const count = new Intl.NumberFormat('en');
const format = (value) => (value == null ? '—' : count.format(value));
const method = [
  [
    'Cabin matching',
    'Choose a habitat or enter your own conditions.',
    'Compare ambient oxygen and air pressure.',
    'Count tests in close and wider windows.',
    'Open the original NASA measurements.',
  ],
  [
    'Evidence checks',
    'Use tests that report both measurements.',
    'Keep burner oxygen separate from cabin air.',
    'Exclude summaries and duplicate rows.',
    'Flag gaps in gravity, fuel, and test coverage.',
  ],
];

export default function Home({ dataset, dataError }) {
  const coverage = dataset ? scenarioCoverage(dataset.records, moon) : null;
  const close = coverage?.exact.length;
  const wider = coverage ? coverage.nearby.length - close : null;
  return (
    <div className="sky-home">
      <section className="sky-method" aria-labelledby="sky-headline">
        <h1 id="sky-headline">Method Overview</h1>
        <p className="sky-intro">
          Compare your crew cabin’s atmosphere with NASA combustion tests. See what was measured,
          what applies, and where evidence is missing.
        </p>
        <div className="sky-method-grid">
          {method.map(([title, ...steps]) => (
            <article className="sky-method-card" key={title}>
              <h2>{title}</h2>
              <ol>
                {steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>
      <article className="sky-case" aria-labelledby="sky-case-title">
        <div className="sky-case-meta">
          <span className="sky-status">
            <Moon size={13} aria-hidden="true" /> Cabin study
          </span>
          <span className="sky-label">NASA PSI</span>
        </div>
        <Sparkles className="sky-case-icon" size={29} aria-hidden="true" />
        <h2 id="sky-case-title">Moon Base Atmosphere Analysis</h2>
        <p className="sky-case-intro">
          How closely do published NASA experiments match a proposed lunar cabin?
        </p>
        <div className="sky-case-grid">
          <section>
            <h3>Cabin Conditions</h3>
            <dl className="sky-reading">
              <div>
                <dt>Ambient oxygen</dt>
                <dd>{moon.oxygen}%</dd>
              </div>
              <div>
                <dt>Air pressure</dt>
                <dd>{moon.atm} atm</dd>
              </div>
              <div>
                <dt>Surface gravity</dt>
                <dd>{moon.gravityG} g</dd>
              </div>
              <div>
                <dt>Scenario</dt>
                <dd>Illustrative preset</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>NASA Test Coverage</h3>
            <dl className="sky-reading sky-coverage" aria-live="polite">
              <div>
                <dt>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Close matches
                </dt>
                <dd>{format(close)}</dd>
              </div>
              <div>
                <dt>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Additional wider matches
                </dt>
                <dd>{format(wider)}</dd>
              </div>
              <div>
                <dt>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Tests with both measurements
                </dt>
                <dd>{format(coverage?.paired.length)}</dd>
              </div>
              <div>
                <dt>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Investigations in the archive
                </dt>
                <dd>{format(dataset?.stats.investigations)}</dd>
              </div>
            </dl>
          </section>
        </div>
        <div className="sky-finding">
          <span className="sky-finding-icon">
            <CircleHelp size={20} aria-hidden="true" />
          </span>
          <div>
            <h3>
              {coverage
                ? close
                  ? 'NASA has tested similar air'
                  : 'The exact cabin conditions remain untested'
                : 'Check the cabin against NASA’s archive'}
            </h3>
            <p>
              {coverage
                ? close
                  ? 'Air matches help identify relevant tests. Fuel, airflow and gravity still matter.'
                  : 'Nearby experiments help plan follow-up tests. The archive leaves fire risk at this combination uncertain.'
                : dataError
                  ? 'The NASA snapshot could not load. Refresh the page to try again.'
                  : 'Loading NASA test coverage…'}
            </p>
          </div>
        </div>
        <div className="sky-case-actions">
          <a className="button sky-primary" href={presetLinks.moon}>
            Open Moon Base analysis <ArrowRight size={17} aria-hidden="true" />
          </a>
          <a className="sky-secondary" href="/scenario">
            Compare another cabin <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </article>
    </div>
  );
}
