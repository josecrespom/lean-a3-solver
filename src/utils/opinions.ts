// Opiniones del equipo sobre la app: estados, versiones y exportación.
// Flujo: nueva → en estudio → planificada (para una versión) → hecha (en una versión) | descartada.
import { Opinion } from '../types/lean';
import { APP_VERSION, compareVersions } from './version';
import { describeStamp } from './dates';

export const KIND_LABEL: Record<Opinion['kind'], string> = {
  fallo: 'Fallo',
  idea: 'Mejora',
  duda: 'Duda',
};

export const OPINION_STATUS_LABEL: Record<Opinion['status'], string> = {
  nueva: 'Nueva',
  vista: 'En estudio',
  planificada: 'Planificada',
  hecha: 'Hecha',
  descartada: 'Descartada',
};

/** Estados en el orden del flujo (para listas y desplegables) */
export const OPINION_STATUSES = Object.keys(OPINION_STATUS_LABEL) as Opinion['status'][];

/** Sigue abierta: nueva, en estudio o planificada */
export const isOpenOpinion = (o: Opinion) => o.status !== 'hecha' && o.status !== 'descartada';

/** Estado desconocido (de una versión futura de la app) → se trata como «en estudio» */
export const statusOf = (o: Opinion): Opinion['status'] => (o.status in OPINION_STATUS_LABEL ? o.status : 'vista');

/**
 * Cambio de estado con sus datos: al marcarla hecha se anota la versión actual de
 * la app si no tenía (normalmente se marca al usar la versión que la incluye).
 */
export function statusPatch(o: Opinion, status: Opinion['status']): Partial<Opinion> {
  if (status === 'hecha') return { status, doneVersion: o.doneVersion || o.plannedVersion || APP_VERSION };
  return { status };
}

/** Planificadas para esta versión o una anterior: ya deberían estar hechas */
export const isDue = (o: Opinion, appVersion = APP_VERSION) =>
  o.status === 'planificada' && Boolean(o.plannedVersion) && compareVersions(o.plannedVersion, appVersion) <= 0;

/** Hechas agrupadas por versión, la más reciente primero */
export function doneByVersion(list: Opinion[]): { version: string; items: Opinion[] }[] {
  const groups = new Map<string, Opinion[]>();
  for (const o of list) {
    if (o.status !== 'hecha') continue;
    const v = o.doneVersion || 'sin versión';
    groups.set(v, [...(groups.get(v) ?? []), o]);
  }
  return [...groups.entries()]
    .map(([version, items]) => ({ version, items }))
    .sort((a, b) =>
      a.version === 'sin versión' ? 1 : b.version === 'sin versión' ? -1 : compareVersions(b.version, a.version)
    );
}

const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;

/** CSV para Excel (separador «;», con BOM para que respete los acentos) */
export function opinionsToCsv(list: Opinion[]): string {
  const header = ['Tipo', 'Opinión', 'Autor', 'Fecha', 'Dónde', 'Estado', 'Versión prevista', 'Hecha en', 'Respuesta'];
  const lines = list.map((o) =>
    [
      KIND_LABEL[o.kind] ?? o.kind,
      o.text,
      o.author || 'Anónimo',
      describeStamp(o.at),
      o.where || '',
      OPINION_STATUS_LABEL[statusOf(o)],
      o.plannedVersion || '',
      o.doneVersion || '',
      o.response || '',
    ]
      .map((v) => esc(String(v ?? '')))
      .join(';')
  );
  return '﻿' + [header.map(esc).join(';'), ...lines].join('\r\n');
}
