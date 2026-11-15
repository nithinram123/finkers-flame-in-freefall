import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { handleAsk } from '../api/ask.js';
import evidenceApi from '../api/evidence.js';

const dataset = JSON.parse(
  await readFile(new URL('../public/data/combustion.json', import.meta.url), 'utf8'),
);
const records = new Map(dataset.records.map((row) => [row.id, row]));
const prompt = 'Which FLEX tests report methanol extinction?';

function response() {
  return {
    statusCode: 200,
    setHeader() {},
    end(body) {
      this.body = JSON.parse(body);
    },
  };
}

async function ask(question, config = {}, scenario) {
  const reply = response();
  await handleAsk(
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { question, scenario },
    },
    reply,
    config,
  );
  assert.equal(reply.statusCode, 200);
  return reply.body;
}

test('server retrieval enforces investigation, fuel and reported outcome', async () => {
  const reply = await ask(prompt);
  const expected = dataset.records.filter(
    (row) =>
      row.accession === 'PSI-69' &&
      row.fuel === 'Methanol' &&
      row.outcome === 'Extinction' &&
      row.kind === 'test record' &&
      !row.duplicateOf,
  );
  assert.equal(reply.offline, true);
  assert.ok(expected.length > 0);
  assert.equal(reply.evidence.matches, expected.length);
  assert.match(reply.answer, /Reported ambient oxygen/);
  assert.match(reply.answer, /Excluded 1 nonpositive pressure reading/);
  assert.doesNotMatch(reply.answer, /initial pressure: 0/);
  assert.equal(reply.retrieved.length, Math.min(expected.length, 12));
  for (const item of reply.retrieved) {
    const record = records.get(item.id);
    assert.ok(expected.includes(record));
    assert.equal(item.row, record.row);
  }
  const empty = await ask('Which FLEX-2 tests report methanol extinction?');
  assert.equal(empty.evidence.matches, 0);
  assert.deepEqual(empty.retrieved, []);
  const unknown = await ask('What did PSI-999999 report?');
  assert.deepEqual(unknown.retrieved, []);
  assert.equal(unknown.evidence.matches, 0);
});

test('the cabin API and Ask use the same mutually exclusive Moon coverage', async () => {
  const reply = response();
  await evidenceApi({ method: 'GET', url: '/api/evidence?preset=moon' }, reply);
  assert.deepEqual(reply.body.coverage, { close: 0, wider: 37, outside: 701, paired: 738 });
  assert.equal(reply.body.sourceType, 'bundled snapshot');
  const answer = await ask('What did NASA test near Moon Base?');
  assert.deepEqual(answer.evidence.coverage, reply.body.coverage);
});

test('the Claude request includes original NASA values, and invented citation IDs are filtered', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    const request = JSON.parse(options.body);
    const context = JSON.parse(request.messages[0].content);
    assert.ok(context.scopedTotals.count > 0);
    assert.ok(context.evidence.length > 0 && context.evidence.length <= 12);
    for (const row of context.evidence) {
      const source = records.get(row.id);
      assert.equal(source.fuel, 'Methanol');
      assert.equal(row.outcome, 'Extinction');
      assert.equal(row.oxygenPercent, source.oxygen.value);
      assert.equal(row.source.row, source.row);
      assert.ok(Object.keys(row.values).length > 0);
    }
    const id = context.evidence[0].id;
    return Response.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            claims: [
              { text: 'This FLEX record reports methanol extinction.', rowIds: [id] },
              { text: 'Invented test result.', rowIds: ['not-a-nasa-record'] },
            ],
          }),
        },
      ],
    });
  });
  const answer = await ask(prompt, { ANTHROPIC_API_KEY: 'mock-only' });
  assert.equal(answer.offline, false);
  assert.equal(answer.claims.length, 1);
  assert.equal(answer.sources[0].accession, 'PSI-69');
});
