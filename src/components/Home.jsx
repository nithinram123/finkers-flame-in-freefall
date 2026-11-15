import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import AstroSections from './AstroSections.jsx';
import LandingAsk from './LandingAsk.jsx';
import MoonScene from './MoonScene.jsx';
import { readScenario, scenarioCoverage } from '../lib/scenario.mjs';
import { presetLinks } from './missionDestinations.mjs';
import './landing.css';

const moon = readScenario(new URLSearchParams({ preset: 'moon' }));
const palette = ['#1021a9', '#1b36f2', '#4f6bff', '#a3b2ff', '#eceeff'];

function PixelField({ coarse = false }) {
  const surface = useRef(null);
  useEffect(() => {
    const canvas = surface.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width, height } = canvas;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = x / width;
        const v = y / height;
        const band = Math.sin(u * 6.5 - v * 4.8) * 0.19;
        const glow = (1 - Math.hypot(u - 0.28, v - 0.2)) * 0.38;
        const grain = ((x * 47 + y * 67 + x * y * 19) % 31) / 168;
        const shade = Math.max(0, Math.min(4, Math.floor((0.18 + band + glow + grain) * 6)));
        context.fillStyle = palette[shade];
        context.fillRect(x, y, 1, 1);
      }
    }
  }, []);
  return (
    <canvas
      ref={surface}
      className={coarse ? 'finkers-mosaic-coarse' : 'finkers-mosaic-fine'}
      width={coarse ? 26 : 108}
      height={coarse ? 13 : 54}
      aria-hidden="true"
    />
  );
}

export default function Home({ dataset, dataError, generationProvider, onInspect }) {
  const controller = useRef(null);
  const coverage = dataset ? scenarioCoverage(dataset.records, moon) : null;

  function moveLight(event) {
    if (event.pointerType === 'touch' && !event.buttons) return;
    const hero = event.currentTarget;
    const bounds = hero.getBoundingClientRect();
    hero.style.setProperty('--light-x', event.clientX - bounds.left + 'px');
    hero.style.setProperty('--light-y', event.clientY - bounds.top + 'px');
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
    <div className="finkers-landing">
      <section className="finkers-intro" aria-labelledby="lunar-title">
        <h1 id="lunar-title">Explore how fire behaves in space.</h1>
        <p>
          Compare your cabin with NASA combustion experiments and trace each answer back to the
          evidence.
        </p>
        <div className="finkers-intro-actions">
          <a className="button primary" href="/scenario">
            Compare cabin conditions <ArrowRight size={17} aria-hidden="true" />
          </a>
          <a className="button" href={presetLinks.moon}>
            Try Moon Base <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
      <section
        className="lunar-hero"
        aria-label="NASA evidence assistant and interactive Moon"
        onPointerMove={moveLight}
        onPointerLeave={(event) => {
          delete event.currentTarget.dataset.relighting;
          event.currentTarget.style.removeProperty('--light-x');
          event.currentTarget.style.removeProperty('--light-y');
          controller.current?.light(-0.48, 0.42);
        }}
      >
        <div className="finkers-mosaic" aria-hidden="true">
          <PixelField />
          <PixelField coarse />
        </div>
        <div className="lunar-hero-spot" aria-hidden="true" />
        <div className="lunar-hero-grid">
          <LandingAsk
            dataset={dataset}
            dataError={dataError}
            generationProvider={generationProvider}
            onInspect={onInspect}
          />
          <MoonScene controller={controller} />
        </div>
      </section>
      <div className="lunar-hero-rail">
        <span>
          Moon Base preset · {moon.oxygen}% O₂ · {moon.atm} atm
        </span>
        <a href="#lunar-evidence">
          See the Moon Base evidence <ArrowDown size={16} aria-hidden="true" />
        </a>
      </div>
      <AstroSections
        coverage={coverage}
        scenario={moon}
        count={dataset?.stats.investigations}
        dataError={dataError}
      />
      <div className="lunar-credits">
        <span>
          Moon imagery{' '}
          <a href="https://svs.gsfc.nasa.gov/4720/">NASA’s Scientific Visualization Studio</a>
        </span>
      </div>
    </div>
  );
}
