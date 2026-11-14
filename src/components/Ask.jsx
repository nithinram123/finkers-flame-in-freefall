import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { searchEvidence } from '../lib/evidence.mjs';
import { HabitatContext } from './Habitat.jsx';
import { Badge, Empty, Field, Measurement, Notice, PageTitle } from './ui.jsx';

const examples = [
  'Which FLEX tests report methanol extinction?',
  'What did SAME measure about smoke?',
  'Which CFI-G tests recorded failed ignition?',
];

export default function Ask({ dataset, habitat, onInspect, initialQuestion = '' }) {
  const [question, setQuestion] = useState(initialQuestion.slice(0, 500));
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);
  const [enabled, setEnabled] = useState(null);
  const request = useRef(null);
  const rowIndex = new Map(dataset.records.map((row) => [row.id, row]));
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/ask', { signal: controller.signal })
      .then((response) => response.json())
      .then((status) => setEnabled(status.enabled === true))
      .catch(() => {
        if (!controller.signal.aborted) setEnabled(false);
      });
    return () => {
      controller.abort();
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
    const matches = searchEvidence(dataset, text);
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ question: text, habitatId: habitat?.id }),
      });
      const answer = await response.json();
      setResult({ text, matches, claims: response.ok ? answer.claims : [], note: answer.message });
    } catch {
      if (!controller.signal.aborted)
        setResult({
          text,
          matches,
          claims: [],
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
        description="Ask about the experiments. Each generated claim links back to the NASA PSI records used."
      />
      {enabled === false && (
        <Notice>
          Live answers are unavailable here. You can still search the NASA source records.
        </Notice>
      )}
      <form className="ask-form" onSubmit={ask}>
        <Field label="Your question">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="How did changing oxygen affect the FLEX tests?"
            rows={4}
            maxLength={600}
            required
          />
        </Field>
        <button className="primary" type="submit" disabled={pending || !question.trim()}>
          <Search size={17} aria-hidden="true" />{' '}
          {pending
            ? 'Reading the evidence…'
            : enabled === false
              ? 'Find evidence'
              : 'Ask the evidence'}
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
              <span className="eyebrow">Claude · SI-generated</span>
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
          {result.note && <Notice>{result.note}</Notice>}
          <h2>Source matches</h2>
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
