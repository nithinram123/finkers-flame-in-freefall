import { useRef } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Database } from 'lucide-react';
import AstroSections from './AstroSections.jsx';
import MoonScene from './MoonScene.jsx';
import { readScenario, scenarioCoverage } from '../lib/scenario.mjs';
import { presetLinks } from './missionDestinations.mjs';
import './landing.css';

const moon = readScenario(new URLSearchParams({ preset: 'moon' }));

const stars = Array.from({ length: 92 }, (_, index) => ({
  x: ((index * 0.61803398875) % 1) * 1200,
  y: ((index * 0.754877666) % 1) * 660,
  r: index % 13 === 0 ? 1.35 : 0.45 + (index % 4) * 0.15,
  opacity: 0.16 + (index % 7) * 0.075,
}));

export default function Home({ dataset, dataError }) {
  const controller = useRef(null);
  const coverage = dataset ? scenarioCoverage(dataset.records, moon) : null;

  function moveLight(event) {
    if (event.pointerType === 'touch' && !event.buttons) return;
    const hero = event.currentTarget;
    const bounds = hero.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    hero.style.setProperty('--light-x', x + 'px');
    hero.style.setProperty('--light-y', y + 'px');
    hero.dataset.relighting = 'true';
    const globe = hero.querySelector('.lunar-globe').getBoundingClientRect();
    if (globe.width) {
      controller.current?.light(
        2.2 * ((event.clientX - globe.left) / globe.width - 0.5),
        2.2 * (0.5 - (event.clientY - globe.top) / globe.height),
      );
    }
  }

  return (
    <div className="lunar-landing">
      <section
        className="lunar-hero"
        aria-labelledby="lunar-title"
        onPointerMove={moveLight}
        onPointerLeave={(event) => {
          delete event.currentTarget.dataset.relighting;
          event.currentTarget.style.removeProperty('--light-x');
          event.currentTarget.style.removeProperty('--light-y');
          controller.current?.light(-0.48, 0.42);
        }}
      >
        <svg
          className="lunar-stars"
          viewBox="0 0 1200 660"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {stars.map(({ x, y, r, opacity }) => (
            <circle key={x} cx={x} cy={y} r={r} opacity={opacity} />
          ))}
        </svg>
        <div className="lunar-hero-spot" aria-hidden="true" />
        <div className="lunar-hero-grid">
          <div className="lunar-hero-copy">
            <h1 id="lunar-title">
              <span>Fire in</span> <span>freefall.</span>
            </h1>
            <p>
              Compare the air in your crew cabin with NASA combustion tests. Find the closest
              experiments, inspect the evidence, and see where the data runs out.
            </p>
            <div className="lunar-actions">
              <a className="button lunar-primary" href="/scenario">
                Compare cabin conditions <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="lunar-hero-link" href={presetLinks.moon}>
                Try Moon Base <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
            <a className="lunar-source" href="/data-sources">
              <Database size={15} aria-hidden="true" /> NASA Physical Sciences Informatics
            </a>
          </div>
          <MoonScene controller={controller} />
        </div>
        <div className="lunar-hero-rail">
          <span>
            <span className="lunar-rail-dot" /> Moon Base preset · {moon.oxygen}% O₂ · {moon.atm}{' '}
            atm
          </span>
          <a href="#lunar-evidence">
            See the Moon Base evidence <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
      <AstroSections
        coverage={coverage}
        scenario={moon}
        count={dataset?.stats.investigations}
        dataError={dataError}
      />
      <div className="lunar-credits">
        <a href="/briefing">
          Project walkthrough <ArrowUpRight size={14} aria-hidden="true" />
        </a>
        <span>
          Moon imagery{' '}
          <a href="https://svs.gsfc.nasa.gov/4720/">NASA’s Scientific Visualization Studio</a>
        </span>
        <span>
          Poster layout adapted from{' '}
          <a href="https://21st.dev/@kedhareswer/library/astro-association">Astro Association</a>
        </span>
      </div>
    </div>
  );
}
