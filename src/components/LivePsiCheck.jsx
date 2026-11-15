import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Database, RefreshCw } from 'lucide-react';

export default function LivePsiCheck({ accession }) {
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function check() {
    const controller = new AbortController();
    request.current = controller;
    setResult(null);
    setPending(true);
    try {
      const reply = await fetch('/api/evidence?accession=' + encodeURIComponent(accession), {
        signal: controller.signal,
      });
      if (!reply.ok) throw new Error('Source unavailable');
      setResult(await reply.json());
    } catch {
      if (!controller.signal.aborted) setResult({ status: 'snapshot' });
    } finally {
      if (!controller.signal.aborted) setPending(false);
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
      <button type="button" onClick={check} disabled={pending}>
        <RefreshCw size={16} aria-hidden="true" />{' '}
        {pending ? 'Checking NASA…' : 'Check live NASA record'}
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
    </div>
  );
}
