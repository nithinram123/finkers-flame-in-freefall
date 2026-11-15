import { ArrowRight, ArrowUpRight, ChartScatter, FlaskConical, MessageCircle } from 'lucide-react';
import { presetLinks } from './missionDestinations.mjs';
import Reveal from './Reveal.jsx';

const tools = [
  {
    title: 'Habitat comparison',
    Icon: FlaskConical,
    to: '/scenario',
    summary: 'Find NASA tests near the air your crew will use.',
    detail: 'Choose a preset or enter ambient oxygen and pressure to find close and wider matches.',
  },
  {
    title: 'Experiment explorer',
    Icon: ChartScatter,
    to: '/explorer',
    summary: 'Trace combustion measurements to the original CSV.',
    detail:
      'Filter by investigation, fuel and outcome. Open a plotted group or test row to see the measurements.',
  },
  {
    title: 'Ask the evidence',
    Icon: MessageCircle,
    to: '/analyst',
    summary: 'Find an answer with citations you can inspect.',
    detail:
      'Ask about a fuel, test result or cabin. Open original NASA test rows or search related NASA publications.',
  },
];

export default function AstroSections({ coverage, scenario, count, dataError }) {
  const close = coverage?.exact.length;
  const wider = coverage ? coverage.nearby.length - close : null;
  const stats = [
    [close, 'Close matches'],
    [wider, 'Wider matches'],
    [coverage?.paired.length, 'Paired tests'],
    [count, 'Investigations'],
  ];

  return (
    <>
      <section className="finkers-case" id="lunar-evidence" aria-labelledby="astro-mission-title">
        <div className="finkers-section-inner">
          <Reveal className="finkers-case-intro">
            <p className="finkers-case-meta">
              Moon Base preset · {scenario.oxygen}% O₂ · {scenario.atm} atm
            </p>
            <h2 id="astro-mission-title">Has NASA tested fire in lunar cabin air?</h2>
            <p>
              {coverage
                ? close
                  ? 'Some tests matched the preset oxygen and pressure. Open the closest records to compare fuels, airflow and gravity.'
                  : 'No tests in the archive match the Moon Base air closely. Wider matches show which experiments to review next.'
                : dataError
                  ? 'The NASA snapshot could not load. Refresh the page to see test coverage.'
                  : 'Loading test coverage from NASA’s combustion snapshot…'}
            </p>
            <a className="button" href={presetLinks.moon}>
              Examine the Moon Base evidence <ArrowRight size={17} aria-hidden="true" />
            </a>
          </Reveal>
          <Reveal as="dl" className="finkers-case-stats" aria-live="polite">
            {stats.map(([value, label]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value == null ? '—' : value.toLocaleString('en')}</dd>
              </div>
            ))}
          </Reveal>
          <details className="finkers-case-methods">
            <summary>How we match cabin air</summary>
            <p>
              Close matches are within ±2 oxygen percentage points and ±0.05 atm. The wider window
              uses ±6 points and ±0.15 atm. Only nonduplicate tests with ambient oxygen and positive
              pressure enter the comparison.
            </p>
          </details>
        </div>
      </section>
      <section className="finkers-workflow" id="research-tools" aria-labelledby="astro-tools-title">
        <div className="finkers-section-inner">
          <Reveal as="header">
            <h2 id="astro-tools-title">Follow the evidence.</h2>
          </Reveal>
          <div className="finkers-tool-grid">
            {tools.map(({ title, Icon, to, summary, detail }) => (
              <Reveal as="article" className="finkers-tool" key={to}>
                <Icon
                  className="finkers-tool-icon"
                  size={26}
                  strokeWidth={1.55}
                  aria-hidden="true"
                />
                <h3>{title}</h3>
                <p>{summary}</p>
                <details>
                  <summary>What you can do</summary>
                  <p>{detail}</p>
                </details>
                <a href={to}>
                  Open {title.toLowerCase()} <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
