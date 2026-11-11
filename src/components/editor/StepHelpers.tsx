import React from 'react';
import { BookOpen, MessageSquare, ShieldCheck } from 'lucide-react';

interface Props {
  step: number;
  guideOpen: boolean;
  checklistOpen: boolean;
  openComments: number;
  onToggleGuide: () => void;
  onToggleChecklist: () => void;
  onComment: () => void;
}

const chip = (active: boolean, activeTone: string) =>
  `no-print px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 border transition-colors ${
    active
      ? activeTone
      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700 hover:text-neutral-900 dark:hover:text-white'
  }`;
const AMBER =
  'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700';
const GREEN =
  'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700';

/** Botones de ayuda de cada paso de la lámina: Guía Sensei, Criterios de calidad y comentarios */
export const StepHelpers: React.FC<Props> = ({
  step,
  guideOpen,
  checklistOpen,
  openComments: n,
  onToggleGuide,
  onToggleChecklist,
  onComment,
}) => (
  <div className="flex items-center gap-1.5">
    <button
      type="button"
      onClick={onToggleGuide}
      className={chip(guideOpen, AMBER)}
      title="Mostrar u ocultar Guía Sensei con preguntas clave y ejemplos"
    >
      <BookOpen className="w-3 h-3 text-amber-600 dark:text-amber-400" />
      <span className="hidden @[34rem]:inline">Guía Sensei</span>
    </button>
    <button
      type="button"
      onClick={onToggleChecklist}
      className={chip(checklistOpen, GREEN)}
      title="Mostrar u ocultar Criterios de Rigor Lean"
    >
      <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
      <span className="hidden @[34rem]:inline">Criterios de calidad</span>
    </button>
    <button
      type="button"
      onClick={onComment}
      className={chip(n > 0, AMBER)}
      title={n > 0 ? `${n} comentario(s) de revisión pendiente(s) en este paso` : 'Comentar este paso'}
      aria-label={n > 0 ? `${n} comentarios pendientes en el paso ${step}` : `Comentar el paso ${step}`}
    >
      <MessageSquare className="w-3 h-3" />
      {n > 0 ? <span>{n}</span> : <span className="hidden @[34rem]:inline">Comentar</span>}
    </button>
  </div>
);
