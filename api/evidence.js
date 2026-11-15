import { loadPsiSnapshot } from '../server/psi-snapshot.mjs';
import { snapshotSummary } from '../src/lib/psi-summary.mjs';
import { readScenario } from '../src/lib/scenario.mjs';

export default async function evidence(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.statusCode = 405;
    return response.end(JSON.stringify({ message: 'Use GET to read archive coverage.' }));
  }
  try {
    const query = new URL(request.url || '', 'http://localhost').searchParams;
    const cabin = query.has('preset') || query.has('oxygen') ? readScenario(query) : null;
    const snapshot = await loadPsiSnapshot();
    response.setHeader('Cache-Control', 'no-cache');
    return response.end(JSON.stringify(snapshotSummary(snapshot, cabin)));
  } catch {
    response.statusCode = 503;
    return response.end(JSON.stringify({ message: 'NASA PSI snapshot is unavailable.' }));
  }
}
