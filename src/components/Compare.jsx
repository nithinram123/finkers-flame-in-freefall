import { rangeLabel } from '../lib/evidence.mjs';
import { Empty, Notice, PageTitle, SourceLink } from './ui.jsx';

export default function Compare({ dataset, selected, toggleCompare }) {
  const investigations = selected
    .map((id) => dataset.investigations.find((item) => item.accession === id))
    .filter(Boolean);
  const rows = [
    ['Fuel type', (item) => item.fuelType],
    ['Safety area', (item) => item.areas.join(', ')],
    ['Hardware', (item) => item.hardwareGroup],
    ['Platform', (item) => item.flightPlatform || 'Not reported'],
    ['Initial ambient O₂', (item) => rangeLabel(item.oxygenRange, '%')],
    ['Initial pressure', (item) => rangeLabel(item.pressureRange, 'kPa')],
    ['Measured airflow', (item) => rangeLabel(item.airflowRange, 'cm/s')],
    ['Test records', (item) => item.testRecordCount],
    ['All source records', (item) => item.recordCount],
    ['Study design', (item) => item.summary],
  ];
  return (
    <>
      <PageTitle
        eyebrow="Side-by-side evidence"
        title="Compare investigations"
        description="See shared conditions, different methods, and gaps in the available measurements."
      />
      {investigations.length < 2 ? (
        <Empty title="Choose two or three investigations">
          Select Compare on investigation cards. <a href="#/investigations">Browse the library</a>.
        </Empty>
      ) : (
        <>
          <Notice>
            Ranges describe the supplied records. Overlapping ranges do not establish identical
            tests, matched materials, or equivalent flame behavior.
          </Notice>
          <div
            className="table-scroll comparison-table"
            tabIndex="0"
            role="region"
            aria-label="Investigation comparison"
          >
            <table>
              <thead>
                <tr>
                  <th>Attribute</th>
                  {investigations.map((item) => (
                    <th key={item.accession}>
                      <a href={`#/investigation/${item.accession}`}>{item.name}</a>
                      <small>{item.accession}</small>
                      <button className="text-button" onClick={() => toggleCompare(item.accession)}>
                        Remove
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, getValue]) => {
                  const values = investigations.map(getValue);
                  return (
                    <tr key={label}>
                      <th scope="row">
                        {label}
                        {values[0] !== 'Not reported' &&
                          values.every((value) => value === values[0]) && (
                            <small className="same-label">Same reported value</small>
                          )}
                      </th>
                      {values.map((value, index) => (
                        <td key={investigations[index].accession}>{value}</td>
                      ))}
                    </tr>
                  );
                })}
                <tr>
                  <th scope="row">Provenance</th>
                  {investigations.map((item) => (
                    <td key={item.accession}>
                      <SourceLink investigation={item} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
