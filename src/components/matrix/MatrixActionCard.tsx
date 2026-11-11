import React from 'react';
import { CheckCircle2, Circle, Clock, Trash2 } from 'lucide-react';
import type { ActionItem } from '../../types/lean';
import { formatDate } from '../../utils/dates';
import { STATUS_LABEL } from '../../utils/actions';
import { QUADRANTS, type Level } from './quadrants';

interface Props {
  act: ActionItem;
  /** Texto de la causa que ataca (calculado a partir de su id) */
  cause?: string;
  onToggleStatus: () => void;
  onDelete: () => void;
  onMove: (impact: Level, effort: Level) => void;
}

/** Tarjeta de una contramedida dentro de un cuadrante de la matriz */
export const MatrixActionCard: React.FC<Props> = ({ act, cause, onToggleStatus, onDelete, onMove }) => (
  <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-2">
    <div className="flex items-start gap-2">
      <button
        type="button"
        onClick={onToggleStatus}
        aria-label={`Estado: ${STATUS_LABEL[act.status]}. Pulsa para avanzar`}
        title={`Estado: ${STATUS_LABEL[act.status]}. Pulsa para avanzar.`}
        className="mt-0.5 shrink-0"
      >
        {act.status === 'completed' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        ) : act.status === 'in_progress' ? (
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <Circle className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-semibold leading-snug ${
            act.status === 'completed'
              ? 'line-through text-neutral-500 dark:text-neutral-400'
              : 'text-neutral-900 dark:text-white'
          }`}
        >
          {act.action || '(sin descripción)'}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
          <span>
            Resp: <strong className="text-neutral-700 dark:text-neutral-300">{act.owner || 'sin asignar'}</strong>
          </span>
          <span>·</span>
          <span>Plazo: {formatDate(act.dueDate) || 'sin fecha'}</span>
          {cause && (
            <>
              <span>·</span>
              <span
                className="truncate max-w-[160px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1 rounded"
                title={cause}
              >
                🎯 {cause}
              </span>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded transition-colors"
        aria-label="Eliminar contramedida"
        title="Eliminar contramedida"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
    <label className="flex items-center justify-between pt-1.5 border-t border-neutral-100 dark:border-neutral-800 text-[10px]">
      <span className="text-neutral-500 dark:text-neutral-400">Reclasificar:</span>
      <select
        value={`${act.impact}-${act.effort}`}
        onChange={(e) => {
          const [imp, eff] = e.target.value.split('-') as [Level, Level];
          onMove(imp, eff);
        }}
        className="text-[10px] bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 outline-none font-medium"
      >
        {QUADRANTS.map((q) => (
          <option key={q.key} value={`${q.impact}-${q.effort}`}>
            {q.emoji} {q.short} (impacto {q.impact} / esfuerzo {q.effort})
          </option>
        ))}
      </select>
    </label>
  </div>
);
