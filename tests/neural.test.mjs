import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { flexSamples } from '../scripts/build-neural.mjs';
import { readScenario, scenarioCoverage } from '../src/lib/scenario.mjs';

const json = async (name) =>
  JSON.parse(await readFile(new URL('../public/data/' + name, import.meta.url), 'utf8'));
const dataset = await json('combustion.json');
const audit = await json('neural.json');

test('the build holds out every eligible NASA row exactly once, by atmospheric group', () => {
  const samples = new Map(flexSamples(dataset).map((sample) => [sample.id, sample]));
  const groups = audit.folds.flatMap(({ groups }) => groups);
  assert.equal(groups.length, new Set(groups).size);
  assert.equal(audit.predictions.length, samples.size);
  assert.equal(new Set(audit.predictions.map(({ id }) => id)).size, samples.size);
  const absoluteError = { predicted: 0, baseline: 0 };
  audit.folds.forEach(({ groups, size }, index) => {
    const train = [...samples.values()]
      .filter(({ group }) => !groups.includes(group))
      .map(({ observed }) => observed)
      .sort((a, b) => a - b);
    const median =
      (train[Math.floor(train.length / 2)] + train[Math.ceil(train.length / 2) - 1]) / 2;
    const heldOut = audit.predictions.filter(({ fold }) => fold === index + 1);
    assert.equal(heldOut.length, size);
    for (const row of heldOut) {
      const sample = samples.get(row.id);
      assert.equal(sample.observed, row.observed);
      assert.equal(sample.group, row.group);
      assert.ok(groups.includes(row.group));
      assert.equal(row.baseline, median);
      assert.ok(Number.isFinite(row.predicted) && row.predicted > 0);
      assert.equal(row.activations.length, audit.hiddenUnits);
      assert.ok(row.activations.every((value) => Number.isFinite(value) && Math.abs(value) <= 1));
      for (const key of Object.keys(absoluteError))
        absoluteError[key] += Math.abs(row[key] - row.observed);
    }
  });
  assert.ok(Math.abs(audit.mae - absoluteError.predicted / samples.size) < 1e-9);
  assert.ok(Math.abs(audit.baselineMae - absoluteError.baseline / samples.size) < 1e-9);
});

test('NASA data distinguish a cabin evidence gap from a closer station match', () => {
  const coverage = (preset) =>
    scenarioCoverage(dataset.records, readScenario(new URLSearchParams({ preset })));
  const moon = coverage('moon');
  const station = coverage('station');
  assert.equal(moon.exact.length, 0);
  assert.ok(moon.nearby.length > 0);
  assert.ok(moon.nearbyBox.x1 < moon.box.x1 && moon.nearbyBox.x2 > moon.box.x2);
  assert.ok(moon.nearbyBox.y1 < moon.box.y1 && moon.nearbyBox.y2 > moon.box.y2);
  assert.ok(station.exact.length > 0);
  assert.ok(station.exact.every((row) => station.nearby.includes(row)));
});

test('the exported node trace reconstructs each held-out estimate', () => {
  const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
  for (const row of audit.predictions) {
    const model = audit.folds[row.fold - 1].model;
    const activation = model.weights.map((weights, i) =>
      Math.tanh(dot(weights, row.normalized) + model.bias[i]),
    );
    assert.deepEqual(activation, row.activations);
    const estimated = Math.exp(model.logCenter + model.intercept + dot(model.head, activation));
    assert.ok(Math.abs(estimated - row.predicted) < 1e-9);
  }
});
