import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { analystEvidence, offlineAssessment } from '../lib/analyst.mjs';
import { HabitatContext } from './Habitat.jsx';
import { Badge, Empty, Field, Measurement, Notice, PageTitle } from './ui.jsx';

const examples = [
  'Is a Moon base more dangerous for fire than the Space Station?',
  'What should a Mars base use to put out fires?',
  'Why does fire behave differently in space?',
  'Which materials are safest for a crew cabin?',
  'What has NASA never tested that a Moon base needs?',
];

export default function Ask({ dataset, habitat, onInspect, initialQuestion = '', claudeStatus }) {
  const [question, setQuestion] = useState(initialQuestion.slice(0, 500));
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);
  const request = useRef(null);
  const rowIndex = new Map(dataset.records.map((row) => [row.id, row]));
  useEffect(() => {
    return () => {
      request.current?.abort();
    };
  }, []);

  async function ask(event, value = question) {
    event?.preventDefault();
    const text = value.trim();
    if (!text || pending) return;
    setQuestion(value);
    setPending(true);
    setResult(null);
    const evidence = analystEvidence(dataset, text, habitat);
    const matches = evidence.rows;
    const fallback = offlineAssessment(evidence);
    if (claudeStatus !== true) {
      setResult({ text, matches, claims: [], offline: fallback, coverage: evidence.coverage });
      setPending(false);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          question: text,
          habitatId: habitat?.id,
          scenario: habitat?.atm
            ? {
                id: habitat.id,
                oxygen: habitat.oxygen,
                atm: habitat.atm,
                gravityG: habitat.gravityG,
              }
            : undefined,
        }),
      });
      const answer = await response.json();
      setResult({
        text,
        matches,
        claims: response.ok ? answer.claims : [],
        model: answer.model,
        coverage: evidence.coverage,
        note: answer.message,
        offline:
          !response.ok || answer.offline ? (response.ok && answer.answer) || fallback : undefined,
      });
    } catch {
      if (!controller.signal.aborted)
        setResult({
          text,
          matches,
          claims: [],
          offline: fallback,
          coverage: evidence.coverage,
          note: 'The answer service is unavailable. Browse the matching source records below.',
        });
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }
  return (
    <>
      {habitat && <HabitatContext habitat={habitat} />}
      <PageTitle
        eyebrow="Ask the evidence"
        title="What would you like to know?"
        description="Ask about a fuel, a test result, or a cabin. Every result starts with records from NASA Physical Sciences Informatics."
      />
      <Notice>
        {claudeStatus
          ? 'Claude receives your question, selected cabin conditions and up to 12 retrieved NASA records.'
          : 'Local evidence search reads the NASA snapshot in your browser. It calculates coverage and retrieves matching rows.'}{' '}
        <a href="/data-sources#apis">See the data and APIs</a>
      </Notice>
      <form className="ask-form" onSubmit={ask}>
        <Field label="Your question">
          <textarea
            name="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="How did changing oxygen affect the FLEX tests?"
            rows={4}
            maxLength={500}
            required
          />
        </Field>
        <button className="primary" type="submit" disabled={pending || !question.trim()}>
          <Search size={17} aria-hidden="true" />{' '}
          {pending ? 'Reading the evidence…' : claudeStatus ? 'Ask Claude' : 'Find evidence'}
        </button>
      </form>
      <div className="suggestions">
        {examples.map((example) => (
          <button type="button" key={example} disabled={pending} onClick={() => ask(null, example)}>
            {example} <ArrowRight size={14} aria-hidden="true" />
          </button>
        ))}
      </div>
      {pending && (
        <div className="notice" role="status">
          Looking up NASA test records…
        </div>
      )}
      {result && (
        <section className="search-results" aria-live="polite">
          {result.claims?.length > 0 && (
            <article className="answer-card">
              <p className="answer-origin">
                Answer by Claude{result.model ? ' · ' + result.model : ''}
              </p>
              <h2>{result.text}</h2>
              {result.claims.map((claim, index) => (
                <div className="answer-claim" key={index}>
                  <p>{claim.text}</p>
                  <div className="citation-list">
                    {claim.citations.map((citation) => {
                      const row = rowIndex.get(citation.id);
                      return row ? (
                        <button
                          key={citation.id}
                          type="button"
                          onClick={() => onInspect([row])}
                          title={`${citation.file}, CSV row ${citation.row}`}
                        >
                          {citation.accession} · {citation.label}
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </article>
          )}
          {result.offline && (
            <article className="answer-card">
              <p className="answer-origin">Local evidence search</p>
              <h2>{result.text}</h2>
              <p>{result.offline}</p>
            </article>
          )}
          {result.note && <Notice>{result.note}</Notice>}
          {result.coverage && (
            <dl className="ask-coverage" aria-label="Cabin test coverage">
              <div>
                <dt>Close matches</dt>
                <dd>{result.coverage.exact.length}</dd>
              </div>
              <div>
                <dt>Wider matches</dt>
                <dd>{result.coverage.nearby.length - result.coverage.exact.length}</dd>
              </div>
              <div>
                <dt>Tests with both measurements</dt>
                <dd>{result.coverage.paired.length}</dd>
              </div>
            </dl>
          )}
          <h2>Source matches</h2>
          <p className="muted">Use a PSI citation to open the original NASA CSV row.</p>
          {result.matches.length ? (
            result.matches.map((row) => (
              <article className="evidence-match" key={row.id}>
                <div>
                  <button type="button" className="text-button" onClick={() => onInspect([row])}>
                    <strong>
                      {row.investigation} · {row.label}
                    </strong>
                  </button>
                  <Badge>{row.kind}</Badge>
                </div>
                <p>
                  {row.fuel || 'Material unreported'} · {row.outcome}
                </p>
                <p className="muted">
                  O₂ <Measurement measurement={row.oxygen} unit="%" /> ({row.oxygenBasis}) ·{' '}
                  <Measurement measurement={row.pressure} unit="kPa" />
                </p>
                <button
                  type="button"
                  className="text-button source-id"
                  onClick={() => onInspect([row])}
                >
                  {row.accession} · CSV row {row.row}
                </button>
              </article>
            ))
          ) : (
            <Empty>Try an investigation name, fuel, material or measured outcome.</Empty>
          )}
        </section>
      )}
    </>
  );
}
