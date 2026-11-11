// Decide qué hacer cuando el archivo ha cambiado: es una función pura (sin
// archivo ni React) para poder probarla por separado.
import { A3Project } from '../../types/lean';
import { MergeConflict, mergeProjects } from '../merge';

/** A partir de cuántos A3 desaparecidos de golpe (sin pasar por la papelera) se pregunta */
export const MISSING_THRESHOLD = 3;

export type MergePlan =
  /** El archivo está vacío pero había A3: escritura interrumpida, no «todo borrado» */
  | { kind: 'damaged' }
  /** No se sabe qué había antes: hay que elegir el archivo entero */
  | { kind: 'whole' }
  /** Faltan varios A3 que no estaban en la papelera: preguntar */
  | { kind: 'missing'; merged: A3Project[]; conflicts: MergeConflict[]; missing: A3Project[]; fromOthers: number }
  /** Los dos han cambiado lo mismo: preguntar por esos A3 */
  | { kind: 'conflicts'; merged: A3Project[]; conflicts: MergeConflict[]; fromOthers: number }
  /** Fusión sin conflictos: guardar */
  | { kind: 'commit'; merged: A3Project[]; fromOthers: number };

export function planMerge(
  base: A3Project[] | null,
  mine: A3Project[],
  file: { projects: A3Project[]; empty?: boolean }
): MergePlan {
  if (file.empty && (base?.length || mine.length)) return { kind: 'damaged' };
  if (!base) return { kind: 'whole' };
  const { merged, conflicts, changedByOthers } = mergeProjects(base, mine, file.projects);
  const fromOthers = changedByOthers.length;
  const fileIds = new Set(file.projects.map((p) => p.id));
  const missing = base.filter((p) => !p.deletedAt && !fileIds.has(p.id));
  if (missing.length >= MISSING_THRESHOLD) return { kind: 'missing', merged, conflicts, missing, fromOthers };
  if (conflicts.length > 0) return { kind: 'conflicts', merged, conflicts, fromOthers };
  return { kind: 'commit', merged, fromOthers };
}
