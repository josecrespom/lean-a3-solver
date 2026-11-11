import type { A3Indicator, A3Project, IndicatorMeasurement } from '../types/lean';

export const formatNumber = (n: number | null | undefined): string =>
  n == null || !Number.isFinite(n) ? '' : n.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export const withUnit = (n: number | null | undefined, unit?: string): string => {
  const s = formatNumber(n);
  if (!s) return '';
  if (!unit) return s;
  return unit === '%' ? `${s}%` : `${s} ${unit}`;
};

/** Acepta coma o punto decimal. Devuelve undefined si está vacío y NaN si no es un número. */
export function parseNumber(text: string): number | undefined {
  const t = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return undefined;
  return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
}

/** Primer número que aparece en un texto libre («< 0,3 %» → 0.3) */
export function firstNumber(t?: string): number | undefined {
  const m = t?.match(/[-+]?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(',', '.')) : undefined;
}

/** Mediciones con valor, ordenadas por fecha */
export function validMeasurements(ind?: A3Indicator): (IndicatorMeasurement & { value: number })[] {
  if (!ind) return [];
  return ind.measurements
    .filter(
      (m): m is IndicatorMeasurement & { value: number } => m.value != null && Number.isFinite(m.value) && !!m.date
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const meetsTarget = (ind: A3Indicator, v: number): boolean | undefined =>
  ind.target == null ? undefined : ind.direction === 'down' ? v <= ind.target : v >= ind.target;

export interface IndicatorStatus {
  last?: number;
  lastDate?: string;
  count: number;
  /** undefined si no hay meta */
  met?: boolean;
  /** Mediciones seguidas (desde la última) que cumplen la meta */
  streak: number;
  /** Lo que falta para la meta (en unidades del indicador, siempre ≥ 0) */
  gap?: number;
  /** Mejora frente a la línea base, en % (positivo = mejor) */
  improvementPct?: number;
}

export function indicatorStatus(ind?: A3Indicator): IndicatorStatus {
  const ms = validMeasurements(ind);
  if (!ind || !ms.length) return { count: 0, streak: 0 };
  const last = ms[ms.length - 1];
  let streak = 0;
  for (let i = ms.length - 1; i >= 0 && meetsTarget(ind, ms[i].value); i--) streak++;
  const met = meetsTarget(ind, last.value);
  const gap = ind.target == null || met ? (met ? 0 : undefined) : Math.abs(last.value - ind.target);
  let improvementPct: number | undefined;
  if (ind.baseline != null && ind.baseline !== 0) {
    const delta = ind.direction === 'down' ? ind.baseline - last.value : last.value - ind.baseline;
    improvementPct = (delta / Math.abs(ind.baseline)) * 100;
  }
  return { last: last.value, lastDate: last.date, count: ms.length, met, streak, gap, improvementPct };
}

/** Antes / Meta / Actual: del indicador si existe; si no, los textos libres de siempre */
export function metricSummary(p: A3Project): { before: string; target: string; after: string } {
  const ind = p.indicator;
  if (!ind) return { before: p.beforeMetric || '', target: p.targetMetric || '', after: p.afterMetric || '' };
  const st = indicatorStatus(ind);
  const sign = ind.direction === 'down' ? '≤ ' : '≥ ';
  return {
    before: withUnit(ind.baseline, ind.unit),
    target: ind.target == null ? '' : sign + withUnit(ind.target, ind.unit),
    after: withUnit(st.last, ind.unit),
  };
}

export const emptyIndicator = (): A3Indicator => ({ name: '', unit: '', direction: 'down', measurements: [] });
