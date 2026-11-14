import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { RecordFields } from './RecordDetail.jsx';

export default function RecordDrawer({ dataset, records, onClose }) {
  const ref = useRef(null);
  const [selected, setSelected] = useState(0);
  const record = records[selected];
  const table = dataset.tables.find((item) => item.id === record.tableId);
  const investigation = dataset.investigations.find((item) => item.accession === record.accession);
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="record-drawer"
      aria-labelledby="drawer-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="drawer-content">
        <header className="drawer-header">
          <div>
            <span className="eyebrow">NASA PSI source record</span>
            <h2 id="drawer-title">
              {record.accession} · {record.label}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close source record"
            autoFocus
          >
            <X size={21} />
          </button>
        </header>
        {records.length > 1 && (
          <div className="drawer-pagination">
            <button
              type="button"
              onClick={() => setSelected(selected - 1)}
              disabled={selected === 0}
            >
              Previous
            </button>
            <span role="status">
              {selected + 1} of {records.length} records
            </span>
            <button
              type="button"
              onClick={() => setSelected(selected + 1)}
              disabled={selected === records.length - 1}
            >
              Next
            </button>
          </div>
        )}
        <p className="source-filename">
          {table.file}
          <br />
          CSV row {record.row} · {record.kind}
        </p>
        <div className="drawer-links">
          <a href={investigation.psiPage} target="_blank" rel="noreferrer">
            Source: {investigation.name}, {record.accession} <ArrowUpRight size={14} />
          </a>
          <a href={`/data/${encodeURIComponent(table.file)}`} download>
            Original CSV
          </a>
          <a href={`/record/${record.id}`}>Link to row</a>
        </div>
        <RecordFields record={record} table={table} />
      </div>
    </dialog>
  );
}
