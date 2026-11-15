import { useId } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChartScatter,
  FlaskConical,
  Flame,
  MessageCircle,
  Plus,
} from 'lucide-react';
import { presetLinks } from './missionDestinations.mjs';

// Confetti distribution and card reveal adapted from Kedhareswer Naidu's
// Astro Association template, distributed under the MIT license.
const colors = ['#313167', '#4c448e', '#6a55b0', '#8b73d4', '#b6a1ef', '#689ab9', '#8cc8d9'];
const format = (value) => (value == null ? '—' : value.toLocaleString('en'));

function randomize(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildField(seed, width, height, amount, unit) {
  const random = randomize(seed);
  return Array.from({ length: amount }, (_, id) => {
    const r = unit * (0.22 + 1.3 * random() ** 2.3);
    return {
      id,
      r,
      cx: random() * (width + r) - r / 2,
      cy: random() * (height + r) - r / 2,
      fill: colors[Math.floor(random() * colors.length)],
    };
  }).sort((a, b) => b.r - a.r);
}

const masthead = buildField(103, 1200, 250, 270, 39);
const ribbonField = buildField(104, 1400, 110, 210, 32);
const dossierFields = [105, 106, 107].map((seed) => buildField(seed, 500, 145, 55, 27));

function CircleField({ field, width, height, cutout = false }) {
  const maskId = useId();
  return (
    <svg
      className="astro-circle-field"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {cutout && (
        <defs>
          <mask id={maskId}>
            <rect width={width} height={height} fill="white" />
            <g transform="translate(636 -10) scale(11.4)" fill="black">
              <path d="M8.5 14.5A6 6 0 0 1 6 10a4 4 0 0 0-2 4 8 8 0 1 0 16 0c0-4-2-7-4-8 0 3-1.5 4.5-3 5 1.5-4.5 0-8.5-2.5-10.5C11 3.5 9.5 6 8 8s-1.5 4 0.5 6.5Z" />
            </g>
          </mask>
        </defs>
      )}
      <g mask={cutout ? `url(#${maskId})` : undefined}>
        <rect width={width} height={height} fill="#302961" />
        {field.map(({ id, ...circle }) => (
          <circle key={id} {...circle} />
        ))}
      </g>
    </svg>
  );
}

const dossiers = [
  {
    code: '01',
    title: 'Habitat comparison',
    Icon: FlaskConical,
    to: '/scenario',
    summary: 'Find NASA tests near the air your crew will use.',
    action: 'Compare cabin conditions',
    detail:
      'Choose a preset or enter ambient oxygen and pressure. The result shows close and wider matches and opens their original source rows.',
  },
  {
    code: '02',
    title: 'Experiment explorer',
    Icon: ChartScatter,
    to: '/explorer',
    summary: 'Trace combustion measurements back to the original CSV.',
    action: 'Explore experiment records',
    detail:
      'Filter by investigation, fuel and outcome. Click a plotted group or test record to inspect its reported conditions and download the NASA table.',
  },
  {
    code: '03',
    title: 'Ask the evidence',
    Icon: MessageCircle,
    to: '/analyst',
    summary: 'Start with a question and find the records that can answer it.',
    action: 'Ask a question',
    detail:
      'Questions start with public NASA records. A cabin question also calculates test coverage around the selected atmosphere.',
  },
];

function Dossier({ item, index }) {
  const { code, title, Icon, summary, detail, to, action } = item;
  return (
    <article className="astro-dossier">
      <div
        className="astro-dossier-top"
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse') return;
          const element = event.currentTarget;
          const rect = element.getBoundingClientRect();
          element.style.setProperty('--pointer-x', event.clientX - rect.left + 'px');
          element.style.setProperty('--pointer-y', event.clientY - rect.top + 'px');
        }}
      >
        <CircleField field={dossierFields[index]} width={500} height={145} />
        <span className="astro-dossier-number" aria-label={'Workflow step ' + Number(code)}>
          {code}
        </span>
        <Icon size={29} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <div className="astro-dossier-body">
        <h3>{title}</h3>
        <p>{summary}</p>
        <details>
          <summary>
            <Plus size={16} aria-hidden="true" /> What you can do
          </summary>
          <p>{detail}</p>
        </details>
        <a href={to}>
          {action} <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export default function AstroSections({ coverage, scenario, count, dataError }) {
  const close = coverage?.exact.length;
  const wider = coverage ? coverage.nearby.length - close : null;
  const stats = [
    [close, 'Close Moon Base matches'],
    [wider, 'Additional wider matches'],
    [coverage?.paired.length, 'Tests with both measurements'],
    [count, 'NASA investigations'],
  ];
  return (
    <>
      <section className="astro-mission" id="lunar-evidence" aria-labelledby="astro-mission-title">
        <div className="astro-mission-band" aria-hidden="true">
          <CircleField field={masthead} width={1200} height={250} cutout />
          <span>
            Combustion
            <br />
            in freefall
          </span>
          <Flame size={24} strokeWidth={1.7} />
        </div>
        <div className="astro-mission-inner">
          <div className="astro-meta">
            <span>Moon Base case study</span>
            <span>
              {scenario.oxygen}% O₂ · {scenario.atm} atm · {scenario.gravityG} g
            </span>
            <a href="/data-sources">
              NASA PSI snapshot <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </div>
          <div className="astro-mission-grid">
            <div>
              <h2 id="astro-mission-title">Has NASA tested fire in lunar cabin air?</h2>
              <p>
                {coverage
                  ? close
                    ? 'Some tests matched the illustrative oxygen and pressure. Open the closest records to compare fuels, airflow and gravity.'
                    : 'The archive contains no close match for the Moon Base preset. The wider matches help show which tests to review next.'
                  : dataError
                    ? 'The NASA snapshot could not load. Refresh the page to see test coverage.'
                    : 'Loading test coverage from NASA’s combustion snapshot…'}
              </p>
              <a className="astro-mission-link" href={presetLinks.moon}>
                Examine the Moon Base evidence <ArrowRight size={17} aria-hidden="true" />
              </a>
              <details className="astro-methods">
                <summary>How we match cabin air</summary>
                <p>
                  Close matches fall within ±2 oxygen percentage points and ±0.05 atm. The wider
                  window is ±6 points and ±0.15 atm. Summaries, duplicate rows and burner-stream
                  oxygen are excluded. A match describes the air conditions.
                </p>
              </details>
            </div>
            <dl className="astro-stats" aria-live="polite">
              {stats.map(([value, label]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{format(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
      <section className="astro-workflow" id="research-tools" aria-labelledby="astro-tools-title">
        <div className="astro-ribbon-stage" aria-hidden="true">
          <span className="astro-stage-type">
            Trace the
            <br />
            evidence.
          </span>
          <div className="astro-ribbon astro-ribbon-dots">
            <CircleField field={ribbonField} width={1400} height={110} />
          </div>
          <div className="astro-ribbon astro-ribbon-ink">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i}>
                Cabin conditions <Flame size={27} /> Test records
              </span>
            ))}
          </div>
        </div>
        <div className="astro-workflow-inner">
          <h2 id="astro-tools-title">Research tools</h2>
          <div className="astro-dossiers">
            {dossiers.map((item, index) => (
              <Dossier key={item.code} item={item} index={index} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
