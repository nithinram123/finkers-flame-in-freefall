import { Empty, Notice, PageTitle } from './ui.jsx';

export function RecordFields({ record, table }) {
  return (
    <>
      {record.flags.length > 0 && <Notice>{record.flags.join('. ')}.</Notice>}
      <div className="table-scroll">
        <table className="raw-record">
          <thead>
            <tr>
              <th scope="col">Original column</th>
              <th scope="col">Original value</th>
            </tr>
          </thead>
          <tbody>
            {table.headers.map((header, index) => (
              <tr key={index}>
                <th scope="row">{header}</th>
                <td>{record.values[index] || <span className="muted">Empty in source</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function RecordDetail({ dataset, id }) {
  const record = dataset.records.find((item) => item.id === id);
  if (!record)
    return (
      <Empty title="Source row not found">
        <a href="#/explorer">Return to test explorer</a>
      </Empty>
    );
  const table = dataset.tables.find((item) => item.id === record.tableId);
  return (
    <>
      <a className="back-link" href={`#/investigation/${record.accession}`}>
        ← {record.accession} investigation
      </a>
      <PageTitle
        eyebrow="Original source values"
        title={`${record.accession} · ${record.label}`}
        description={`${record.kind} · CSV record ${record.row} (header is record 1)`}
      >
        <a className="button" href={`/data/${encodeURIComponent(table.file)}`} download>
          Download original CSV
        </a>
      </PageTitle>
      <p className="source-filename">{table.file}</p>
      <RecordFields record={record} table={table} />
    </>
  );
}
