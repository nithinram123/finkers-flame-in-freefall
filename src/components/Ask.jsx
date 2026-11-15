import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { analystEvidence, evidenceReadout, offlineAssessment } from '../lib/analyst.mjs';
import { evidenceQuestions } from '../lib/evidence-questions.mjs';
import { nasaReportSearch } from '../lib/nasa-reports.mjs';
import { HabitatContext } from './Habitat.jsx';
import { EvidenceSteps } from './EvidenceWorkspace.jsx';
import { Badge, Empty, Field, Measurement, Notice, PageTitle } from './ui.jsx';

export default function Ask({
  dataset,
  habitat,
  onInspect,
  initialQuestion = '',
  generationProvider,
}) {
  const [question, setQuestion] = useState(initialQuestion.slice(0, 500));
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);
  const request = useRef(null);
  const rowIndex = new Map(dataset.records.map((row) => [row.id, row]));
  const names = new Map(dataset.investigations.map(({ accession, name }) => [accession, name]));
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
      if (!response.ok) throw new Error('Evidence service unavailable');
      const answer = await response.json();
      if (typeof answer.answer !== 'string') throw new Error('Evidence response invalid');
      const matches = (answer.retrieved ?? answer.sources ?? [])
        .map(({ id }) => rowIndex.get(id))
        .filter(Boolean);
      setResult({
        text,
        matches,
        claims: answer.claims,
        model: answer.model,
        provider: answer.provider ?? generationProvider,
        readout: answer.evidence,
        note: answer.message,
        nasaSearch: answer.nasaSearch,
        nasaTechTransfer: answer.nasaTechTransfer,
        offline: answer.offline ? answer.answer : undefined,
        origin: 'NASA evidence search',
      });
    } catch {
      if (!controller.signal.aborted) {
        const evidence = analystEvidence(dataset, text, habitat);
        setResult({
          text,
          matches: evidence.rows,
          claims: [],
          offline: offlineAssessment(evidence),
          readout: evidenceReadout(evidence),
          origin: 'NASA evidence search · browser copy',
          nasaSearch: { ...nasaReportSearch(text), status: 'unavailable', reports: [] },
          note: 'The API was unavailable. These results came from the NASA snapshot already loaded in your browser.',
        });
      }
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
      <EvidenceSteps cabin={habitat} current="analyst" />
      <Notice>
        {generationProvider
          ? 'Questions first run against the NASA snapshot. The model receives the selected cabin conditions, computed totals and up to 12 source rows.'
          : 'Questions run against the NASA snapshot through our evidence API. Generated answers are currently unavailable.'}{' '}
        <a href="/data-sources#apis">See the data and APIs</a>
      </Notice>
      <form className="ask-form evidence-console" onSubmit={ask}>
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
          {pending ? 'Reading the evidence…' : 'Find NASA evidence'}
        </button>
      </form>
      <div className="suggestions">
        {evidenceQuestions.map((example) => (
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
                Answer via {result.provider || 'the model'}
                {result.model ? ' · ' + result.model : ''}
              </p>
              <h2>{result.text}</h2>
              {Number.isFinite(result.readout?.matches) && (
                <p className="muted">
                  {result.readout.matches.toLocaleString('en')} matching tests in the NASA snapshot
                </p>
              )}
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
              <p className="answer-origin">{result.origin}</p>
              <h2>{result.text}</h2>
              <p>{result.offline}</p>
            </article>
          )}
          {result.note && <Notice>{result.note}</Notice>}
          {result.nasaSearch && (
            <section className="answer-card" aria-labelledby="nasa-report-heading">
              <p className="answer-origin">NASA Technical Reports Server</p>
              <h2 id="nasa-report-heading">Related NASA research</h2>
              {result.nasaSearch.status === 'results' ? (
                <ul>
                  {result.nasaSearch.reports.map(({ id, url, title, year }) => (
                    <li key={id}>
                      <a href={url} target="_blank" rel="noreferrer">
                        {title}
                      </a>
                      {year && ' · ' + year}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  {result.nasaSearch.status === 'unavailable'
                    ? 'NASA’s report search is temporarily unavailable here. You can search the NASA archive directly.'
                    : 'NASA’s report search returned no matches for these terms. Try a shorter search or browse the PSI catalogue.'}
                </p>
              )}
              <div className="brief-actions">
                <a
                  className="button"
                  href={result.nasaSearch.searchUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Search NASA reports
                </a>
                <a
                  className="button"
                  href="https://psi.nasa.gov/physci/repo/search?data_source=psi&data_type=investigation"
                  target="_blank"
                  rel="noreferrer"
                >
                  Browse NASA PSI
                </a>
                {result.nasaSearch.status !== 'results' && (
                  <a
                    className="button"
                    href={result.nasaSearch.siteSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Search NASA.gov
                  </a>
                )}
              </div>
            </section>
          )}
          {result.nasaTechTransfer?.patents.length > 0 && (
            <section className="answer-card" aria-labelledby="nasa-patent-heading">
              <p className="answer-origin">{result.nasaTechTransfer.source}</p>
              <h2 id="nasa-patent-heading">Related NASA technologies</h2>
              <ul>
                {result.nasaTechTransfer.patents.map(({ id, title, url }) => (
                  <li key={id}>
                    <a href={url} target="_blank" rel="noreferrer">
                      {title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {result.readout?.coverage && (
            <dl className="ask-coverage" aria-label="Cabin test coverage">
              <div>
                <dt>Close matches</dt>
                <dd>{result.readout.coverage.close}</dd>
              </div>
              <div>
                <dt>Wider matches</dt>
                <dd>{result.readout.coverage.wider}</dd>
              </div>
              <div>
                <dt>Tests with both measurements</dt>
                <dd>{result.readout.coverage.paired}</dd>
              </div>
            </dl>
          )}
          {result.readout?.filters?.length > 0 && (
            <p>Matched filters: {result.readout.filters.join(' · ')}</p>
          )}
          <h2>Source matches</h2>
          <p className="muted">
            {Number.isFinite(result.readout?.matches) && (
              <>
                Showing {result.matches.length} of {result.readout.matches} matching tests.{' '}
              </>
            )}
            Use a PSI citation to open the original NASA CSV row.
          </p>
          {result.matches.length ? (
            result.matches.map((row) => (
              <article className="evidence-match" key={row.id}>
                <div>
                  <button type="button" className="text-button" onClick={() => onInspect([row])}>
                    <strong>
                      {names.get(row.accession) ?? row.accession} · {row.label}
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
          ) : result.readout?.archive ? (
            <a href="/data-sources">Open the NASA archive and source inventory</a>
          ) : (
            <Empty>Try an investigation name, fuel, material or measured outcome.</Empty>
          )}
        </section>
      )}
    </>
  );
}
