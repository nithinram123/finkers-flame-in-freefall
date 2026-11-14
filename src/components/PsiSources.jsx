const value = (range, places, unit) =>
  range ? range.map((n) => Number(n.toFixed(places))).join('–') + ' ' + unit : 'Not reported';

export function PsiTag({ investigation, label }) {
  if (!investigation) return null;
  return (
    <a
      className="psi-tag"
      href={investigation.psi || investigation.psiPage}
      target="_blank"
      rel="noreferrer"
    >
      {label || investigation.acc || investigation.accession}
    </a>
  );
}

export default function PsiSources({ investigations }) {
  return (
    <section className="psi-sources" aria-labelledby="psi-title">
      <h2 id="psi-title">NASA PSI investigations</h2>
      <p>
        Oxygen and pressure ranges use reported ambient test measurements. Open an accession to see
        the original investigation.
      </p>
      <a href="/data/psi.json" download>
        Download PSI data (JSON)
      </a>
      <div
        className="table-scroll"
        role="region"
        aria-label="NASA PSI investigations table"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Acronym</th>
              <th scope="col">Accession</th>
              <th scope="col">Area</th>
              <th scope="col">Oxygen</th>
              <th scope="col">Pressure</th>
              <th scope="col">Test rows</th>
            </tr>
          </thead>
          <tbody>
            {investigations.map((item) => (
              <tr key={item.acc}>
                <th scope="row">{item.acronym}</th>
                <td data-label="Accession">
                  <PsiTag investigation={item} />
                  {item.doi && (
                    <a
                      className="psi-doi"
                      href={`https://doi.org/${item.doi.replace(/^https?:\/\/doi\.org\//, '')}`}
                    >
                      Dataset DOI
                    </a>
                  )}
                </td>
                <td data-label="Area">{item.area}</td>
                <td data-label="Oxygen">{value(item.o2, 1, '%')}</td>
                <td data-label="Pressure">{value(item.p, 2, 'atm')}</td>
                <td data-label="Test rows">{item.tests}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
