// Operaciones puras sobre la lista de A3 (sin React): fáciles de probar.
import { A3Project, ActionItem } from '../types/lean';
import { localDate, localStamp } from './dates';

export const TRASH_DAYS = 30;

const newId = () => `a3-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/** Inserta o sustituye un A3 (los nuevos van primero) */
export function upsertProject(list: A3Project[], p: A3Project): A3Project[] {
  return list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [p, ...list];
}

/** Envía un A3 a la papelera (borrado suave) */
export function trashProject(list: A3Project[], id: string, by?: string, now = localStamp()): A3Project[] {
  return list.map((p) => (p.id === id ? { ...p, deletedAt: now, deletedBy: by } : p));
}

/** Saca un A3 de la papelera */
export function restoreProject(list: A3Project[], id: string, by?: string, now = localStamp()): A3Project[] {
  return list.map((p) => {
    if (p.id !== id) return p;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { deletedAt, deletedBy, ...rest } = p;
    return { ...rest, updatedAt: now, updatedBy: by ?? p.updatedBy };
  });
}

/** Quita definitivamente lo que lleva más de TRASH_DAYS en la papelera */
export function purgeOldTrash(list: A3Project[], now = Date.now()): A3Project[] {
  const limit = localStamp(new Date(now - TRASH_DAYS * 86_400_000));
  return list.some((p) => p.deletedAt && p.deletedAt < limit)
    ? list.filter((p) => !(p.deletedAt && p.deletedAt < limit))
    : list;
}

export function duplicateProject(p: A3Project, by?: string): A3Project {
  return {
    ...JSON.parse(JSON.stringify(p)),
    id: newId(),
    title: `${p.title} (Copia)`,
    date: localDate(),
    updatedAt: localStamp(),
    createdBy: by,
    updatedBy: by,
    review: undefined,
    comments: undefined,
  };
}

/** Añade A3 importados; si un id ya existe, se le da uno nuevo para no pisar nada */
export function importProjects(list: A3Project[], imported: A3Project[]): A3Project[] {
  const ids = new Set(list.map((p) => p.id));
  const fresh = imported.map((item) => (!item.id || ids.has(item.id) ? { ...item, id: newId() } : item));
  return [...fresh, ...list];
}

export function updateAction(
  list: A3Project[],
  projectId: string,
  actionId: string,
  patch: Partial<ActionItem>,
  by?: string
): A3Project[] {
  return list.map((p) =>
    p.id === projectId
      ? {
          ...p,
          actionItems: (p.actionItems || []).map((a) => (a.id === actionId ? { ...a, ...patch } : a)),
          updatedAt: localStamp(),
          updatedBy: by ?? p.updatedBy,
        }
      : p
  );
}

/** Nombres que aparecen en los A3 (para proponer revisor o responsable) */
export function knownNamesOf(list: A3Project[]): string[] {
  return Array.from(
    new Set(
      list
        .flatMap((p) => [p.owner, p.createdBy, p.updatedBy, p.review?.reviewer, p.review?.requestedBy])
        .map((n) => n?.trim())
        .filter((n): n is string => Boolean(n))
    )
  ).sort((a, b) => a.localeCompare(b, 'es'));
}
