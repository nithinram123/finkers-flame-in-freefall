const gateway = 'https://api.nasa.gov/techtransfer/patent/';
const catalogue = 'https://technology.nasa.gov/api/api/patent/';

async function getPatents(url, signal, key) {
  const headers = { Accept: 'application/json' };
  if (key) headers['X-Api-Key'] = key;
  const response = await fetch(url, { headers, signal, redirect: 'manual' });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    return { status: response.status, patents: null };
  }
  const body = await response.json();
  if (!Array.isArray(body.results)) return { status: response.status, patents: null };
  const patents = body.results
    .flatMap((row) => {
      if (!Array.isArray(row)) return [];
      const [id, , rawTitle] = row;
      if (!/^[A-Z0-9-]{2,32}$/.test(id) || typeof rawTitle !== 'string') return [];
      const title = rawTitle.replace(/<[^>]+>/g, '').trim();
      return title ? [{ id, title, url: 'https://technology.nasa.gov/patent/' + id }] : [];
    })
    .slice(0, 3);
  return { status: response.status, patents };
}

export async function searchNasaTechTransfer(query, key) {
  const term = query.split(' ').slice(0, 4).join(' ');
  const encoded = encodeURIComponent(term);
  const signal = AbortSignal.timeout(5000);
  const authenticated = await getPatents(gateway + encoded, signal, key).catch(() => null);
  if (authenticated?.patents) {
    return {
      source: 'NASA Open APIs',
      gatewayStatus: authenticated.status,
      patents: authenticated.patents,
    };
  }
  const direct = await getPatents(catalogue + encoded, signal).catch(() => null);
  return {
    source: direct?.patents ? 'NASA Technology Transfer catalogue' : null,
    gatewayStatus: authenticated?.status ?? null,
    patents: direct?.patents ?? [],
  };
}
