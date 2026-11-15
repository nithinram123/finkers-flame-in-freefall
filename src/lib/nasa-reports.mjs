const ignored = new Set(
  'a about an and are as at be by can could did do does find for from had has have how i in is it me of on or please report reports say show tell test tests that the these this to us was were what when where which who why will with would you'.split(
    ' ',
  ),
);

export function nasaReportSearch(question) {
  const words = question.toLowerCase().match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? [];
  const terms = [...new Set(words.filter((word) => !ignored.has(word)))];
  const topics = terms.filter((word) => !/^psi-\d+$/.test(word));
  const query = (topics.length ? topics : terms).slice(0, 10).join(' ');
  const searchUrl =
    'https://ntrs.nasa.gov/search' + (query ? '?' + new URLSearchParams({ q: query }) : '');
  const siteSearchUrl =
    'https://www.nasa.gov/' + (query ? '?' + new URLSearchParams({ s: query }) : '');
  return { query, searchUrl, siteSearchUrl };
}
