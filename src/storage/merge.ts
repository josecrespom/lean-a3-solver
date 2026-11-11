// Fusión a tres bandas del almacén.
//   base:   última versión en la que este equipo y el archivo coincidían
//   mine:   versión actual en este equipo
//   theirs: versión actual en el archivo (guardada por otra persona)
// Se fusiona A3 por A3 y, dentro de cada A3, en profundidad: los objetos
// (indicador, Ishikawa…) clave a clave y las listas con identificador
// (contramedidas, mediciones, causas…) elemento a elemento. Solo hay conflicto
// si dos personas han cambiado de forma distinta EL MISMO dato (el mismo texto,
// la misma acción, la misma medición). Los comentarios de revisión se suman
// siempre (nunca se pierden).
import { A3Project, ReviewComment } from '../types/lean';

export interface MergeConflict {
  id: string;
  title: string;
  /** Versión fusionada quedándose con lo mío en los campos en conflicto */
  mine: A3Project;
  /** Versión fusionada quedándose con lo del archivo en los campos en conflicto */
  theirs: A3Project;
  fields: string[];
}

export interface MergeResult {
  merged: A3Project[];
  conflicts: MergeConflict[];
  /** A3 que incluyen cambios de otra persona (para avisar) */
  changedByOthers: string[];
}

const eq = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** Campos de registro: no generan conflicto, se toma el cambio más reciente. */
const META_FIELDS = new Set(['updatedAt', 'updatedBy']);

/** Comentarios: unión por id; para un mismo comentario gana el lado que lo cambió. */
export function mergeComments(
  base: ReviewComment[] = [],
  mine: ReviewComment[] = [],
  theirs: ReviewComment[] = []
): ReviewComment[] {
  const B = new Map(base.map((c) => [c.id, c]));
  const T = new Map(theirs.map((c) => [c.id, c]));
  const out: ReviewComment[] = [];
  const seen = new Set<string>();
  const pick = (id: string) => {
    const b = B.get(id);
    const m = mine.find((c) => c.id === id);
    const t = T.get(id);
    if (!m) return b && eq(t, b) ? undefined : t; // lo borré yo y no lo tocaron: fuera
    if (!t) return b && eq(m, b) ? undefined : m; // lo borraron y no lo toqué: fuera
    if (eq(m, b)) return t;
    if (eq(t, b)) return m;
    return { ...m, resolved: Boolean(m.resolved || t.resolved), resolvedBy: m.resolvedBy || t.resolvedBy };
  };
  for (const c of [...mine, ...theirs]) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    const v = pick(c.id);
    if (v) out.push(v);
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

// ---------------------------------------------------------------------------
// Fusión en profundidad
// ---------------------------------------------------------------------------
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasIds = (v: unknown): v is { id: string }[] =>
  Array.isArray(v) && v.every((x) => isObj(x) && typeof x.id === 'string');

/**
 * Resultado de fusionar un valor: `mine` / `theirs` son el valor fusionado
 * quedándose con lo mío o con lo suyo en lo que choca; `conflict` indica si
 * algo ha chocado (si no, mine === theirs).
 */
interface Merged3 {
  mine: unknown;
  theirs: unknown;
  conflict: boolean;
}

const same = (v: unknown): Merged3 => ({ mine: v, theirs: v, conflict: false });

export function merge3(b: unknown, m: unknown, t: unknown): Merged3 {
  if (eq(m, b)) return same(t);
  if (eq(t, b) || eq(m, t)) return same(m);
  if (isObj(b) && isObj(m) && isObj(t)) return mergeObjects(b, m, t);
  if (hasIds(b) && hasIds(m) && hasIds(t)) return mergeLists(b, m, t);
  return { mine: m, theirs: t, conflict: true };
}

function mergeObjects(b: Record<string, unknown>, m: Record<string, unknown>, t: Record<string, unknown>): Merged3 {
  const outM: Record<string, unknown> = {};
  const outT: Record<string, unknown> = {};
  let conflict = false;
  for (const k of new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)])) {
    const r = merge3(b[k], m[k], t[k]);
    conflict ||= r.conflict;
    if (r.mine !== undefined) outM[k] = r.mine;
    if (r.theirs !== undefined) outT[k] = r.theirs;
  }
  return { mine: outM, theirs: outT, conflict };
}

/** Listas de elementos con id: se fusiona cada elemento; altas y bajas de los dos lados se respetan */
function mergeLists(b: { id: string }[], m: { id: string }[], t: { id: string }[]): Merged3 {
  const B = new Map(b.map((x) => [x.id, x]));
  const M = new Map(m.map((x) => [x.id, x]));
  const T = new Map(t.map((x) => [x.id, x]));
  const pickM = new Map<string, unknown>();
  const pickT = new Map<string, unknown>();
  let conflict = false;
  for (const id of new Set([...B.keys(), ...M.keys(), ...T.keys()])) {
    const bi = B.get(id);
    const mi = M.get(id);
    const ti = T.get(id);
    let r: Merged3;
    if (bi && !mi && !ti) continue; // borrado en los dos lados
    if (bi && !mi) r = eq(ti, bi) ? same(undefined) : { mine: undefined, theirs: ti, conflict: true };
    else if (bi && !ti) r = eq(mi, bi) ? same(undefined) : { mine: mi, theirs: undefined, conflict: true };
    else if (!bi && mi && ti) r = eq(mi, ti) ? same(mi) : { mine: mi, theirs: ti, conflict: true };
    else if (!bi) r = same(mi ?? ti);
    else r = merge3(bi, mi, ti);
    conflict ||= r.conflict;
    if (r.mine !== undefined) pickM.set(id, r.mine);
    if (r.theirs !== undefined) pickT.set(id, r.theirs);
  }
  // Orden: el mío, y lo que solo tiene el otro detrás del elemento que le precede en su lista
  const order = m.map((x) => x.id);
  t.forEach((x, i) => {
    if (order.includes(x.id)) return;
    const prev = i > 0 ? order.indexOf(t[i - 1].id) : -1;
    order.splice(prev + 1, 0, x.id);
  });
  const build = (pick: Map<string, unknown>) => order.filter((id) => pick.has(id)).map((id) => pick.get(id));
  return { mine: build(pickM), theirs: build(pickT), conflict };
}

/** Fusión en profundidad de un A3 cambiado en los dos lados. */
export function mergeProject(base: A3Project, mine: A3Project, theirs: A3Project) {
  const keys = new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)]);
  const withMine: Record<string, unknown> = {};
  const withTheirs: Record<string, unknown> = {};
  const fields: string[] = [];
  const b = base as unknown as Record<string, unknown>;
  const m = mine as unknown as Record<string, unknown>;
  const t = theirs as unknown as Record<string, unknown>;

  for (const k of keys) {
    if (META_FIELDS.has(k)) continue;
    const r =
      k === 'comments' ? same(mergeComments(base.comments, mine.comments, theirs.comments)) : merge3(b[k], m[k], t[k]);
    if (r.conflict) fields.push(k);
    if (r.mine !== undefined) withMine[k] = r.mine;
    if (r.theirs !== undefined) withTheirs[k] = r.theirs;
  }

  // Registro de última modificación: el más reciente de los dos
  const latest = (mine.updatedAt || '') >= (theirs.updatedAt || '') ? mine : theirs;
  for (const target of [withMine, withTheirs]) {
    target.updatedAt = latest.updatedAt;
    target.updatedBy = latest.updatedBy;
  }
  return {
    mine: withMine as unknown as A3Project,
    theirs: withTheirs as unknown as A3Project,
    fields,
  };
}

export function mergeProjects(base: A3Project[], mine: A3Project[], theirs: A3Project[]): MergeResult {
  const B = new Map(base.map((p) => [p.id, p]));
  const M = new Map(mine.map((p) => [p.id, p]));
  const T = new Map(theirs.map((p) => [p.id, p]));

  const decided = new Map<string, A3Project | undefined>();
  const conflicts: MergeConflict[] = [];
  const changedByOthers: string[] = [];

  const ids = new Set([...B.keys(), ...M.keys(), ...T.keys()]);
  for (const id of ids) {
    const b = B.get(id);
    const m = M.get(id);
    const t = T.get(id);
    const iChanged = !eq(m, b);
    const theyChanged = !eq(t, b);

    if (!theyChanged) {
      decided.set(id, m);
    } else if (!iChanged) {
      decided.set(id, t);
      changedByOthers.push(id);
    } else if (eq(m, t)) {
      decided.set(id, m);
    } else if (m === undefined || t === undefined) {
      // Uno lo borró y el otro lo modificó: se conserva la versión modificada
      decided.set(id, m ?? t);
      if (t && !m) changedByOthers.push(id);
    } else if (!b) {
      // Creado en los dos lados con el mismo id (muy raro): se elige
      conflicts.push({ id, title: m.title || t.title, mine: m, theirs: t, fields: ['*'] });
      decided.set(id, m);
    } else {
      const r = mergeProject(b, m, t);
      changedByOthers.push(id);
      if (r.fields.length === 0) {
        decided.set(id, r.mine);
      } else {
        conflicts.push({ id, title: m.title || t.title, mine: r.mine, theirs: r.theirs, fields: r.fields });
        decided.set(id, r.mine); // provisional hasta que el usuario elija
      }
    }
  }

  // Orden: el del archivo, con los A3 nuevos de este equipo al principio
  const order: string[] = [];
  for (const p of mine) if (!T.has(p.id) && !B.has(p.id)) order.push(p.id);
  for (const p of theirs) order.push(p.id);
  for (const p of mine) order.push(p.id);

  const merged = order
    .filter((id, i) => order.indexOf(id) === i)
    .map((id) => decided.get(id))
    .filter((p): p is A3Project => p !== undefined);

  return { merged, conflicts, changedByOthers };
}

/** Aplica la elección del usuario a los A3 en conflicto. */
export function resolveConflicts(
  merged: A3Project[],
  conflicts: MergeConflict[],
  choice: 'mine' | 'theirs'
): A3Project[] {
  const pick = new Map(conflicts.map((c) => [c.id, choice === 'mine' ? c.mine : c.theirs]));
  return merged.map((p) => (pick.has(p.id) ? (pick.get(p.id) as A3Project) : p));
}

/** Opiniones: unión por id; si las dos versiones tienen la misma, gana la última modificada */
export function mergeOpinions<T extends { id: string; updatedAt: string }>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>();
  for (const o of [...a, ...b]) {
    const prev = byId.get(o.id);
    if (!prev || (o.updatedAt || '') > (prev.updatedAt || '')) byId.set(o.id, o);
  }
  return [...byId.values()].sort((x, y) => (y.updatedAt || '').localeCompare(x.updatedAt || ''));
}
