import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { A3Indicator } from '../types/lean';
import { meetsTarget, validMeasurements, withUnit } from '../utils/indicator';

interface Props {
  indicator: A3Indicator;
  /** Lámina impresa: sin hover y siempre en claro (la hoja impresa no tiene modo oscuro) */
  printMode?: boolean;
  height?: number;
}

const DAY = 86_400_000;
const toTime = (d: string) => new Date(`${d}T00:00:00`).getTime();
const shortDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
};
const longDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; ticks.length < 2 || ticks[ticks.length - 1] < max - 1e-9; v += step)
    ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/**
 * Gráfico de evolución de UN indicador frente a su meta y su línea base.
 * Una sola serie (sin leyenda: el título la nombra), líneas de referencia
 * rotuladas directamente y tooltip por punto. Los datos completos están en
 * la tabla de mediciones, que hace de vista accesible.
 */
export const IndicatorChart: React.FC<Props> = ({ indicator, printMode = false, height = 190 }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    measure();
    if (printMode || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [printMode]);

  const ms = useMemo(() => validMeasurements(indicator), [indicator]);
  // Si cambia el número de mediciones, el punto señalado ya no es el mismo
  const [hoverCount, setHoverCount] = useState(ms.length);
  if (hoverCount !== ms.length) {
    setHoverCount(ms.length);
    setHover(null);
  }

  const c = printMode
    ? {
        line: 'stroke-[#2a78d6]',
        dot: 'fill-[#2a78d6]',
        ring: 'stroke-white',
        grid: 'stroke-neutral-200',
        axisText: 'fill-neutral-500',
        refTarget: 'stroke-neutral-700',
        refBase: 'stroke-neutral-400',
        refText: 'fill-neutral-700',
        valueText: 'fill-neutral-900',
      }
    : {
        line: 'stroke-[#2a78d6] dark:stroke-[#3987e5]',
        dot: 'fill-[#2a78d6] dark:fill-[#3987e5]',
        ring: 'stroke-white dark:stroke-neutral-900',
        grid: 'stroke-neutral-200 dark:stroke-neutral-800',
        axisText: 'fill-neutral-500 dark:fill-neutral-400',
        refTarget: 'stroke-neutral-700 dark:stroke-neutral-300',
        refBase: 'stroke-neutral-400 dark:stroke-neutral-600',
        refText: 'fill-neutral-700 dark:fill-neutral-300',
        valueText: 'fill-neutral-900 dark:fill-neutral-100',
      };

  if (!ms.length) {
    return (
      <div
        ref={wrapRef}
        className="text-[11px] text-neutral-500 dark:text-neutral-400 italic px-2 py-6 text-center border border-dashed border-neutral-300 dark:border-neutral-700 rounded-md"
      >
        Añade la primera medición para ver la evolución frente a la meta.
      </div>
    );
  }

  const unit = indicator.unit;
  const m = { top: 12, right: 74, bottom: 22, left: 40 };
  const w = Math.max(width, 260);
  const innerW = w - m.left - m.right;
  const innerH = height - m.top - m.bottom;

  const values = ms.map((d) => d.value);
  const refs = [indicator.baseline, indicator.target].filter((v): v is number => v != null && Number.isFinite(v));
  const yTicks = niceTicks(Math.min(...values, ...refs), Math.max(...values, ...refs));
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const y = (v: number) => m.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  const t0 = toTime(ms[0].date);
  const t1 = toTime(ms[ms.length - 1].date);
  const span = t1 - t0;
  const pad = span ? span * 0.04 : DAY;
  const x = (d: string) => (span ? m.left + ((toTime(d) - t0 + pad) / (span + 2 * pad)) * innerW : m.left + innerW / 2);

  const pts = ms.map((d) => ({ ...d, cx: x(d.date), cy: y(d.value) }));
  const last = pts[pts.length - 1];
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(' ');

  // Etiquetas de fecha sin solaparse (primera y última siempre)
  const uniqueX: number[] = [];
  pts.forEach((p, i) => {
    const prev = uniqueX.length ? pts[uniqueX[uniqueX.length - 1]].cx : -Infinity;
    if (p.cx - prev >= 40) uniqueX.push(i);
  });
  if (uniqueX[uniqueX.length - 1] !== pts.length - 1) {
    if (uniqueX.length > 1) uniqueX.pop();
    if (!uniqueX.length || last.cx - pts[uniqueX[uniqueX.length - 1]].cx >= 40) uniqueX.push(pts.length - 1);
  }

  // Rótulos de las líneas de referencia; se separan si quedan pegados
  const refLabels: { key: string; y: number; text: string; dashed: string; cls: string }[] = [];
  if (indicator.target != null)
    refLabels.push({
      key: 'target',
      y: y(indicator.target),
      text: `Meta ${withUnit(indicator.target, unit)}`,
      dashed: '5 4',
      cls: c.refTarget,
    });
  if (indicator.baseline != null)
    refLabels.push({
      key: 'base',
      y: y(indicator.baseline),
      text: `Base ${withUnit(indicator.baseline, unit)}`,
      dashed: '2 3',
      cls: c.refBase,
    });
  if (refLabels.length === 2 && Math.abs(refLabels[0].y - refLabels[1].y) < 12) {
    const [a, b] = refLabels[0].y < refLabels[1].y ? [refLabels[0], refLabels[1]] : [refLabels[1], refLabels[0]];
    a.y -= 6;
    b.y += 6;
  }

  const hp = hover != null ? pts[hover] : null;
  const hpMet = hp ? meetsTarget(indicator, hp.value) : undefined;

  const summary =
    `${indicator.name || 'Indicador'}: ${ms.length} mediciones, última ${withUnit(last.value, unit)} el ${longDate(last.date)}` +
    (indicator.target != null ? `, meta ${withUnit(indicator.target, unit)}` : '');

  return (
    <div ref={wrapRef} className="relative w-full" data-indicator-chart>
      <svg
        width={w}
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        role="img"
        aria-label={summary}
        className="block max-w-full overflow-visible font-sans"
        onMouseLeave={() => setHover(null)}
      >
        {/* Rejilla y eje Y (recesivos) */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={m.left + innerW} y1={y(t)} y2={y(t)} className={c.grid} strokeWidth={1} />
            <text x={m.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} className={c.axisText}>
              {withUnit(t, unit === '%' ? '%' : undefined)}
            </text>
          </g>
        ))}
        {uniqueX.map((i) => (
          <text key={i} x={pts[i].cx} y={height - 6} textAnchor="middle" fontSize={10} className={c.axisText}>
            {shortDate(pts[i].date)}
          </text>
        ))}

        {/* Líneas de referencia rotuladas directamente */}
        {refLabels.map((r) => {
          const lineY = r.key === 'target' ? y(indicator.target!) : y(indicator.baseline!);
          return (
            <g key={r.key} data-ref={r.key}>
              <line
                x1={m.left}
                x2={m.left + innerW}
                y1={lineY}
                y2={lineY}
                className={r.cls}
                strokeWidth={1.5}
                strokeDasharray={r.dashed}
              />
              <text x={m.left + innerW + 6} y={r.y} dy="0.32em" fontSize={10} fontWeight={700} className={c.refText}>
                {r.text}
              </text>
            </g>
          );
        })}

        {/* Cruceta del hover */}
        {hp && <line x1={hp.cx} x2={hp.cx} y1={m.top} y2={m.top + innerH} className={c.grid} strokeWidth={1} />}

        {/* Serie */}
        {pts.length > 1 && (
          <path d={path} fill="none" className={c.line} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {pts.map((p, i) => (
          <circle
            key={p.id}
            cx={p.cx}
            cy={p.cy}
            r={hover === i ? 5.5 : 4}
            className={`${c.dot} ${c.ring}`}
            strokeWidth={2}
            data-point
          />
        ))}

        {/* Etiqueta directa solo en el último valor */}
        <text
          x={last.cx}
          y={last.cy - 10}
          textAnchor={last.cx > m.left + innerW - 20 ? 'end' : 'middle'}
          fontSize={11}
          fontWeight={800}
          className={c.valueText}
        >
          {withUnit(last.value, unit)}
        </text>

        {/* Zonas de captura del hover, más grandes que el punto */}
        {!printMode &&
          pts.map((p, i) => {
            const left = i === 0 ? m.left : (pts[i - 1].cx + p.cx) / 2;
            const right = i === pts.length - 1 ? m.left + innerW : (p.cx + pts[i + 1].cx) / 2;
            return (
              <rect
                key={`hit-${p.id}`}
                x={left}
                y={m.top}
                width={Math.max(right - left, 1)}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseMove={() => setHover(i)}
              />
            );
          })}
      </svg>

      {hp && !printMode && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 min-w-[140px] max-w-[220px] rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg px-2.5 py-1.5 text-[11px] text-neutral-800 dark:text-neutral-100"
          style={{
            left: Math.min(Math.max(hp.cx - 70, 0), Math.max(w - 220, 0)),
            top: Math.max(hp.cy - 70, 0),
          }}
        >
          <div className="text-neutral-500 dark:text-neutral-400">{longDate(hp.date)}</div>
          <div className="font-extrabold text-sm">{withUnit(hp.value, unit)}</div>
          {hpMet != null && <div className="font-semibold">{hpMet ? '✓ Cumple la meta' : '✗ No cumple la meta'}</div>}
          {hp.note && <div className="mt-0.5 text-neutral-600 dark:text-neutral-300">{hp.note}</div>}
        </div>
      )}
    </div>
  );
};

/** Mini-línea para las tarjetas del almacén: evolución y meta, sin ejes */
export const IndicatorSparkline: React.FC<{ indicator: A3Indicator; width?: number; height?: number }> = ({
  indicator,
  width = 96,
  height = 28,
}) => {
  const ms = validMeasurements(indicator);
  if (!ms.length) return null;
  const vals = [...ms.map((d) => d.value), ...(indicator.target != null ? [indicator.target] : [])];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = 3;
  const x = (i: number) => (ms.length === 1 ? width / 2 : pad + (i / (ms.length - 1)) * (width - 2 * pad));
  const y = (v: number) => (max === min ? height / 2 : pad + (1 - (v - min) / (max - min)) * (height - 2 * pad));
  const last = ms[ms.length - 1];
  return (
    <svg width={width} height={height} aria-hidden className="shrink-0 overflow-visible" data-sparkline>
      {indicator.target != null && (
        <line
          x1={0}
          x2={width}
          y1={y(indicator.target)}
          y2={y(indicator.target)}
          strokeDasharray="3 3"
          strokeWidth={1}
          className="stroke-neutral-500 dark:stroke-neutral-400"
        />
      )}
      {ms.length > 1 && (
        <path
          d={ms.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ')}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-[#2a78d6] dark:stroke-[#3987e5]"
        />
      )}
      <circle
        cx={x(ms.length - 1)}
        cy={y(last.value)}
        r={3.5}
        strokeWidth={1.5}
        className="fill-[#2a78d6] dark:fill-[#3987e5] stroke-white dark:stroke-neutral-900"
      />
    </svg>
  );
};
