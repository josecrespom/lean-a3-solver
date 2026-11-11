import React, { useState } from 'react';
import { AutoTextarea } from './AutoTextarea';
import { ActionItem } from '../types/lean';
import { causeLabel, isLinkedTo, linkTo, syncActionsWithCauses } from '../utils/actionSync';
import { Plus, Trash2, AlertCircle, Target, Zap, Check } from 'lucide-react';

interface ActionItemsTableProps {
  items: ActionItem[];
  onChange: (items: ActionItem[]) => void;
  rootCausesList: { id: string; text: string }[];
  defaultOwner?: string;
}

export const ActionItemsTable: React.FC<ActionItemsTableProps> = ({
  items,
  onChange,
  rootCausesList,
  defaultOwner = '',
}) => {
  const [editingCustomCauseId, setEditingCustomCauseId] = useState<string | null>(null);

  const handleAddItem = (specificCause?: { id: string; text: string; idx: number }) => {
    // Nueva fila: vinculada a la causa elegida, o a la primera que aún no tenga contramedida
    const cause = specificCause ?? rootCausesList.find((rc) => !items.some((it) => isLinkedTo(it, rc)));

    const newItem: ActionItem = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action: '',
      owner: defaultOwner || '',
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'pending',
      ...(cause ? linkTo(cause) : {}),
    };
    onChange([...items, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<ActionItem>) => {
    onChange(items.map((it) => (it.id === id ? { ...it, ...updates } : it)));
  };

  const handleDeleteItem = (id: string) => {
    onChange(items.filter((it) => it.id !== id));
  };

  const handleSyncAllNow = () => {
    const next = syncActionsWithCauses(items, rootCausesList, defaultOwner);
    if (next !== items) onChange(next);
  };

  // Helper to count how many action items address each root cause
  const getActionCountForCause = (rc: { id: string; text: string }, _idx: number) =>
    items.filter((it) => isLinkedTo(it, rc)).length;

  return (
    <div className="flex flex-col gap-3 w-full text-xs">
      {/* =========================================================================
          BANNER DE CAUSAS RAÍZ PROVENIENTES DEL PASO 4 (AUTOMÁTICAS)
         ========================================================================= */}
      <div className="p-3 bg-neutral-50 dark:bg-neutral-900/80 rounded-lg border border-neutral-200 dark:border-neutral-700/80">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-[11px] font-bold text-[#0f274a] dark:text-blue-300 uppercase tracking-wider">
              Causas Raíz Detectadas en Paso 4:
            </span>
            <span className="text-[10px] tabular-nums px-1.5 py-0.2 bg-[#0f274a] text-white rounded font-bold border border-blue-900/50">
              {rootCausesList.length} identificada(s)
            </span>
          </div>

          {rootCausesList.some((rc) => !items.some((it) => isLinkedTo(it, rc))) && (
            <div className="no-print flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncAllNow}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#0f274a] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded transition-colors shadow-2xs"
                title="Añadir una contramedida por cada causa raíz del paso 4 que aún no tenga ninguna"
              >
                <Zap className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Añadir las que faltan</span>
              </button>
            </div>
          )}
        </div>

        {rootCausesList.length === 0 ? (
          <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-md text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Aviso Lean:</strong> No hay causas raíz marcadas en el{' '}
              <strong>Paso 4 (Análisis de Causa Raíz)</strong>. Ve al Paso 4 y haz clic en el icono de diana (🎯) en el
              Árbol de 5 Por Qués o en la Espina de Ishikawa para marcar causas raíz. Se trasladarán aquí
              automáticamente.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {rootCausesList.map((rc, idx) => {
              const count = getActionCountForCause(rc, idx);
              const hasAction = count > 0;
              return (
                <div
                  key={rc.id}
                  className={`group flex items-start gap-2 px-2.5 py-1 rounded-md text-xs font-semibold shadow-2xs border transition-all ${
                    hasAction
                      ? 'bg-[#0f274a] text-white border-blue-900 shadow-xs'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-600'
                  }`}
                >
                  <span className="w-4 h-4 mt-px bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1 min-w-0 leading-snug">{rc.text}</span>

                  {hasAction ? (
                    <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5 shrink-0">
                      <Check className="w-2.5 h-2.5" />
                      <span>
                        {count} {count === 1 ? 'acción' : 'acciones'}
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddItem({ id: rc.id, text: rc.text, idx })}
                      className="no-print text-[9px] bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 shrink-0 transition-colors"
                      title="Crear fila de contramedida para esta causa"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Asignar</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          CONTRAMEDIDAS: una ficha por acción (sin desplazamiento horizontal)
         ========================================================================= */}
      <ol className="flex flex-col gap-2" data-action-list aria-label="Contramedidas">
        {items.length === 0 ? (
          <li className="p-4 text-center text-neutral-500 dark:text-neutral-400 italic border border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
            No hay contramedidas. Pulsa «Añadir contramedida».
          </li>
        ) : (
          items.map((item, n) => {
            const isCustomMode = editingCustomCauseId === item.id;
            const quadrant =
              item.impact && item.effort
                ? item.impact === 'alto' && item.effort === 'bajo'
                  ? { label: 'Rápida y eficaz', title: 'Impacto alto, esfuerzo bajo (quick win)' }
                  : item.impact === 'alto' && item.effort === 'alto'
                    ? { label: 'Estratégica', title: 'Impacto alto, esfuerzo alto' }
                    : item.impact === 'bajo' && item.effort === 'bajo'
                      ? { label: 'Menor', title: 'Impacto bajo, esfuerzo bajo' }
                      : { label: 'A descartar', title: 'Impacto bajo, esfuerzo alto' }
                : null;
            const fieldLabel = 'text-[10px] font-bold uppercase text-neutral-500 dark:text-neutral-400';
            return (
              <li
                key={item.id}
                data-action-item
                className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 flex flex-col gap-1.5"
              >
                {/* Causa raíz que ataca */}
                <div className="flex items-start gap-2 text-[11px]">
                  <span className="shrink-0 font-bold text-neutral-500 dark:text-neutral-400 tabular-nums">
                    {n + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    {isCustomMode ? (
                      <div className="flex items-center gap-1">
                        <AutoTextarea
                          singleLine
                          aria-label={`Causa de la contramedida ${n + 1}`}
                          value={item.linkedRootCause || ''}
                          onChange={(e) => handleUpdateItem(item.id, { linkedRootCause: e.target.value })}
                          placeholder="Escribe la causa…"
                          className="w-full bg-transparent outline-none text-[11px] leading-snug text-neutral-800 dark:text-neutral-100"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setEditingCustomCauseId(null)}
                          className="text-[10px] text-blue-700 dark:text-blue-400 hover:underline shrink-0 font-bold"
                        >
                          Listo
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-neutral-500 dark:text-neutral-400">Ataca a:</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 leading-snug">
                          {causeLabel(item, rootCausesList) || 'sin causa vinculada'}
                        </span>
                        <select
                          aria-label={`Causa raíz que ataca la contramedida ${n + 1}`}
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__custom__') {
                              // Causa escrita a mano: deja de estar vinculada a una del paso 4
                              handleUpdateItem(item.id, {
                                linkedRootCause: causeLabel(item, rootCausesList),
                                linkedRootCauseId: undefined,
                              });
                              setEditingCustomCauseId(item.id);
                            } else if (val === '__none__') {
                              handleUpdateItem(item.id, { linkedRootCause: '', linkedRootCauseId: undefined });
                            } else {
                              const rc = rootCausesList.find((r) => r.id === val);
                              if (rc) handleUpdateItem(item.id, linkTo(rc));
                            }
                          }}
                          className="no-print appearance-none w-[5.5rem] bg-transparent text-[11px] font-bold text-blue-700 dark:text-blue-400 underline decoration-dotted cursor-pointer outline-none rounded focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <option value="" disabled>
                            {item.linkedRootCause ? 'cambiar…' : 'elegir causa…'}
                          </option>
                          {rootCausesList.map((rc, idx) => (
                            <option key={rc.id} value={rc.id}>
                              [#{idx + 1}] {rc.text}
                            </option>
                          ))}
                          <option value="__custom__">Escribir otra causa…</option>
                          {item.linkedRootCause && <option value="__none__">Quitar la causa</option>}
                        </select>
                      </div>
                    )}
                  </div>
                  {quadrant && (
                    <span
                      className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                      title={quadrant.title}
                    >
                      {quadrant.label}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="no-print shrink-0 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 p-0.5 rounded transition-colors"
                    aria-label={`Eliminar la contramedida ${n + 1}`}
                    title="Eliminar contramedida"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Qué se hace */}
                <AutoTextarea
                  minRows={1}
                  aria-label={`Contramedida ${n + 1}`}
                  value={item.action}
                  onChange={(e) => handleUpdateItem(item.id, { action: e.target.value })}
                  placeholder="Ej: Instalar un sensor a prueba de errores (Poka-Yoke) que confirme el caudal..."
                  spellCheck
                  lang="es"
                  className="w-full bg-neutral-50 dark:bg-neutral-800/60 rounded px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-xs font-semibold leading-snug text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
                />

                {/* Quién, cuándo y estado */}
                <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5">
                  <label className="flex flex-col gap-0.5 flex-1 min-w-[140px]">
                    <span className={fieldLabel}>Responsable</span>
                    <AutoTextarea
                      singleLine
                      value={item.owner}
                      onChange={(e) => handleUpdateItem(item.id, { owner: e.target.value })}
                      placeholder="Nombre / área"
                      className="w-full bg-transparent border-b border-neutral-200 dark:border-neutral-700 outline-none focus-visible:border-blue-500 text-xs leading-snug text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className={fieldLabel}>Plazo</span>
                    <input
                      type="date"
                      value={item.dueDate}
                      onChange={(e) => handleUpdateItem(item.id, { dueDate: e.target.value })}
                      className="bg-transparent border-b border-neutral-200 dark:border-neutral-700 outline-none focus-visible:border-blue-500 text-[11px] text-neutral-800 dark:text-neutral-200 tabular-nums"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className={fieldLabel}>Estado</span>
                    <select
                      value={item.status}
                      onChange={(e) => handleUpdateItem(item.id, { status: e.target.value as ActionItem['status'] })}
                      className="text-[11px] bg-transparent border-b border-neutral-200 dark:border-neutral-700 outline-none focus-visible:border-blue-500 font-bold cursor-pointer text-neutral-800 dark:text-neutral-200"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En curso</option>
                      <option value="completed">Hecha</option>
                    </select>
                  </label>
                </div>
              </li>
            );
          })
        )}
      </ol>

      <div className="no-print flex items-center justify-between pt-1">
        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 italic">
          Cada contramedida debe atacar una causa raíz del paso 4.
        </span>

        <button
          type="button"
          onClick={() => handleAddItem()}
          className="flex items-center gap-1 text-[11px] font-bold text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
          <span>Añadir contramedida</span>
        </button>
      </div>
    </div>
  );
};
