import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { History, RotateCcw } from 'lucide-react';
import { A3Project } from '../types/lean';
import { A3Version, listVersions } from '../storage/history';
import { calculateA3Completeness } from '../utils/completeness';
import { describeStamp } from '../utils/dates';
import { buttonClass } from './ui/Button';

interface HistoryModalProps {
  project: A3Project | null;
  onRestore: (data: A3Project) => void;
  onClose: () => void;
}

/** Versiones anteriores de un A3 guardadas en este navegador, con opción de restaurar. */
export const HistoryModal: React.FC<HistoryModalProps> = ({ project, onRestore, onClose }) => {
  const [versions, setVersions] = useState<A3Version[] | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  // Se monta de nuevo para cada A3 (key en App): no hace falta reiniciar el estado
  useEffect(() => {
    if (!project) return;
    listVersions(project.id).then(setVersions);
  }, [project]);

  if (!project) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      closeLabel="Cerrar historial"
      icon={<History className="w-4 h-4" />}
      title="Versiones anteriores"
      description={`«${project.title}». Se guardan en este navegador (como mucho una cada 10 minutos de edición). Al restaurar, la versión actual también queda guardada aquí.`}
    >
      {versions === null ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-6">Cargando…</p>
      ) : versions.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-6">
          Todavía no hay versiones anteriores de este A3 en este navegador. Se irán guardando a medida que se edite.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {versions.map((v) => (
            <li
              key={v.id}
              className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-neutral-900 dark:text-white">
                  Versión de {describeStamp(v.data.updatedAt) || describeStamp(v.stamp)}
                  {v.data.updatedBy ? ` · ${v.data.updatedBy}` : ''}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {v.data.title} · completo {calculateA3Completeness(v.data).percentage}% ·{' '}
                  {(v.data.actionItems || []).length} acciones
                  {v.data.deletedAt ? ' · (antes de eliminarse)' : ''}
                </div>
              </div>
              {confirmId === v.id ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-200">¿Restaurar esta versión?</span>
                  <button type="button" onClick={() => onRestore(v.data)} className={buttonClass('primary', 'xs')}>
                    Sí, restaurar
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
                <button
                  type="button"
                  onClick={() => setConfirmId(v.id ?? null)}
                  className={buttonClass('secondary', 'sm')}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};
