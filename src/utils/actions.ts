// Utilidades para el seguimiento transversal de acciones (todas las de todos los A3).
import { A3Project, ActionItem } from '../types/lean';
import { localDate } from './dates';
import { causeLabel } from './actionSync';
import { rootCausesOf } from './rootCauses';

export interface ActionRow {
  project: A3Project;
  action: ActionItem;
}

/** Días hasta la fecha (negativo si ya pasó). null si no hay fecha válida. */
export function daysUntil(due: string | undefined, today: string = localDate()): number | null {
  if (!due || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return null;
  const a = Date.UTC(+due.slice(0, 4), +due.slice(5, 7) - 1, +due.slice(8, 10));
  const b = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  return Math.round((a - b) / 86_400_000);
}

export const isOpenAction = (a: ActionItem) => a.status !== 'completed';

export function isOverdue(a: ActionItem, today?: string): boolean {
  const d = daysUntil(a.dueDate, today);
  return isOpenAction(a) && d !== null && d < 0;
}

/** Todas las acciones con texto, de todos los A3, ordenadas por plazo. */
export function collectActions(projects: A3Project[]): ActionRow[] {
  const rows: ActionRow[] = [];
  for (const project of projects) {
    for (const action of project.actionItems || []) {
      if (action.action?.trim()) rows.push({ project, action });
    }
  }
  return rows.sort((x, y) => {
    const dx = x.action.dueDate || '9999-99-99';
    const dy = y.action.dueDate || '9999-99-99';
    return dx.localeCompare(dy);
  });
}

export const STATUS_LABEL: Record<ActionItem['status'], string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Hecha',
};

const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;

/** CSV compatible con Excel en español (separador «;» y BOM UTF-8). */
export function actionsToCsv(rows: ActionRow[]): string {
  const header = ['Acción', 'Responsable', 'Plazo', 'Estado', 'Causa raíz atacada', 'A3', 'Líder del A3', 'Área'];
  const lines = rows.map(({ project: p, action: a }) =>
    [
      a.action,
      a.owner,
      a.dueDate,
      STATUS_LABEL[a.status],
      causeLabel(a, rootCausesOf(p)),
      p.title,
      p.owner,
      p.department,
    ]
      .map((v) => esc(String(v ?? '')))
      .join(';')
  );
  return '﻿' + [header.map(esc).join(';'), ...lines].join('\r\n');
}

const words = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9ñ]+/)
    .filter(Boolean);

/**
 * ¿El responsable escrito en la acción corresponde a esta persona?
 * Todas las palabras del nombre deben aparecer como palabras completas
 * («Ana» coincide con «Ana María (Calidad)», no con «Mariana»).
 */
export function isOwner(owner: string | undefined, userName: string | undefined): boolean {
  if (!owner || !userName) return false;
  const o = new Set(words(owner));
  const u = words(userName);
  return u.length > 0 && u.every((w) => o.has(w));
}
