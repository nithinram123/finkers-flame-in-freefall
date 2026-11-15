import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { loadPsiSnapshot } from './psi-snapshot.mjs';

const archive = 'https://psi.nasa.gov/geode-py/ws/studies/';
const storage = 'psi-repo-prod.s3.amazonaws.com';
const maxBytes = 512 * 1024;

export function csvCells(bytes) {
  return parse(bytes, { bom: true, skip_empty_lines: false, relax_column_count: false });
}

export function csvDigest(cells) {
  return createHash('sha256').update(JSON.stringify(cells)).digest('hex');
}

export async function checkPsiTable(accession, file) {
  const snapshot = await loadPsiSnapshot();
  const table = snapshot.tables.find((item) => item.accession === accession && item.file === file);
  if (!table) return null;
  const unavailable = { accession, file, status: 'unavailable' };
  const signal = AbortSignal.timeout(9000);
  try {
    const query = new URLSearchParams({ file, redirect: 'false' });
    const link = await fetch(archive + accession + '/download?' + query, {
      signal,
      redirect: 'error',
    });
    if (!link.ok) return unavailable;

    const url = new URL((await link.text()).trim());
    if (url.origin !== 'https://' + storage || url.username || url.password) return unavailable;

    const reply = await fetch(url, { signal, redirect: 'error' });
    if (!reply.ok || Number(reply.headers.get('content-length')) > maxBytes) return unavailable;
    const buffer = Buffer.from(await reply.arrayBuffer());
    if (!buffer.length || buffer.length > maxBytes) return unavailable;

    const cells = csvCells(buffer);
    return {
      accession,
      file,
      status: csvDigest(cells) === table.cellDigest ? 'match' : 'changed',
      archivedRows: table.sourceRows,
      liveRows: cells.length - 1,
    };
  } catch {
    return unavailable;
  }
}
