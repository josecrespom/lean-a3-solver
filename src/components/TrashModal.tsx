import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { RotateCcw, Trash2 } from 'lucide-react';
import { A3Project } from '../types/lean';
import { daysUntil } from '../utils/actions';
import { describeStamp } from '../utils/dates';
import { buttonClass } from './ui/Button';

interface TrashModalProps {
  isOpen: boolean;
  items: A3Project[];
  days: number;
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
  onClose: () => void;
}

/** Papelera: A3 eliminados en los últimos días, con restaurar o borrar definitivamente. */
export const TrashModal: React.FC<TrashModalProps> = ({ isOpen, items, days, onRestore, onPurge, onClose }) => {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const sorted = [...items].sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Cerrar papelera"
      icon={<Trash2 className="w-4 h-4" />}
      title="Papelera"
      description={`Los A3 eliminados se pueden restaurar durante ${days} días; después se borran definitivamente.`}
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-6">La papelera está vacía.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((p) => {
            const elapsed = -(daysUntil(p.deletedAt?.slice(0, 10)) ?? 0);
            const left = Math.max(0, days - elapsed);
            return (
              <li
                key={p.id}
                className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                    {p.title || 'A3 sin título'}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Eliminado{p.deletedBy ? ` por ${p.deletedBy}` : ''} · {describeStamp(p.deletedAt)} · se borrará en{' '}
                    {left} {left === 1 ? 'día' : 'días'}
                  </div>
                </div>
                {confirmId === p.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-red-700 dark:text-red-400">¿Borrar para siempre?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onPurge(p.id);
                        setConfirmId(null);
                      }}
                      className="px-2.5 py-1 rounded-md font-bold bg-red-600 hover:bg-red-700 text-white"
                    >
                      Sí, borrar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="px-2 py-1 font-semibold text-neutral-700 dark:text-neutral-200"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onRestore(p.id)} className={buttonClass('primary', 'sm')}>
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(p.id)}
                      className={buttonClass('secondary', 'sm', 'hover:text-red-700 dark:hover:text-red-400')}
                    >
                      Borrar definitivamente
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
};
