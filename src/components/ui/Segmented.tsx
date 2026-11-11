import React from 'react';

export interface SegmentedOption {
  id: string;
  label: React.ReactNode;
  disabled?: boolean;
  title?: string;
}

/** Selector de opciones excluyentes (pestañas pequeñas): Lámina/Asistente, Árbol/Ishikawa… */
export const Segmented: React.FC<{
  options: SegmentedOption[];
  value: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
  className?: string;
}> = ({ options, value, onSelect, ariaLabel, className = '' }) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className={`no-print inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs ${className}`}
  >
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        onClick={() => onSelect(o.id)}
        aria-pressed={value === o.id}
        disabled={o.disabled}
        title={o.title}
        className={`px-2.5 py-1 font-semibold rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
          value === o.id
            ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-bold'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);
