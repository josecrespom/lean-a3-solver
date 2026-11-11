import { Ban, ShieldAlert, Trophy, Zap, type LucideIcon } from 'lucide-react';
import type { ActionItem } from '../../types/lean';

export type Level = 'alto' | 'bajo';

export interface Quadrant {
  key: string;
  impact: Level;
  effort: Level;
  short: string;
  emoji: string;
  title: string;
  subtitle: string;
  empty: [string, string];
  placeholder: string;
  icon: LucideIcon;
  tone: {
    box: string;
    divider: string;
    badge: string;
    title: string;
    subtitle: string;
    count: string;
    empty: string;
    chip: string;
    button: string;
  };
}

/** Los cuatro cuadrantes de la matriz impacto/esfuerzo, en orden de prioridad */
export const QUADRANTS: Quadrant[] = [
  {
    key: 'qw',
    impact: 'alto',
    effort: 'bajo',
    short: 'Rápidas y eficaces',
    emoji: '⚡',
    title: '1. Rápidas y eficaces',
    subtitle: 'Alto impacto + bajo esfuerzo · Prioridad 1: hacer ya',
    empty: [
      'Todavía no hay acciones rápidas y eficaces',
      'Añade o reclasifica acciones de alto impacto y fácil implantación.',
    ],
    placeholder: 'Añadir acción rápida y eficaz…',
    icon: Zap,
    tone: {
      box: 'bg-emerald-50/40 dark:bg-emerald-950/20',
      divider: 'border-emerald-200/60 dark:border-emerald-800/50',
      badge: 'bg-emerald-600',
      title: 'text-emerald-950 dark:text-emerald-200',
      subtitle: 'text-emerald-700 dark:text-emerald-400',
      count: 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60',
      empty: 'text-emerald-800/80 dark:text-emerald-300/80 border-emerald-300/60 dark:border-emerald-800/60',
      chip: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300',
      button: 'bg-emerald-700 hover:bg-emerald-800',
    },
  },
  {
    key: 'strat',
    impact: 'alto',
    effort: 'alto',
    short: 'Estratégicas',
    emoji: '🏆',
    title: '2. Estratégicas',
    subtitle: 'Alto impacto + alto esfuerzo · Planificar con recursos y fechas',
    empty: ['Sin acciones estratégicas', 'Acciones clave que requieren inversión o cambios técnicos mayores.'],
    placeholder: 'Añadir acción estratégica…',
    icon: Trophy,
    tone: {
      box: 'bg-blue-50/40 dark:bg-blue-950/20',
      divider: 'border-blue-200/60 dark:border-blue-800/50',
      badge: 'bg-blue-600',
      title: 'text-blue-950 dark:text-blue-200',
      subtitle: 'text-blue-700 dark:text-blue-400',
      count: 'text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60',
      empty: 'text-blue-800/80 dark:text-blue-300/80 border-blue-300/60 dark:border-blue-800/60',
      chip: 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300',
      button: 'bg-blue-700 hover:bg-blue-800',
    },
  },
  {
    key: 'sec',
    impact: 'bajo',
    effort: 'bajo',
    short: 'Menores',
    emoji: '⏱',
    title: '3. Mejoras menores',
    subtitle: 'Bajo impacto + bajo esfuerzo · Solo si no retrasan las rápidas',
    empty: ['Sin mejoras menores', 'Ajustes menores de proceso o cartelería rápida.'],
    placeholder: 'Añadir mejora menor…',
    icon: ShieldAlert,
    tone: {
      box: 'bg-amber-50/40 dark:bg-amber-950/20',
      divider: 'border-amber-200/60 dark:border-amber-800/50',
      badge: 'bg-amber-600',
      title: 'text-amber-950 dark:text-amber-200',
      subtitle: 'text-amber-700 dark:text-amber-400',
      count: 'text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60',
      empty: 'text-amber-800/80 dark:text-amber-300/80 border-amber-300/60 dark:border-amber-800/60',
      chip: 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-300',
      button: 'bg-amber-700 hover:bg-amber-800',
    },
  },
  {
    key: 'avoid',
    impact: 'bajo',
    effort: 'alto',
    short: 'Descartar',
    emoji: '🚫',
    title: '4. Descartar o posponer',
    subtitle: 'Bajo impacto + alto esfuerzo · Desperdicio de recursos (Muda)',
    empty: ['Sin acciones descartadas', 'Evita comprometer recursos en propuestas complejas sin retorno.'],
    placeholder: 'Registrar propuesta descartada…',
    icon: Ban,
    tone: {
      box: 'bg-neutral-100/60 dark:bg-neutral-800/40',
      divider: 'border-neutral-300 dark:border-neutral-700',
      badge: 'bg-neutral-600',
      title: 'text-neutral-900 dark:text-neutral-200',
      subtitle: 'text-neutral-600 dark:text-neutral-400',
      count: 'text-neutral-700 dark:text-neutral-300 bg-neutral-200 dark:bg-neutral-700',
      empty: 'text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700',
      chip: 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300',
      button: 'bg-neutral-800 hover:bg-neutral-900',
    },
  },
];

export const inQuadrant = (q: Quadrant) => (a: ActionItem) => a.impact === q.impact && a.effort === q.effort;
