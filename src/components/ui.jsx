import { ArrowUpRight, Download, Info } from 'lucide-react';
import { csvText } from '../lib/evidence.mjs';

export function SourceLink({ investigation, children = 'NASA PSI record' }) {
  return (
    <a href={investigation.psiPage} target="_blank" rel="noreferrer">
      {children} <ArrowUpRight size={13} aria-hidden="true" />
    </a>
  );
}

export function Badge({ children, tone = '' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Notice({ children }) {
  return (
    <div className="notice">
      <Info size={17} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ title = 'No matching evidence', children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{children || 'Try a broader search or clear a filter.'}</p>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ExportButton({ filename, headers, rows }) {
  function download() {
    const url = URL.createObjectURL(
      new Blob(['\uFEFF', csvText(headers, rows)], { type: 'text/csv;charset=utf-8;' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <button onClick={download} disabled={!rows.length}>
      <Download size={15} aria-hidden="true" />
      Export CSV
    </button>
  );
}

export function Measurement({ measurement, unit = '' }) {
  if (!measurement || measurement.value === null)
    return (
      <span className="muted" title={measurement?.raw || 'Missing from this source row'}>
        —
      </span>
    );
  return (
    <span title={`Source: ${measurement.column} = ${measurement.raw}`}>
      {measurement.approximate ? '≈ ' : ''}
      {Number(measurement.value.toFixed(2)).toLocaleString('en')} {unit}
    </span>
  );
}

export function PageTitle({ eyebrow, title, description, children }) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </header>
  );
}
