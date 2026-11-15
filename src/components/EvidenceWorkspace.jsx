import { useEffect, useState } from 'react';
import { ArrowUpRight, ChartScatter, Database, FlaskConical, MessagesSquare } from 'lucide-react';
import { snapshotSummary } from '../lib/psi-summary.mjs';
import { analystUrl } from '../lib/routes.mjs';

const format = new Intl.NumberFormat('en');

export function cabinParams(cabin) {
  return new URLSearchParams({
    preset: cabin.id,
    oxygen: cabin.oxygen,
    pressure: cabin.atm,
    gravity: cabin.gravityG,
  });
}

export function explorerUrl(cabin, scope = 'nearby') {
  const query = cabinParams(cabin);
  query.set('scope', scope);
  return '/explorer?' + query;
}

export function EvidenceSteps({ cabin, current }) {
  const entries = [
    [
      'dashboard',
      '/scenario' + (cabin ? '?' + cabinParams(cabin) : ''),
      FlaskConical,
      'Compare cabin conditions',
    ],
    ['explorer', cabin ? explorerUrl(cabin) : '/explorer', ChartScatter, 'Explore source records'],
    [
      'analyst',
      cabin ? analystUrl('What did NASA test near this cabin?', cabin) : '/analyst',
      MessagesSquare,
      'Ask the evidence',
    ],
  ];
  return (
    <nav className="evidence-steps" aria-label="Fire evidence workflow">
      {entries.map(([id, url, Icon, label], index) => (
        <a key={id} href={url} aria-current={id === current ? 'page' : undefined}>
          <span aria-hidden="true">0{index + 1}</span>
          <Icon size={17} aria-hidden="true" /> {label}
        </a>
      ))}
    </nav>
  );
}

export function SnapshotReadout({ dataset, cabin }) {
  const [remote, setRemote] = useState(null);
  const query = cabin ? '?' + cabinParams(cabin) : '';
  const summary = remote ?? snapshotSummary(dataset, cabin);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/evidence' + query, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (
          data.preparedDate === dataset.preparedDate &&
          data.source === 'NASA Physical Sciences Informatics'
        ) {
          setRemote(data);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [query, dataset.preparedDate]);
  return (
    <section className="snapshot-readout" aria-label="NASA archive feeding this dashboard">
      <div className="snapshot-title">
        <Database size={19} aria-hidden="true" />
        <div>
          <h2>NASA PSI combustion archive</h2>
          <p>Bundled research snapshot · prepared {summary.preparedDate}</p>
        </div>
        <a href="/data-sources#apis">
          Data and APIs <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
      <dl>
        {[
          [summary.investigations, 'Investigations'],
          [summary.tables, 'Original CSV tables'],
          [summary.testRecords, 'Test records'],
          [summary.pairedRecords, 'Records with ambient oxygen + pressure'],
        ].map(([count, label]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{format.format(count)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function CoverageBand({ coverage }) {
  const segments = [
    ['close', 'Close matches', coverage.exact.length],
    ['wider', 'Wider matches only', coverage.nearby.length - coverage.exact.length],
    ['outside', 'Outside wider window', coverage.paired.length - coverage.nearby.length],
  ];
  if (!coverage.paired.length) return null;
  return (
    <figure className="coverage-band">
      <figcaption>
        How all {format.format(coverage.paired.length)} paired NASA tests compare
      </figcaption>
      <div className="coverage-band-track" aria-hidden="true">
        {segments.map(
          ([id, , total]) =>
            total > 0 && (
              <span
                key={id}
                data-band={id}
                style={{ width: (100 * total) / coverage.paired.length + '%' }}
              />
            ),
        )}
      </div>
      <dl>
        {segments.map(([id, label, total]) => (
          <div key={id} data-band={id}>
            <dt>
              <i aria-hidden="true" />
              {label}
            </dt>
            <dd>{format.format(total)}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
