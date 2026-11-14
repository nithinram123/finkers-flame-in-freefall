import { useState } from 'react';
import { Empty, ExportButton, Measurement } from './ui.jsx';

export default function Records({ records, tables = [], title = 'Source records' }) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const lastPage = Math.max(0, Math.ceil(records.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = records.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const tableNames = new Map(tables.map((table) => [table.id, table.file]));
  return (
    <section className="records-section">
      <div className="section-heading">
        <h2>
          {title} <span className="muted">{records.length.toLocaleString('en')}</span>
        </h2>
        <ExportButton
          filename="nasa-psi-records.csv"
          headers={[
            'PSI ID',
            'Source record',
            'Kind',
            'Oxygen (%)',
            'Oxygen basis',
            'Pressure (kPa)',
            'Airflow (cm/s)',
            'Outcome',
            'Source table',
            'CSV row',
            'Duplicate of',
          ]}
          rows={records.map((record) => [
            record.accession,
            record.label,
            record.kind,
            record.oxygen.value,
            record.oxygenBasis,
            record.pressure.value,
            record.airflow.value,
            record.outcome,
            tableNames.get(record.tableId) || record.tableId,
            record.row,
            record.duplicateOf,
          ])}
        />
      </div>
      {!records.length ? (
        <Empty title="No source rows in this view">
          Some investigations provide metadata and publications without an experimental CSV.
        </Empty>
      ) : (
        <>
          <div
            className="table-scroll"
            tabIndex="0"
            role="region"
            aria-label={`${title}, scroll horizontally for all columns`}
          >
            <table>
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Type</th>
                  <th>Fuel / material</th>
                  <th className="number">O₂ %</th>
                  <th className="number">kPa</th>
                  <th className="number">cm/s</th>
                  <th>Outcome</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((record) => (
                  <tr key={record.id} className={record.duplicateOf ? 'duplicate-row' : ''}>
                    <td>
                      <a className="source-id" href={`#/record/${record.id}`}>
                        {record.label}
                      </a>
                      {record.duplicateOf && <small>Duplicate retained</small>}
                    </td>
                    <td>{record.kind}</td>
                    <td className="fuel-cell">
                      {record.fuel || <span className="muted">Not reported</span>}
                    </td>
                    <td className="number">
                      <Measurement measurement={record.oxygen} />
                      {record.oxygen.value !== null && record.oxygenBasis === 'burner oxidizer' && (
                        <small>burner stream</small>
                      )}
                    </td>
                    <td className="number">
                      <Measurement measurement={record.pressure} />
                    </td>
                    <td className="number">
                      <Measurement measurement={record.airflow} />
                    </td>
                    <td>{record.outcome}</td>
                    <td>
                      <a href={`#/record/${record.id}`}>
                        {record.accession}
                        <small>CSV row {record.row}</small>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, records.length)}{' '}
              of {records.length}
            </span>
            <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              Previous
            </button>
            <button disabled={currentPage >= lastPage} onClick={() => setPage(currentPage + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
