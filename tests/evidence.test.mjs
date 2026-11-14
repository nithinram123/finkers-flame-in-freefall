import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { scalar, classify } from '../scripts/normalize.mjs';
import {
  chartRecords,
  searchEvidence,
  csvText,
  filterInvestigations,
} from '../src/lib/evidence.mjs';
const dataset = JSON.parse(
  fs.readFileSync(new URL('../public/data/combustion.json', import.meta.url), 'utf8'),
);

test('units convert without interpreting ranges, sets, notes or blanks as scalar values', () => {
  assert.equal(scalar('20 cm/s'), 20);
  assert.equal(scalar('~ 21.5'), 21.5);
  assert.equal(scalar('0.21', 100), 21);
  assert.equal(scalar('1 atm', 101.325), 101.325);
  for (const value of ['', '0.1 - 5', '21; 26.5; 40', '0.85 and 0.37 mm', 'RAMPED'])
    assert.equal(scalar(value), null);
});

test('FLEX known source measurement agrees with normalized pressure and oxygen', () => {
  const record = dataset.records.find(
    (item) => item.accession === 'PSI-69' && item.label === '20CAL08',
  );
  assert.ok(record);
  assert.equal(record.oxygen.value, 21);
  assert.ok(Math.abs(record.pressure.value - 101.01836) < 0.001);
  assert.equal(record.outcome, 'Disruption');
});

test('chart selector excludes summaries, duplicates, missing values and inverse oxygen', () => {
  const rows = chartRecords(dataset.records, { x: 'oxygen', y: 'pressure', basis: 'ambient' });
  assert.ok(rows.length > 0);
  assert.ok(
    rows.every(
      (item) => item.kind === 'test record' && !item.duplicateOf && item.oxygenBasis === 'ambient',
    ),
  );
  assert.ok(
    rows.every(
      (item) => Number.isFinite(item.oxygen.value) && Number.isFinite(item.pressure.value),
    ),
  );
  assert.ok(!rows.some((item) => item.accession === 'PSI-68'));
});

test('FLEX-2 parameter ranges and Saffire notes retain separate row types', () => {
  assert.equal(classify('PSI-68', { Fuel: 'Heptane' }), 'parameter summary');
  assert.equal(classify('PSI-99', { Sample: 'Note 1 Derived from CO2' }), 'note / calibration');
  assert.equal(classify('PSI-159', { Test: '', Fuel: '' }), 'blank');
});

test('all source rows resolve and CSV hashes match original files', () => {
  const tables = new Map(dataset.tables.map((item) => [item.id, item]));
  const ids = new Set(dataset.records.map((item) => item.id));
  assert.equal(ids.size, dataset.records.length);
  for (const record of dataset.records) {
    assert.ok(tables.has(record.tableId));
    assert.equal(record.values.length, tables.get(record.tableId).headers.length);
    if (record.duplicateOf) assert.ok(ids.has(record.duplicateOf));
  }
  const manifest = JSON.parse(
    fs.readFileSync(new URL('../public/data/source-manifest.json', import.meta.url), 'utf8'),
  );
  for (const source of manifest) {
    const bytes = fs.readFileSync(
      new URL(`../data/tables/${encodeURIComponent(source.file)}`, import.meta.url),
    );
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), source.sha256);
  }
});

test('source search returns traceable FLEX extinction records and handles empty input', () => {
  const matches = searchEvidence(dataset, 'FLEX methanol extinction');
  assert.ok(matches.length > 0);
  assert.ok(matches.every((item) => item.file && item.row >= 2 && item.id));
  assert.equal(matches[0].accession, 'PSI-69');
  assert.equal(matches[0].outcome, 'Extinction');
  assert.deepEqual(searchEvidence(dataset, 'the and what'), []);
});

test('catalogue filters intersect and CSV exports escape quotes and formulas', () => {
  const results = filterInvestigations(dataset.investigations, {
    query: 'bass',
    fuel: 'Solid',
    area: 'Prevention',
    hardware: 'MSG',
  });
  assert.equal(results.length, 2);
  assert.equal(csvText(['value'], [['=1+1'], ['a"b']]), '"value"\r\n"\'=1+1"\r\n"a""b"');
});
