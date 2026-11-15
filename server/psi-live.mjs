import { loadPsiSnapshot } from './psi-snapshot.mjs';

const base = 'https://psi.nasa.gov/geode-py/ws/repo/investigations/';
const metadataText = (value) => (typeof value === 'string' ? value : null);

export async function checkPsiInvestigation(accession) {
  const snapshot = await loadPsiSnapshot();
  const study = snapshot.investigations.find((item) => item.accession === accession);
  if (!study) return null;

  const bundledFiles = snapshot.tables
    .filter((table) => table.accession === accession)
    .map((table) => table.file);
  const endpoint = base + accession;
  const fallback = { accession, endpoint, bundledFiles, status: 'snapshot' };
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(6500),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      return fallback;
    }
    const record = await response.json();
    if (record.accession !== accession || !Array.isArray(record.experimentalTable)) return fallback;

    const publishedFiles = record.experimentalTable
      .map((item) => metadataText(item?.file_name))
      .filter(Boolean);
    return {
      ...fallback,
      status: 'live',
      title: metadataText(record.title),
      doi: metadataText(record.doi),
      version: metadataText(record.version),
      publishedFiles,
      confirmedFiles: bundledFiles.filter((file) => publishedFiles.includes(file)),
    };
  } catch {
    return fallback;
  }
}
