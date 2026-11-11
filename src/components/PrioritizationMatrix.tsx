import React, { useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import type { ActionItem } from '../types/lean';
import { formatDate, localDate } from '../utils/dates';
import { MatrixActionCard } from './matrix/MatrixActionCard';
import { QUADRANTS, inQuadrant, type Level, type Quadrant } from './matrix/quadrants';
import { causeLabel } from '../utils/actionSync';

interface PrioritizationMatrixProps {
  actionItems: ActionItem[];
  /** Causas raíz del paso 4 (para mostrar a cuál ataca cada acción) */
  rootCauses?: { id: string; text: string }[];
  onChange: (items: ActionItem[]) => void;
}

const NEXT_STATUS: Record<ActionItem['status'], ActionItem['status']> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
};

/** Matriz de priorización 2×2 (impacto frente a esfuerzo) de las contramedidas del paso 5 */
export const PrioritizationMatrix: React.FC<PrioritizationMatrixProps> = ({
  actionItems = [],
  rootCauses = [],
  onChange,
}) => {
  const [draft, setDraft] = useState<Record<string, { text: string; owner: string }>>({});

  const update = (id: string, patch: Partial<ActionItem>) =>
    onChange(actionItems.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const move = (id: string, impact: Level, effort: Level) => update(id, { impact, effort });
  const unassigned = actionItems.filter((a) => !a.impact || !a.effort);

  const add = (q: Quadrant) => {
    const d = draft[q.key];
    const text = d?.text.trim();
    if (!text) return;
    const due = new Date(Date.now() + 14 * 86_400_000);
    onChange([
      ...actionItems,
      {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        action: text,
        owner: d.owner.trim(),
        dueDate: localDate(due),
        status: 'pending',
        impact: q.impact,
        effort: q.effort,
      },
    ]);
    setDraft((prev) => ({ ...prev, [q.key]: { text: '', owner: '' } }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-800/80 p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div>
          <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
            Matriz de priorización (impacto frente a esfuerzo)
          </h4>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
            Clasifica cada contramedida para dedicar los recursos primero a lo que más reduce el problema.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium shrink-0">
          {QUADRANTS.map((q) => (
            <span key={q.key} className={`flex items-center gap-1 px-2 py-0.5 rounded ${q.tone.chip}`}>
              <q.icon className="w-3 h-3" /> {q.short} ({actionItems.filter(inQuadrant(q)).length})
            </span>
          ))}
        </div>
      </div>

      {unassigned.length > 0 && (
        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Contramedidas sin priorizar ({unassigned.length})</span>
            </div>
            <span className="text-[10px] text-amber-800 dark:text-amber-400">Elige su cuadrante:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {unassigned.map((act) => (
              <div
                key={act.id}
                className="bg-white dark:bg-neutral-900 p-2.5 rounded-md border border-amber-200 dark:border-amber-900/60 shadow-2xs flex flex-col justify-between gap-2"
              >
                <div>
                  <p className="text-xs font-semibold text-neutral-900 dark:text-white line-clamp-2">
                    {act.action || '(sin descripción)'}
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Resp: <strong>{act.owner || 'sin asignar'}</strong> · Plazo:{' '}
                    {formatDate(act.dueDate) || 'sin fecha'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-[9px] text-neutral-500 dark:text-neutral-400 mr-1">Mover a:</span>
                  {QUADRANTS.map((q) => (
                    <button
                      key={q.key}
                      type="button"
                      onClick={() => move(act.id, q.impact, q.effort)}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors ${q.tone.chip}`}
                    >
                      {q.emoji} {q.short}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative border-2 border-neutral-300 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
        <div className="bg-neutral-100 dark:bg-neutral-800/90 px-4 py-1.5 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
          <span>▲ Alto impacto en el problema</span>
          <span className="text-[10px] font-semibold normal-case text-neutral-500 dark:text-neutral-400">
            Vertical: impacto · Horizontal: esfuerzo o coste
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-700">
          {QUADRANTS.map((q, i) => {
            const items = actionItems.filter(inQuadrant(q));
            const d = draft[q.key] ?? { text: '', owner: '' };
            const setD = (patch: Partial<typeof d>) => setDraft((prev) => ({ ...prev, [q.key]: { ...d, ...patch } }));
            return (
              <section
                key={q.key}
                aria-label={q.title}
                className={`p-4 flex flex-col min-h-[260px] ${q.tone.box} ${i < 2 ? 'border-b border-neutral-200 dark:border-neutral-700' : ''}`}
              >
                <div className={`flex items-center justify-between pb-2 mb-3 border-b ${q.tone.divider}`}>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-6 h-6 rounded-md text-white flex items-center justify-center shadow-2xs ${q.tone.badge}`}
                    >
                      <q.icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className={`text-xs font-bold uppercase tracking-tight ${q.tone.title}`}>{q.title}</h5>
                      <p className={`text-[10px] ${q.tone.subtitle}`}>{q.subtitle}</p>
                    </div>
                  </div>
                  <span className={`text-xs tabular-nums font-bold px-2 py-0.5 rounded-full ${q.tone.count}`}>
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  {items.length === 0 ? (
                    <div
                      className={`h-28 flex flex-col items-center justify-center text-center text-[11px] border border-dashed rounded-lg p-3 ${q.tone.empty}`}
                    >
                      <p className="font-semibold">{q.empty[0]}</p>
                      <p className="text-[10px] mt-0.5">{q.empty[1]}</p>
                    </div>
                  ) : (
                    items.map((act) => (
                      <MatrixActionCard
                        key={act.id}
                        act={act}
                        cause={causeLabel(act, rootCauses)}
                        onToggleStatus={() => update(act.id, { status: NEXT_STATUS[act.status] || 'pending' })}
                        onDelete={() => onChange(actionItems.filter((a) => a.id !== act.id))}
                        onMove={(imp, eff) => move(act.id, imp, eff)}
                      />
                    ))
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-200/70 dark:border-neutral-700/60 space-y-1.5">
                  <input
                    type="text"
                    aria-label={q.placeholder}
                    value={d.text}
                    onChange={(e) => setD({ text: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && add(q)}
                    placeholder={q.placeholder}
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      aria-label="Responsable de la nueva acción"
                      value={d.owner}
                      onChange={(e) => setD({ owner: e.target.value })}
                      placeholder="Responsable"
                      className="flex-1 text-[11px] px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => add(q)}
                      disabled={!d.text.trim()}
                      className={`px-2.5 py-1 text-xs font-semibold text-white rounded-md transition-colors flex items-center gap-1 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${q.tone.button}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir</span>
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
        <div className="bg-neutral-100 dark:bg-neutral-800/90 px-4 py-1.5 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
          <span>◀ Bajo esfuerzo o coste</span>
          <span>Alto esfuerzo o coste ▶</span>
        </div>
      </div>
    </div>
  );
};
