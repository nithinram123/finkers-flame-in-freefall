import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isPaired } from '../src/lib/habitat.mjs';

const width = 6;
const foldCount = 5;
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return (sorted[mid] + sorted[Math.ceil(sorted.length / 2) - 1]) / 2;
};
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const columns = [
  'N initial ambient composition; mole fraction',
  'CO initial ambient composition; mole fraction',
  'He initial ambient composition; mole fraction',
  'Droplet initial diameter; mm',
];

export function flexSamples(dataset) {
  const tables = new Map(dataset.tables.map((table) => [table.id, table]));
  return dataset.records.flatMap((row) => {
    if (
      row.accession !== 'PSI-69' ||
      !isPaired(row) ||
      !Number.isFinite(row.burnTime?.value) ||
      row.burnTime.value <= 0 ||
      !['Methanol', 'Heptane'].includes(row.fuel)
    )
      return [];
    const header = tables.get(row.tableId)?.headers || [];
    const extra = columns.map((name) => {
      const cell = row.values[header.indexOf(name)];
      return cell?.trim() ? Number(cell) : NaN;
    });
    if (!extra.every(Number.isFinite) || extra[3] <= 0) return [];
    return [
      {
        id: row.id,
        // Keep repeated tests and both fuels in the same approximate atmospheric band together.
        group: `${Math.round(row.oxygen.value)}:${Math.round(row.pressure.value / 5) * 5}`,
        x: [row.oxygen.value, row.pressure.value, ...extra, Number(row.fuel === 'Heptane')],
        observed: row.burnTime.value,
      },
    ];
  });
}

function fit(train, seed) {
  let state = seed;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32 - 0.5;
  const centers = train[0].x.map((_, i) => mean(train.map(({ x }) => x[i])));
  const scales = centers.map((m, i) => Math.sqrt(mean(train.map(({ x }) => (x[i] - m) ** 2))) || 1);
  const scale = (x) => x.map((v, i) => (v - centers[i]) / scales[i]);
  const logCenter = mean(train.map(({ observed }) => Math.log(observed)));
  const samples = train.map(({ x, observed }) => ({
    x: scale(x),
    y: Math.log(observed) - logCenter,
  }));
  const w = Array.from({ length: width }, () => centers.map(() => random() * 0.4));
  const b = w.map(() => 0);
  const head = w.map(() => random() * 0.4);
  let intercept = 0;
  const hidden = (x) => w.map((weights, j) => Math.tanh(dot(weights, x) + b[j]));
  // Full-batch gradient descent, fixed in advance; held-out rows do not choose epochs or weights.
  for (let epoch = 0; epoch < 320; epoch++) {
    const dw = w.map((weights) => weights.map(() => 0));
    const db = b.map(() => 0);
    const dh = head.map(() => 0);
    let di = 0;
    for (const { x, y } of samples) {
      const h = hidden(x);
      const error = dot(head, h) + intercept - y;
      di += error;
      for (let j = 0; j < width; j++) {
        dh[j] += error * h[j];
        const grad = error * head[j] * (1 - h[j] ** 2);
        db[j] += grad;
        for (let i = 0; i < x.length; i++) dw[j][i] += grad * x[i];
      }
    }
    const step = 0.035 / samples.length;
    const decay = 1 - 0.035 * 0.002;
    intercept -= step * di;
    for (let j = 0; j < width; j++) {
      head[j] = decay * head[j] - step * dh[j];
      b[j] -= step * db[j];
      for (let i = 0; i < w[j].length; i++) w[j][i] = decay * w[j][i] - step * dw[j][i];
    }
  }
  const predict = (raw) => {
    const normalized = scale(raw);
    const activations = hidden(normalized);
    return {
      predicted: Math.exp(logCenter + intercept + dot(head, activations)),
      activations,
      normalized,
    };
  };
  return { predict, model: { weights: w, bias: b, head, logCenter, intercept } };
}

export function auditModel(dataset) {
  const samples = flexSamples(dataset);
  const counts = new Map();
  for (const { group } of samples) counts.set(group, (counts.get(group) || 0) + 1);
  if (counts.size < foldCount)
    throw new Error('Not enough FLEX atmospheric groups for held-out checks');
  const folds = Array.from({ length: foldCount }, () => ({ groups: [], size: 0 }));
  for (const [group, count] of [...counts].sort(
    ([a, ac], [b, bc]) => bc - ac || (a < b ? -1 : 1),
  )) {
    const fold = folds.reduce((a, b) => (a.size <= b.size ? a : b));
    fold.groups.push(group);
    fold.size += count;
  }
  const predictions = folds.flatMap((fold, index) => {
    const { groups } = fold;
    const train = samples.filter(({ group }) => !groups.includes(group));
    const test = samples.filter(({ group }) => groups.includes(group));
    const { predict, model } = fit(train, 6901 + index);
    fold.model = model;
    const baseline = median(train.map(({ observed }) => observed));
    return test.map(({ id, x, observed, group }) => ({
      id,
      group,
      fold: index + 1,
      observed,
      baseline,
      inputs: x,
      ...predict(x),
    }));
  });
  const error = (key) => mean(predictions.map((row) => Math.abs(row.observed - row[key])));
  return {
    schemaVersion: 1,
    provenance:
      'SI-assisted code; model trained on NASA PSI-69 FLEX measurements. No generated training data.',
    features: ['Oxygen', 'Pressure', 'Nitrogen', 'CO₂', 'Helium', 'Droplet diameter', 'Fuel'],
    hiddenUnits: width,
    folds,
    mae: error('predicted'),
    baselineMae: error('baseline'),
    predictions,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const directory = new URL('../public/data/', import.meta.url);
  const dataset = JSON.parse(await readFile(new URL('combustion.json', directory), 'utf8'));
  const audit = auditModel(dataset);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('neural.json', directory), JSON.stringify(audit));
  console.log(
    `FLEX model: ${audit.predictions.length} held-out rows; MAE ${audit.mae.toFixed(2)} s vs median ${audit.baselineMae.toFixed(2)} s`,
  );
}
