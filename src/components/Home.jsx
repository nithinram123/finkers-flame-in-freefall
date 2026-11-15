import { ArrowDown, ArrowRight, ArrowUpRight, Database, Orbit } from 'lucide-react';
import { FlameDemo } from './Habitat.jsx';
import { readScenario, scenarioCoverage, scenarioProfiles } from '../lib/scenario.mjs';
import { analystUrl } from '../lib/routes.mjs';
import MissionMap from './MissionMap.jsx';
import { presetLinks } from './missionDestinations.mjs';
import './orbit.css';

const moon = readScenario(new URLSearchParams({ preset: 'moon' }));

export default function Home({ dataset, dataError }) {
  const coverage = dataset && scenarioCoverage(dataset.records, moon);
  const wider = coverage && coverage.nearby.length - coverage.exact.length;
  return (
    <div className="orbit-home">
      <section className="orbit-hero">
        <div className="orbit-intro">
          <h1>Has NASA tested fire in your cabin’s air?</h1>
          <p>
            Pick a habitat or enter its oxygen and pressure. See which NASA fire tests match those
            conditions, where the data runs out, and open the original measurements.
          </p>
          <div className="orbit-hero-actions">
            <a className="orbit-action" href="/scenario">
              Compare cabin conditions <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a className="orbit-quiet-link" href={presetLinks.moon}>
              Try Moon Base <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
          <p className="orbit-data-credit">
            <Database size={16} aria-hidden="true" />
            <a href="/data-sources#apis">NASA Physical Sciences Informatics</a>
          </p>
        </div>
        <MissionMap />
      </section>

      <nav className="orbit-quick" aria-label="Quick destinations">
        <strong>Explore the data</strong>
        <a href="#flight-path">
          How cabin matching works <ArrowDown size={15} aria-hidden="true" />
        </a>
        <a href="/explorer">
          Experiments <ArrowUpRight size={15} aria-hidden="true" />
        </a>
        <a href="/neural">
          Neural Lab <ArrowUpRight size={15} aria-hidden="true" />
        </a>
        <a href="/analyst">
          Ask the Evidence <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </nav>

      <section className="orbit-flight" id="flight-path" aria-labelledby="flight-path-title">
        <div className="orbit-flight-title">
          <Orbit size={24} aria-hidden="true" />
          <h2 id="flight-path-title">Follow the evidence</h2>
        </div>
        <ol>
          <li>
            <div>
              <h3>Set the cabin</h3>
              <p>
                Start with a habitat or enter oxygen, pressure, and gravity for your own scenario.
              </p>
            </div>
            <div className="orbit-habitats">
              {scenarioProfiles.map(({ id, name }) => (
                <a key={id} href={presetLinks[id]}>
                  {name} <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              ))}
            </div>
          </li>
          <li>
            <div>
              <h3>Find the evidence gap</h3>
              <p>
                The Moon Base preset asks which tests come close to 34% oxygen and 0.57 atmospheres.
                Matching air is a starting point for choosing experiments to review.
              </p>
            </div>
            <div className="orbit-readout">
              {coverage ? (
                <dl>
                  <div>
                    <dt>Close Moon Base matches</dt>
                    <dd>{coverage.exact.length}</dd>
                  </div>
                  <div>
                    <dt>Wider matches</dt>
                    <dd>{wider}</dd>
                  </div>
                  <div>
                    <dt>Tests with both measurements</dt>
                    <dd>{coverage.paired.length}</dd>
                  </div>
                </dl>
              ) : (
                <p role="status">
                  {dataError
                    ? 'The NASA snapshot could not load. Reopen the page to retry.'
                    : 'Loading NASA experiment counts…'}
                </p>
              )}
              <a href={presetLinks.moon}>
                Open the Moon Base analysis <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </li>
          <li>
            <div>
              <h3>Check what the model learned</h3>
              <p>
                Compare the FLEX neural network with a simple baseline on NASA droplet tests held
                out from training.
              </p>
            </div>
            <div className="orbit-habitats">
              <a href="/neural#neural-audit">
                Open the FLEX model check <ArrowUpRight size={15} aria-hidden="true" />
              </a>
              <a href={analystUrl('What has NASA tested near the Moon Base atmosphere?', moon)}>
                Ask about Moon Base <ArrowUpRight size={15} aria-hidden="true" />
              </a>
              <a href="/data-sources#apis">
                See data and API details <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </div>
          </li>
        </ol>
        <div className="orbit-demo">
          <FlameDemo />
        </div>
      </section>
    </div>
  );
}
