import React from 'react';

/**
 * Jerarquía de color: brand (rojo) solo para crear un A3; primary (negro)
 * para la acción principal de cada pantalla; secondary/ghost para el resto;
 * danger para borrar. El azul queda para enlaces, foco y progreso.
 */
export type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'danger' | 'dark' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md border font-semibold transition-colors whitespace-nowrap ' +
  'disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ' +
  'focus-visible:ring-offset-1 dark:focus-visible:ring-offset-neutral-900';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-neutral-900 hover:bg-neutral-700 border-neutral-900 text-white dark:bg-neutral-600 dark:hover:bg-neutral-500 dark:border-neutral-500 shadow-xs',
  secondary:
    'bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 shadow-2xs',
  brand: 'bg-red-600 hover:bg-red-700 border-red-700 text-white shadow-xs',
  danger: 'bg-red-600 hover:bg-red-700 border-red-700 text-white shadow-xs',
  dark: 'bg-neutral-900 hover:bg-neutral-800 border-neutral-900 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:border-neutral-600 text-white',
  ghost:
    'border-transparent bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200',
};

const SIZE: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

/** Clases de un botón común (para enlaces u otros elementos con aspecto de botón) */
export const buttonClass = (variant: ButtonVariant = 'secondary', size: ButtonSize = 'sm', extra = '') =>
  `${BASE} ${VARIANT[variant]} ${SIZE[size]}${extra ? ` ${extra}` : ''}`;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: React.Ref<HTMLButtonElement>;
}

/** Botón común de la app: mismas variantes, tamaños y foco visible en todas las pantallas */
export const Button: React.FC<ButtonProps> = ({ variant, size, className, type = 'button', ...rest }) => (
  <button type={type} className={buttonClass(variant, size, className)} {...rest} />
);
