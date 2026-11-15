import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Database, RefreshCw } from 'lucide-react';

export default function LivePsiCheck({ accession, tables }) {
  const [result, setResult] = useState(null);
  const [tableCheck, setTableCheck] = useState(null);
  const [pending, setPending] = useState(null);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function check(file) {
    const controller = new AbortController();
    request.current = controller;
    const query = new URLSearchParams({ accession });
    const update = file ? setTableCheck : setResult;
    if (file) query.set('file', file);
    update(null);
    setPending(file ?? 'catalogue');
    try {
      const reply = await fetch('/api/evidence?' + query, {
        signal: controller.signal,
      });
      if (!reply.ok) throw new Error('Source unavailable');
      update(await reply.json());
    } catch {
      if (!controller.signal.aborted) update({ file, status: file ? 'unavailable' : 'snapshot' });
    } finally {
      if (!controller.signal.aborted) setPending(null);
    }
  }

  return (
    <div className="live-psi">
      <h3>
        <Database size={18} aria-hidden="true" /> Verify this investigation with NASA
      </h3>
      <p>
        Check the accession and table names in the live PSI catalogue. The test rows below come from
        the archived CSV copy.
      </p>
      <button type="button" onClick={() => check()} disabled={Boolean(pending)}>
        <RefreshCw size={16} aria-hidden="true" />{' '}
        {pending === 'catalogue' ? 'Checking NASA…' : 'Check live NASA record'}
      </button>
      <div role="status" aria-atomic="true">
        {result?.status === 'live' && (
          <>
            <p>
              NASA returned <strong>{result.accession}</strong>. {result.confirmedFiles.length} of{' '}
              {result.bundledFiles.length} bundled table names appear in the current catalogue.
            </p>
            {result.doi && <p>Dataset DOI {result.doi}</p>}
            <a href={result.endpoint} target="_blank" rel="noreferrer">
              Open NASA’s API response <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </>
        )}
        {result?.status === 'snapshot' && (
          <p>
            The live catalogue could not be reached. You can still inspect and download the saved
            NASA tables below.
          </p>
        )}
      </div>
      {tables.length > 0 && (
        <details className="psi-csv-check">
          <summary>Verify original CSV measurements</summary>
          <p>
            Compare the live file with the snapshot cell by cell, including the headers and blank
            rows.
          </p>
          <ul>
            {tables.map(({ file }) => (
              <li key={file}>
                <span>{file}</span>
                <button
                  type="button"
                  onClick={() => check(file)}
                  disabled={Boolean(pending)}
                  aria-label={'Compare with NASA · ' + file}
                >
                  {pending === file ? 'Comparing…' : 'Compare with NASA'}
                </button>
              </li>
            ))}
          </ul>
          <div role="status">
            {tableCheck && (
              <>
                <p>
                  <strong>{tableCheck.file}</strong>
                </p>
                {tableCheck.status === 'match' && (
                  <p>
                    Verified. All {tableCheck.liveRows} data rows and the header match the archived
                    CSV.
                  </p>
                )}
                {tableCheck.status === 'changed' && (
                  <p>
                    NASA’s current cells differ from the archived CSV. The live file has{' '}
                    {tableCheck.liveRows} data rows and the snapshot has {tableCheck.archivedRows}.
                  </p>
                )}
                {tableCheck.status === 'unavailable' && (
                  <p>
                    NASA’s file could not be compared right now. The archived CSV is available
                    below.
                  </p>
                )}
              </>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
