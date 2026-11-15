import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';

const columns = [
  { name: 'Inputs', x: 18 },
  { name: 'Hidden layer', x: 51 },
  { name: 'Prediction', x: 85 },
];
const measures = ['%', 'kPa', ' mole fraction', ' mole fraction', ' mole fraction', ' mm'];
const significant = (n) => Number(n.toPrecision(4)).toString();
const nodeY = (index, total) => (total === 1 ? 50 : 8 + (84 * index) / (total - 1));

function Curve({ from, to, weight, lit }) {
  const a = from.x * 10;
  const b = to.x * 10;
  const y1 = from.y * 10;
  const y2 = to.y * 10;
  const bend = (b - a) * 0.48;
  return (
    <path
      d={`M${a} ${y1} C${a + bend} ${y1} ${b - bend} ${y2} ${b} ${y2}`}
      className={`flex-wire ${weight < 0 ? 'flex-wire-negative' : ''}${lit ? ' flex-wire-lit' : ''}`}
      vectorEffect="non-scaling-stroke"
      strokeWidth={lit ? 1.6 + Math.min(Math.abs(weight), 2) : 1}
    />
  );
}

function NodeColumn({ layer, nodes, selection, onSelect }) {
  return nodes.map((node, index) => (
    <button
      className="flex-node"
      key={node.label}
      type="button"
      aria-label={node.label}
      aria-pressed={selection.layer === layer && selection.index === index}
      data-layer={layer}
      data-negative={node.value < 0 ? 'true' : undefined}
      onClick={() => onSelect({ layer, index })}
      style={{ left: columns[layer].x + '%', top: nodeY(index, nodes.length) + '%' }}
    >
      <span className="flex-node-dot">{node.mark}</span>
      {layer !== 1 && (
        <span className="flex-node-label" aria-hidden="true">
          {node.short}
        </span>
      )}
    </button>
  ));
}

function SignalDetails({ audit, example, model, layer, index }) {
  if (layer === 0) {
    const input = example.inputs[index];
    const value =
      index === 6 ? (input ? 'Heptane' : 'Methanol') : significant(input) + measures[index];
    return (
      <>
        <h3>{audit.features[index]}</h3>
        <p>The value used from this FLEX test.</p>
        <dl>
          <div>
            <dt>Recorded input</dt>
            <dd>{value}</dd>
          </div>
          <div>
            <dt>After fold scaling</dt>
            <dd>{significant(example.normalized[index])}</dd>
          </div>
        </dl>
      </>
    );
  }
  if (layer === 1) {
    const inputWeights = model.weights[index].map((weight, i) => ({
      name: audit.features[i],
      weight,
      contribution: weight * example.normalized[i],
    }));
    inputWeights.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    return (
      <>
        <h3>Hidden node {index + 1}</h3>
        <p>
          Each scaled input is multiplied by its learned weight. Their sum and a bias give this
          node’s activation after tanh.
        </p>
        <dl>
          <div>
            <dt>Activation</dt>
            <dd>{significant(example.activations[index])}</dd>
          </div>
          <div>
            <dt>Node bias</dt>
            <dd>{significant(model.bias[index])}</dd>
          </div>
          <div>
            <dt>Weight into prediction</dt>
            <dd>{significant(model.head[index])}</dd>
          </div>
        </dl>
        <table className="flex-weights">
          <thead>
            <tr>
              <th scope="col">Input</th>
              <th scope="col">Weight</th>
              <th scope="col">Scaled × weight</th>
            </tr>
          </thead>
          <tbody>
            {inputWeights.map(({ name, weight, contribution }) => (
              <tr key={name}>
                <th scope="row">{name}</th>
                <td>{significant(weight)}</td>
                <td>{significant(contribution)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }
  return (
    <>
      <h3>Predicted burn time</h3>
      <p>
        The model combines hidden activations in log seconds and converts the result to seconds.
      </p>
      <dl>
        <div>
          <dt>Neural estimate</dt>
          <dd>{significant(example.predicted)} s</dd>
        </div>
        <div>
          <dt>NASA measurement</dt>
          <dd>{significant(example.observed)} s</dd>
        </div>
        <div>
          <dt>Absolute prediction error</dt>
          <dd>{significant(Math.abs(example.predicted - example.observed))} s</dd>
        </div>
      </dl>
    </>
  );
}

export default function FlexNetwork({ audit, example }) {
  const [selection, setSelection] = useState({ layer: 0, index: 0 });
  const [tracing, setTracing] = useState(false);
  const timers = useRef([]);
  const model = audit.folds[example.fold - 1].model;
  const inputNames = ['O₂', 'Pressure', 'N₂', 'CO₂', 'He', 'Diameter', 'Fuel'];
  const inputs = audit.features.map((label, i) => ({ label, short: inputNames[i] }));
  const hidden = example.activations.map((value, i) => ({
    label: 'Hidden node ' + (i + 1),
    mark: i + 1,
    value,
  }));
  const output = { label: 'Predicted burn time', short: 'Seconds' };
  const clearTrace = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function select(next) {
    clearTrace();
    setTracing(false);
    setSelection(next);
  }

  function trace() {
    clearTrace();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSelection({ layer: 2, index: 0 });
      return;
    }
    setTracing(true);
    setSelection({ layer: 0, index: 0 });
    timers.current = [
      setTimeout(() => setSelection({ layer: 1, index: 0 }), 530),
      setTimeout(() => {
        setSelection({ layer: 2, index: 0 });
        setTracing(false);
      }, 1060),
    ];
  }

  const isSelected = (layer, index) =>
    selection.layer === layer && (selection.index === index || tracing);
  const position = (layer, index, count) => ({ x: columns[layer].x, y: nodeY(index, count) });
  return (
    <div className="neural-diagram">
      <div className="flex-diagram-tools">
        <div className="flex-layer-controls" role="group" aria-label="Network layers">
          {columns.map(({ name }, layer) => (
            <button
              type="button"
              key={name}
              aria-pressed={selection.layer === layer}
              onClick={() => select({ layer, index: 0 })}
            >
              {name}
            </button>
          ))}
        </div>
        <button type="button" className="flex-trace" onClick={trace}>
          <Play size={15} aria-hidden="true" /> Trace this prediction
        </button>
      </div>
      <div
        className="flex-canvas"
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse') return;
          const element = event.currentTarget;
          const { left, top } = element.getBoundingClientRect();
          element.style.setProperty('--spot-x', `${event.clientX - left}px`);
          element.style.setProperty('--spot-y', `${event.clientY - top}px`);
        }}
      >
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
          {model.weights.map((weights, j) =>
            weights.map((weight, i) => (
              <Curve
                key={i + ':' + j}
                weight={weight}
                from={position(0, i, inputs.length)}
                to={position(1, j, hidden.length)}
                lit={isSelected(0, i) || isSelected(1, j)}
              />
            )),
          )}
          {model.head.map((weight, j) => (
            <Curve
              key={j}
              weight={weight}
              from={position(1, j, hidden.length)}
              to={position(2, 0, 1)}
              lit={isSelected(1, j) || isSelected(2, 0)}
            />
          ))}
        </svg>
        <NodeColumn layer={0} nodes={inputs} selection={selection} onSelect={select} />
        <NodeColumn layer={1} nodes={hidden} selection={selection} onSelect={select} />
        <NodeColumn layer={2} nodes={[output]} selection={selection} onSelect={select} />
      </div>
      <p className="flex-diagram-key">
        Select a node to inspect it. Teal and orange lines show positive and negative weights.
      </p>
      <div className="flex-inspector" aria-live="polite">
        <SignalDetails audit={audit} example={example} model={model} {...selection} />
      </div>
    </div>
  );
}

export function PredictionPlot({ predictions, selected, onSelect }) {
  const max =
    Math.ceil(
      Math.max(...predictions.flatMap(({ observed, predicted }) => [observed, predicted])) / 10,
    ) * 10;
  const left = 42;
  const top = 17;
  const bottom = 188;
  const x = (value) => left + (value / max) * (378 - left);
  const y = (value) => bottom - (value / max) * (bottom - top);
  return (
    <figure className="flex-prediction-plot">
      <h3>How close were the estimates?</h3>
      <p>
        Each dot is one of {predictions.length} held-out FLEX tests. Choose a dot or use the test
        selector above.
      </p>
      <svg
        viewBox="0 0 408 236"
        role="img"
        aria-label="Measured and estimated burn times in seconds. Dots on the diagonal are exact estimates."
      >
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const tick = max * fraction;
          return (
            <g key={tick}>
              <path
                d={`M${left} ${y(tick)}H378 M${x(tick)} ${top}V${bottom}`}
                className="neural-gridline"
              />
              <text x={left - 7} y={y(tick) + 4} textAnchor="end">
                {tick}
              </text>
              <text x={x(tick)} y={bottom + 17} textAnchor="middle">
                {tick}
              </text>
            </g>
          );
        })}
        <path d={`M${left} ${bottom}L378 ${top}`} className="flex-prediction-diagonal" />
        {predictions.map(({ id, observed, predicted }) => (
          <circle
            key={id}
            cx={x(observed)}
            cy={y(predicted)}
            r="4"
            className="flex-prediction-dot"
            onClick={() => onSelect(id)}
          >
            <title>
              {id} · {significant(observed)} s measured · {significant(predicted)} s estimated
            </title>
          </circle>
        ))}
        <circle
          cx={x(selected.observed)}
          cy={y(selected.predicted)}
          r="6"
          className="flex-prediction-selected"
        />
        <text x={left} y="13">
          Estimated (s)
        </text>
        <text x="210" y="227" textAnchor="middle">
          Measured (s)
        </text>
      </svg>
      <figcaption>
        <ArrowRight size={14} aria-hidden="true" /> Points above the diagonal overestimate burn
        time. Points below underestimate it.
      </figcaption>
    </figure>
  );
}
