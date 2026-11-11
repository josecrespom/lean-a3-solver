// Relación entre contramedidas (paso 5) y causas raíz (paso 4)
import { ActionItem } from '../types/lean';

// Normaliza el texto de una causa quitando prefijos como "[#2]" o "[Maquinaria]"
const normalizeCause = (t: string) =>
  t
    .replace(/^\s*\[#\d+\]\s*/, '')
    .replace(/^\s*\[[^\]]*\]\s*/, '')
    .trim()
    .toLowerCase();

/** ¿La acción está vinculada a esta causa raíz? (por id o por texto) */
export const isLinkedTo = (it: ActionItem, rc: { id: string; text: string }) => {
  if (it.linkedRootCauseId) return it.linkedRootCauseId === rc.id;
  if (!it.linkedRootCause) return false;
  const a = normalizeCause(it.linkedRootCause);
  const b = normalizeCause(rc.text);
  if (!a || !b) return false;
  return a === b || (Math.min(a.length, b.length) >= 8 && (a.includes(b) || b.includes(a)));
};

type CauseRef = { id: string; text: string };

/** Datos para vincular una acción a una causa: por id (el texto se guarda solo como respaldo legible) */
export const linkTo = (rc: CauseRef): Pick<ActionItem, 'linkedRootCause' | 'linkedRootCauseId'> => ({
  linkedRootCause: rc.text,
  linkedRootCauseId: rc.id,
});

/**
 * Texto que se muestra de la causa de una acción. Se calcula al mostrarlo a partir
 * del id (número y texto actuales de la causa), así que renombrar o reordenar las
 * causas no cambia los datos de las acciones. Sin id (datos antiguos, causa escrita
 * a mano o causa ya borrada) se muestra el texto guardado.
 */
export function causeLabel(it: ActionItem, causes: CauseRef[]): string {
  if (it.linkedRootCauseId) {
    const idx = causes.findIndex((rc) => rc.id === it.linkedRootCauseId);
    if (idx >= 0) return `[#${idx + 1}] ${causes[idx].text}`;
  }
  // Los datos de versiones anteriores guardaban el número: ya no significa nada
  return (it.linkedRootCause || '').replace(/^\s*\[#\d+\]\s*/, '');
}

/**
 * Añade una contramedida vacía vinculada a cada causa raíz que aún no tiene ninguna
 * (solo cuando el usuario lo pide: abrir un A3 no lo modifica).
 * Devuelve la MISMA lista si no falta ninguna.
 */
export function syncActionsWithCauses(
  items: ActionItem[],
  rootCausesList: CauseRef[],
  defaultOwner = ''
): ActionItem[] {
  const missing = (rootCausesList || []).filter((rc) => !items.some((it) => isLinkedTo(it, rc)));
  if (missing.length === 0) return items;
  const defaultDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  return [
    ...items,
    ...missing.map((rc): ActionItem => ({
      id: `act-${rc.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action: '',
      owner: defaultOwner || '',
      dueDate: defaultDate,
      status: 'pending',
      ...linkTo(rc),
    })),
  ];
}
