import { ArrowUpRight, Download, FileText } from 'lucide-react';
import Reveal from './Reveal.jsx';
import { briefMarkdown, cabinAir, cabinSummary, moon, station } from '../lib/research-brief.mjs';
import { explorerUrl } from './EvidenceWorkspace.jsx';

export default function ResearchBrief({ dataset, scenario, coverage, onInspect }) {
  const main = cabinSummary(dataset, scenario, coverage);
  const reference = cabinSummary(dataset, scenario.nominal ? moon : station);
  const nextTest = main.close
    ? 'Start with the close tests. Compare fuel, airflow and sample shape before deciding what to test next.'
    : main.wider
      ? 'Plan a test inside the cabin window. Review wider-window records for candidate materials and airflow conditions.'
      : 'Both windows are empty. Use the investigation catalogue to identify methods for testing at these conditions.';
  const matchingStudy =
    main.example &&
    dataset.investigations.find(({ accession }) => accession === main.example.accession);

  function download() {
    const { href, origin } = window.location;
    const content = briefMarkdown(dataset, main, reference, origin, href);
    const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'finkers-cabin-brief.md';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Reveal
      as="section"
      className="research-brief"
      id="research-brief"
      aria-labelledby="research-brief-title"
    >
      <header>
        <span className="eyebrow">
          <FileText size={16} aria-hidden="true" /> Cabin evidence brief
        </span>
        <h2 id="research-brief-title">Which cabin has more test evidence?</h2>
        <p>
          Compare the same oxygen and pressure windows across two cabins. Share the counts, method
          and original NASA row in one file.
        </p>
      </header>
      <div className="brief-comparison">
        {[main, reference].map(({ cabin, close, wider, paired }, index) => (
          <article key={index}>
            <span>{index === 0 ? 'Selected cabin' : 'Reference cabin'}</span>
            <h3>{cabin.name}</h3>
            <p>{cabinAir(cabin)}</p>
            <dl>
              <div>
                <dt>Close</dt>
                <dd>{close}</dd>
              </div>
              <div>
                <dt>Wider only</dt>
                <dd>{wider}</dd>
              </div>
            </dl>
            {paired > 0 && (
              <div className="brief-window-bar" aria-hidden="true">
                <span style={{ width: (100 * close) / paired + '%' }} />
                <span style={{ width: (100 * wider) / paired + '%' }} />
              </div>
            )}
            <small>
              {close + wider} within either window out of {paired} paired NASA tests
            </small>
          </article>
        ))}
      </div>
      <p className="brief-next">
        {nextTest} These matches use ambient oxygen and pressure. Gravity is a separate research
        question.
      </p>
      {main.example && (
        <p className="brief-source">
          <button type="button" onClick={() => onInspect([main.example])}>
            Inspect {matchingStudy?.name ?? main.example.accession} · CSV row {main.example.row}
          </button>
          <span>
            {main.example.accession} · {main.file}
          </span>
        </p>
      )}
      <div className="brief-actions">
        <button type="button" className="primary" onClick={download}>
          <Download size={17} aria-hidden="true" /> Download evidence brief
        </button>
        <a
          className="button"
          href={explorerUrl(reference.cabin, reference.close ? 'close' : 'nearby')}
        >
          Explore reference tests <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
    </Reveal>
  );
}
