import { useState } from 'react';
import ScenarioResult from './ScenarioResult.jsx';
import { Field, PageTitle } from './ui.jsx';
import { scenarioProfiles } from '../lib/scenario.mjs';
import { presetLinks } from './missionDestinations.mjs';

export default function Scenario({ dataset, scenario, run, onInspect }) {
  const [oxygen, setOxygen] = useState(scenario.oxygen);
  const [pressure, setPressure] = useState(scenario.atm);
  const [gravity, setGravity] = useState(scenario.gravityG);
  const controls = (
    <details className="scenario-adjust" open={!run}>
      <summary>Adjust conditions</summary>
      <form
        className="scenario-form"
        onSubmit={(event) => {
          event.preventDefault();
          window.location.assign(
            '/scenario?' + new URLSearchParams({ preset: scenario.id, oxygen, pressure, gravity }),
          );
        }}
      >
        <Field label="Oxygen (%)">
          <input
            type="number"
            min="0"
            max="100"
            step="any"
            required
            value={oxygen}
            onChange={(event) => setOxygen(event.target.value)}
          />
        </Field>
        <Field label="Air pressure (atm)">
          <input
            type="number"
            min="0.01"
            max="10"
            step="any"
            required
            value={pressure}
            onChange={(event) => setPressure(event.target.value)}
          />
        </Field>
        <Field label="Gravity (g)">
          <input
            type="number"
            min="0"
            max="5"
            step="any"
            required
            value={gravity}
            onChange={(event) => setGravity(event.target.value)}
          />
        </Field>
        <button className="primary" type="submit">
          Compare with NASA tests
        </button>
      </form>
    </details>
  );
  return run ? (
    <ScenarioResult
      dataset={dataset}
      scenario={scenario}
      onInspect={onInspect}
      controls={controls}
    />
  ) : (
    <>
      <PageTitle
        title="Compare cabin conditions"
        description="Choose a habitat or set your own oxygen, pressure and gravity. See which NASA tests have similar air and open the original measurements."
      />
      <nav aria-label="Habitat presets" className="scenario-presets">
        {scenarioProfiles
          .filter(({ id }) => id !== 'custom')
          .map(({ id, name }) => (
            <a key={id} className="button" href={presetLinks[id]}>
              {name}
            </a>
          ))}
      </nav>
      {controls}
    </>
  );
}
