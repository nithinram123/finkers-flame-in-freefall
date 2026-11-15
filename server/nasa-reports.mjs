import { nasaReportSearch } from '../src/lib/nasa-reports.mjs';

export async function lookupNasaReports(question) {
  const plan = nasaReportSearch(question);
  if (!plan.query) return { ...plan, status: 'no-results', reports: [] };

  try {
    const params = new URLSearchParams({ q: plan.query, 'page.size': '4' });
    const reply = await fetch('https://ntrs.nasa.gov/api/citations/search?' + params, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'application/json' },
      redirect: 'error',
    });
    if (!reply.ok) throw new Error('NASA search unavailable');
    const data = await reply.json();
    const reports = [
      ...new Map(
        data.results
          .filter(
            ({ id, title }) =>
              /^\d+$/.test(String(id)) && typeof title === 'string' && title.trim(),
          )
          .map(({ id, title, publications }) => [
            String(id),
            {
              id: String(id),
              title: title.trim(),
              year: publications?.[0]?.publicationDate?.match(/^\d{4}/)?.[0] ?? null,
              url: 'https://ntrs.nasa.gov/citations/' + id,
            },
          ]),
      ).values(),
    ].slice(0, 4);
    return { ...plan, status: reports.length ? 'results' : 'no-results', reports };
  } catch {
    return { ...plan, status: 'unavailable', reports: [] };
  }
}
