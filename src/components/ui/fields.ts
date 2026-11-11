// Clases comunes de los campos de formulario (inputs, selects y áreas de texto).
const FIELD =
  'rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white ' +
  'placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60';

export type FieldSize = 'xs' | 'sm' | 'md';
const SIZE: Record<FieldSize, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
};

export const fieldClass = (size: FieldSize = 'sm', extra = '') => `${FIELD} ${SIZE[size]}${extra ? ` ${extra}` : ''}`;
