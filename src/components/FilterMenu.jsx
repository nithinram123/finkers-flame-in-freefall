import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function FilterMenu({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const group = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    (
      group.current?.querySelector('[aria-pressed="true"]') ||
      group.current?.querySelector('button')
    )?.focus();
    function outside(event) {
      if (!root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  function handleKeys(event) {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
      trigger.current.focus();
    }
    if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(group.current.querySelectorAll('button'));
    const index = buttons.indexOf(document.activeElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  }
  return (
    <div
      className="filter-menu"
      ref={root}
      onKeyDown={handleKeys}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <span id={`${id}-label`}>{label}</span>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setOpen(!open)}
      >
        <span id={`${id}-value`}>{options.find(([key]) => key === value)?.[1]}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="filter-options"
          id={id}
          ref={group}
          role="group"
          aria-labelledby={`${id}-label`}
        >
          {options.map(([key, name]) => (
            <button
              type="button"
              key={key}
              aria-pressed={key === value}
              onClick={() => {
                onChange(key);
                setOpen(false);
                trigger.current.focus();
              }}
            >
              {name}
              {key === value && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
