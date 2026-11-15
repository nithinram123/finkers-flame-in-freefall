import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import ScenarioResult from './ScenarioResult.jsx';
import { EvidenceSteps, SnapshotReadout } from './EvidenceWorkspace.jsx';
import { Field, PageTitle } from './ui.jsx';
import { scenarioProfiles } from '../lib/scenario.mjs';
import { presetLinks } from './missionDestinations.mjs';

export default function Scenario({ dataset, scenario, run, onInspect }) {
  const [oxygen, setOxygen] = useState(scenario.oxygen);
  const [pressure, setPressure] = useState(scenario.atm);
  const [gravity, setGravity] = useState(scenario.gravityG);
  const form = (
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
  );
  return run ? (
    <ScenarioResult
      dataset={dataset}
      scenario={scenario}
      onInspect={onInspect}
      controls={
        <details className="scenario-adjust">
          <summary>Adjust conditions</summary>
          {form}
        </details>
      }
    />
  ) : (
    <>
      <PageTitle
        title="Fire Evidence Dashboard"
        description="Choose a habitat or enter your cabin’s conditions. See which NASA tests match the air, where evidence is missing, and what the recorded tests actually measured."
      />
      <EvidenceSteps current="dashboard" />
      <div className="scenario-start">
        <section className="scenario-start-card" aria-labelledby="pick-cabin">
          <h2 id="pick-cabin">Choose a cabin</h2>
          <p>Each preset opens a comparison with the measured NASA records.</p>
          <nav aria-label="Habitat presets" className="scenario-presets">
            {scenarioProfiles
              .filter(({ id }) => id !== 'custom')
              .map(({ id, name, oxygen, atm }) => (
                <a key={id} className="button" href={presetLinks[id]}>
                  <span>
                    {name}
                    <small>
                      {oxygen}% O₂ · {atm} atm
                    </small>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              ))}
          </nav>
        </section>
        <section className="scenario-start-card" aria-labelledby="custom-cabin">
          <h2 id="custom-cabin">Set your own conditions</h2>
          <p>Oxygen and pressure determine the matching windows. Gravity is shown for context.</p>
          {form}
        </section>
      </div>
      <SnapshotReadout dataset={dataset} />
    </>
  );
}
