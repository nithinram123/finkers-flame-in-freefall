import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { handleAsk } from '../api/ask.js';
import evidenceApi from '../api/evidence.js';
import { briefMarkdown, cabinSummary, moon, station } from '../src/lib/research-brief.mjs';

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

test('Groq receives original NASA values and invented citation IDs are filtered', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer new-groq-key');
    assert.equal(options.headers['x-api-key'], undefined);
    const request = JSON.parse(options.body);
    assert.equal(request.model, 'openai/gpt-oss-20b');
    assert.equal(request.response_format.type, 'json_schema');
    assert.equal(request.response_format.json_schema.strict, true);
    assert.equal(request.reasoning_effort, 'low');
    const context = JSON.parse(request.messages[1].content);
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
      choices: [
        {
          finish_reason: 'stop',
          message: {
            content: JSON.stringify({
              claims: [
                { text: 'This FLEX record reports methanol extinction.', rowIds: [id] },
                { text: 'Invented test result.', rowIds: ['not-a-nasa-record'] },
              ],
            }),
          },
        },
      ],
    });
  });
  const answer = await ask(prompt, {
    GROQ_API_KEY: ' new-groq-key ',
    ANTHROPIC_API_KEY: 'old-mock-key',
  });
  assert.equal(answer.provider, 'GroqCloud');
  assert.equal(answer.offline, false);
  assert.equal(answer.generationStatus, 'generated');
  assert.equal(answer.claims.length, 1);
  assert.equal(answer.sources[0].accession, 'PSI-69');
});

test('Groq rate limits retain the evidence without switching providers', async (t) => {
  const call = t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(new URL(url).hostname, 'api.groq.com');
    return new Response(null, { status: 429 });
  });
  const env = { GROQ_API_KEY: 'mock-groq', NASASpaceAppAPIKey: 'mock-claude' };
  const status = response();
  await handleAsk({ method: 'GET' }, status, env);
  assert.deepEqual(status.body, { enabled: true, provider: 'GroqCloud' });
  const answer = await ask(prompt, env);
  assert.equal(call.mock.callCount(), 1);
  assert.equal(answer.offline, true);
  assert.equal(answer.generationStatus, 'rate-limited');
  assert.equal(answer.evidence.matches, 126);
});

test('the project-specific secret selects Groq only when it has a Groq key prefix', async () => {
  const status = response();
  await handleAsk({ method: 'GET' }, status, { nasaspaceapps: 'gsk_mock' });
  assert.deepEqual(status.body, { enabled: true, provider: 'GroqCloud' });
  await handleAsk({ method: 'GET' }, status, { nasaspaceapps: 'other-provider-mock' });
  assert.deepEqual(status.body, { enabled: false, provider: null });
});

test('a rejected Claude key keeps the NASA results and reports why generation failed', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.headers['x-api-key'], 'legacy-mock');
    return new Response(null, { status: 401 });
  });
  const status = response();
  await handleAsk({ method: 'GET' }, status, { NASASpaceAppAPIKey: 'mock' });
  assert.deepEqual(status.body, { enabled: true, provider: 'Anthropic' });
  const answer = await ask(prompt, { ANTHROPIC_API_KEY: 'legacy-mock' });
  assert.equal(answer.offline, true);
  assert.equal(answer.generationStatus, 'credentials-rejected');
  assert.equal(answer.evidence.matches, 126);
  assert.ok(answer.sources.every((source) => source.accession === 'PSI-69'));
});

test('live PSI lookup confirms bundled filenames and retains provenance if NASA is unavailable', async (t) => {
  const file = dataset.tables.find((table) => table.accession === 'PSI-69').file;
  let online = true;
  const request = t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, 'https://psi.nasa.gov/geode-py/ws/repo/investigations/PSI-69');
    return online
      ? Response.json({
          accession: 'PSI-69',
          doi: '10.60555/mbq8-0451',
          experimentalTable: [{ file_name: file }, { file_name: 'other.csv' }],
        })
      : new Response(null, { status: 503 });
  });
  const reply = response();
  await evidenceApi({ method: 'GET', url: '/api/evidence?accession=PSI-69' }, reply);
  assert.equal(reply.body.status, 'live');
  assert.deepEqual(reply.body.confirmedFiles, [file]);
  assert.equal(reply.body.doi, '10.60555/mbq8-0451');
  online = false;
  await evidenceApi({ method: 'GET', url: '/api/evidence?accession=PSI-69' }, reply);
  assert.equal(reply.body.status, 'snapshot');
  assert.deepEqual(reply.body.bundledFiles, [file]);
  await evidenceApi({ method: 'GET', url: '/api/evidence?accession=PSI-99999' }, reply);
  assert.equal(reply.statusCode, 404);
  assert.equal(request.mock.callCount(), 2);
});

test('the portable brief keeps the same coverage and source coordinates as the dashboard', () => {
  const lunar = cabinSummary(dataset, moon);
  const reference = cabinSummary(dataset, station);
  assert.deepEqual([lunar.close, lunar.wider, lunar.outside, reference.close], [0, 37, 701, 179]);
  const brief = briefMarkdown(
    dataset,
    lunar,
    reference,
    'https://example.test',
    'https://example.test/scenario?preset=moon',
  );
  assert.ok(brief.includes('CSV row ' + lunar.example.row));
  assert.ok(brief.includes('https://example.test/record/' + lunar.example.id));
  assert.ok(brief.includes(dataset.preparedDate));
});

test('live CSV verification compares original cells and restricts the download to NASA PSI storage', async (t) => {
  const source = dataset.tables.find(({ accession }) => accession === 'PSI-69');
  const original = await readFile(
    new URL('../data/tables/' + source.file, import.meta.url),
    'utf8',
  );
  const signed = 'https://psi-repo-prod.s3.amazonaws.com/file.csv?signature=mock-only';
  let link = signed;
  let csv = original.replace(/\r\n/g, '\n');
  const request = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.redirect, 'error');
    if (String(url) === signed) return new Response(csv);
    const download = new URL(url);
    assert.equal(download.origin, 'https://psi.nasa.gov');
    assert.equal(download.pathname, '/geode-py/ws/studies/PSI-69/download');
    assert.equal(download.searchParams.get('file'), source.file);
    assert.equal(download.searchParams.get('redirect'), 'false');
    return new Response(link);
  });
  const reply = response();
  const path =
    '/api/evidence?' + new URLSearchParams({ accession: source.accession, file: source.file });
  await evidenceApi({ method: 'GET', url: path }, reply);
  assert.equal(reply.body.status, 'match');
  assert.equal(reply.body.liveRows, 274);
  csv = csv.replace('Methanol', 'Changed fuel');
  await evidenceApi({ method: 'GET', url: path }, reply);
  assert.equal(reply.body.status, 'changed');
  assert.equal(reply.body.liveRows, reply.body.archivedRows);
  link = 'https://other.example/redirect';
  await evidenceApi({ method: 'GET', url: path }, reply);
  assert.equal(reply.body.status, 'unavailable');
  assert.equal(request.mock.callCount(), 5);
});
