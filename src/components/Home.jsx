import { useState } from 'react';
import {
  ArrowRight,
  ChartScatter,
  Globe2,
  MapPin,
  MessageCircle,
  Moon,
  SlidersHorizontal,
  Satellite,
  Truck,
} from 'lucide-react';
import { FlameDemo } from './Habitat.jsx';
import { isPaired } from '../lib/habitat.mjs';
import { scenarioProfiles } from '../lib/scenario.mjs';
import { analystUrl } from '../lib/routes.mjs';

const icons = [Satellite, Moon, Truck, Globe2, SlidersHorizontal];
const steps = [
  [MapPin, 'Pick a habitat'],
  [ChartScatter, 'See the risks'],
  [MessageCircle, 'Ask the AI'],
];

export default function Home({ dataset }) {
  const [question, setQuestion] = useState('');
  return (
    <div className="mission-home">
      <header className="mission-intro">
        <h1>How dangerous is fire where your crew will live?</h1>
        <p>
          Pick a habitat. We compare its air with{' '}
          {dataset.records.filter(isPaired).length.toLocaleString('en')} paired fire test records
          from {dataset.investigations.length} NASA investigations and show the risks, the evidence
          and the gaps.
        </p>
      </header>
      <div className="mission-cards">
        {scenarioProfiles.map((habitat, index) => {
          const Icon = icons[index];
          return (
            <a key={habitat.id} className="mission-card" href={'/scenario?preset=' + habitat.id}>
              <Icon size={26} aria-hidden="true" strokeWidth={1.6} />
              <strong>{habitat.name}</strong>
              <small>
                {habitat.id === 'custom'
                  ? 'Set your own cabin air and gravity'
                  : habitat.oxygen +
                    '% O₂ · ' +
                    habitat.atm.toFixed(habitat.atm === 1 ? 1 : 2) +
                    ' atm · ' +
                    habitat.gravityG +
                    ' g'}
              </small>
              {habitat.note && <small>({habitat.note})</small>}
            </a>
          );
        })}
      </div>
      <section className="mission-steps" aria-labelledby="mission-steps-title">
        <h2 id="mission-steps-title">How it works</h2>
        <ol>
          {steps.map(([Icon, label]) => (
            <li key={label}>
              <Icon size={18} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ol>
      </section>
      <form
        className="mission-ask"
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim()) window.location.assign(analystUrl(question.trim()));
        }}
      >
        <label htmlFor="home-question">Ask the AI</label>
        <div>
          <input
            id="home-question"
            maxLength={500}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Why does fire behave differently in space?"
            required
          />
          <button className="primary" type="submit">
            Ask <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </form>
      <FlameDemo />
    </div>
  );
}
