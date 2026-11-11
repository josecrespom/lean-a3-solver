import React from 'react';

export type BadgeTone = 'neutral' | 'blue' | 'green' | 'amber' | 'red';

const TONE: Record<BadgeTone, string> = {
  neutral:
    'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700',
  blue: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
  green:
    'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
  amber: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
  red: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800',
};

export const badgeClass = (tone: BadgeTone = 'neutral', extra = '') =>
  `inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${TONE[tone]}${extra ? ` ${extra}` : ''}`;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/** Etiqueta pequeña de estado o recuento */
export const Badge: React.FC<BadgeProps> = ({ tone, className, ...rest }) => (
  <span className={badgeClass(tone, className)} {...rest} />
);
