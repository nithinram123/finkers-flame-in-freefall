import { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { searchEvidence } from '../lib/evidence.mjs';
import { Badge, Empty, Field, Measurement, Notice, PageTitle } from './ui.jsx';
const examples = ['FLEX methanol extinction', 'SAME Kapton smoke', 'CFI-G failed ignition'];

export default function Ask({ dataset }) {
  const [question, setQuestion] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [matches, setMatches] = useState([]);
  function search(event, value = question) {
    event?.preventDefault();
    setQuestion(value);
    setSubmitted(value.trim());
    setMatches(searchEvidence(dataset, value));
  }
  return (
    <>
      <PageTitle
        eyebrow="Traceable answers"
        title="Ask the evidence"
        description="Find source records behind a question and inspect exactly what they contain."
      />
      <Notice>
        <strong>Source-search mode.</strong> This MVP searches locally and returns cited evidence. A
        live SI answer service has not been connected.
      </Notice>
      <form className="ask-form" onSubmit={search}>
        <Field label="Your question">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Which FLEX records report methanol extinction?"
            rows="3"
            maxLength={1500}
            required
          />
        </Field>
        <button className="primary" type="submit">
          <Search size={16} />
          Find evidence
        </button>
      </form>
      <div className="suggestions">
        Try:
        {examples.map((example) => (
          <button key={example} onClick={() => search(null, example)}>
            {example} <ArrowRight size={13} />
          </button>
        ))}
      </div>
      {submitted && (
        <section className="search-results" aria-live="polite">
          <div className="section-heading">
            <h2>Source matches</h2>
            <span className="muted">{matches.length} shown · keyword relevance</span>
          </div>
          <p>
            Results for “{submitted}”. These matches are evidence to inspect; they do not constitute
            a generated answer.
          </p>
          {matches.length ? (
            matches.map((record) => (
              <article className="evidence-match" key={record.id}>
                <div>
                  <a href={`#/record/${record.id}`}>
                    <strong>
                      {record.investigation} · {record.label}
                    </strong>
                  </a>
                  <Badge>{record.kind}</Badge>
                </div>
                <p>
                  {record.fuel || 'Material not reported'} · {record.outcome}
                </p>
                <p className="muted">
                  O₂ <Measurement measurement={record.oxygen} unit="%" /> ({record.oxygenBasis}) ·
                  Pressure <Measurement measurement={record.pressure} unit="kPa" /> · Airflow{' '}
                  <Measurement measurement={record.airflow} unit="cm/s" />
                </p>
                <a className="source-id" href={`#/record/${record.id}`}>
                  [{record.accession}, {record.file}, CSV row {record.row}]
                </a>
              </article>
            ))
          ) : (
            <Empty>
              Try an investigation name, material or outcome. Numeric comparisons require the Test
              explorer.
            </Empty>
          )}
        </section>
      )}
    </>
  );
}
