import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, LineChart, Plus, Trash2 } from 'lucide-react';
import type { A3Indicator, IndicatorMeasurement } from '../types/lean';
import { IndicatorChart } from './IndicatorChart';
import { formatNumber, indicatorStatus, parseNumber, withUnit } from '../utils/indicator';
import { localDate } from '../utils/dates';
import { ConfirmModal } from './ConfirmModal';

/** Campo numérico que admite coma decimal sin perder lo que se está escribiendo */
const NumField: React.FC<{
  value: number | null | undefined;
  onChange: (v: number | undefined) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, ariaLabel, placeholder, className }) => {
  const [text, setText] = useState(formatNumber(value));
  useEffect(() => {
    const parsed = parseNumber(text);
    if ((parsed ?? null) !== (value ?? null)) setText(formatNumber(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const invalid = Number.isNaN(parseNumber(text));
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        const v = parseNumber(e.target.value);
        if (!Number.isNaN(v)) onChange(v);
      }}
      onBlur={() => !invalid && setText(formatNumber(parseNumber(text)))}
      className={`${className ?? ''} ${invalid ? 'ring-1 ring-red-500' : ''}`}
    />
  );
};

const newId = () => `med-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

interface Props {
  indicator: A3Indicator;
  onChange: (ind: A3Indicator | undefined) => void;
  guided: boolean;
}

export const IndicatorPanel: React.FC<Props> = ({ indicator, onChange, guided }) => {
  const set = <K extends keyof A3Indicator>(k: K, v: A3Indicator[K]) => onChange({ ...indicator, [k]: v });
  const setMeasurement = (id: string, patch: Partial<IndicatorMeasurement>) =>
    set(
      'measurements',
      indicator.measurements.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  const addMeasurement = () =>
    set('measurements', [...indicator.measurements, { id: newId(), date: localDate(), value: null }]);
  const removeMeasurement = (id: string) =>
    set(
      'measurements',
      indicator.measurements.filter((m) => m.id !== id)
    );

  const [confirmRemove, setConfirmRemove] = useState(false);
  const st = indicatorStatus(indicator);
  const unit = indicator.unit;

  const input =
    'w-full text-xs px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:ring-1 focus:ring-blue-500';
  const label = 'text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase';
  const cell =
    'w-full text-xs px-1.5 py-1 bg-transparent outline-none text-neutral-900 dark:text-neutral-100 rounded focus:ring-1 focus:ring-blue-500';

  return (
    <section
      aria-label="Seguimiento del indicador"
      className="flex flex-col gap-3 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <LineChart className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          {indicator.name ? indicator.name : 'Seguimiento del indicador'}
          {unit && <span className="font-normal text-neutral-500 dark:text-neutral-400">({unit})</span>}
        </h4>
        <button
          type="button"
          onClick={() => (indicator.measurements.length ? setConfirmRemove(true) : onChange(undefined))}
          className="no-print text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
        >
          Quitar seguimiento
        </button>
      </div>

      {/* Configuración */}
      <div className={`no-print grid gap-2 ${guided ? 'grid-cols-2 md:grid-cols-6' : 'grid-cols-2 sm:grid-cols-6'}`}>
        <label className="flex flex-col gap-0.5 col-span-2">
          <span className={label}>Indicador</span>
          <input
            type="text"
            aria-label="Nombre del indicador"
            value={indicator.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="ej: % rechazo por porosidad"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={label}>Unidad</span>
          <input
            type="text"
            aria-label="Unidad del indicador"
            value={indicator.unit ?? ''}
            onChange={(e) => set('unit', e.target.value)}
            placeholder="%, min, uds"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={label}>Mejor si</span>
          <select
            aria-label="Sentido de mejora"
            value={indicator.direction}
            onChange={(e) => set('direction', e.target.value as 'down' | 'up')}
            className={input}
          >
            <option value="down">baja ↓</option>
            <option value="up">sube ↑</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={label}>Línea base</span>
          <NumField
            ariaLabel="Línea base"
            value={indicator.baseline}
            onChange={(v) => set('baseline', v)}
            placeholder="ej: 4,8"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={label}>Meta</span>
          <NumField
            ariaLabel="Meta del indicador"
            value={indicator.target}
            onChange={(v) => set('target', v)}
            placeholder="ej: 0,3"
            className={input}
          />
        </label>
      </div>

      {/* Estado frente a la meta: icono + texto, nunca solo color */}
      {st.count > 0 && (
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-800 dark:text-neutral-200"
          data-indicator-status
        >
          {st.met === true && (
            <span className="flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Meta alcanzada
              {st.streak > 1 ? ` · ${st.streak} mediciones seguidas` : ' en la última medición'}
            </span>
          )}
          {st.met === false && (
            <span className="flex items-center gap-1 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Aún no se alcanza la meta · faltan {withUnit(st.gap, unit)}
            </span>
          )}
          {st.met === undefined && (
            <span className="text-neutral-500 dark:text-neutral-400">Define la meta para ver si se cumple.</span>
          )}
          {st.improvementPct != null && (
            <span>
              {st.improvementPct >= 0 ? 'Mejora' : 'Empeora'} frente a la base:{' '}
              <strong>{formatNumber(Math.abs(st.improvementPct))}%</strong>
            </span>
          )}
        </div>
      )}

      <IndicatorChart indicator={indicator} />

      {/* Mediciones (también es la vista en tabla del gráfico) */}
      <div className="no-print">
        <table className="w-full text-xs border-collapse" aria-label="Mediciones del indicador">
          <thead>
            <tr className="text-left text-[10px] uppercase text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
              <th className="py-1 px-1.5 font-bold w-[130px]">Fecha</th>
              <th className="py-1 px-1.5 font-bold w-[90px]">Valor{unit ? ` (${unit})` : ''}</th>
              <th className="py-1 px-1.5 font-bold">Comentario</th>
              <th className="w-8">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {indicator.measurements.map((mm, i) => (
              <tr key={mm.id} className="border-b border-neutral-100 dark:border-neutral-800">
                <td className="py-0.5">
                  <input
                    type="date"
                    aria-label={`Fecha de la medición ${i + 1}`}
                    value={mm.date}
                    onChange={(e) => setMeasurement(mm.id, { date: e.target.value })}
                    className={`${cell} dark:[color-scheme:dark]`}
                  />
                </td>
                <td className="py-0.5">
                  <NumField
                    ariaLabel={`Valor de la medición ${i + 1}`}
                    value={mm.value}
                    onChange={(v) => setMeasurement(mm.id, { value: v ?? null })}
                    placeholder="—"
                    className={`${cell} font-semibold`}
                  />
                </td>
                <td className="py-0.5">
                  <input
                    type="text"
                    aria-label={`Comentario de la medición ${i + 1}`}
                    value={mm.note ?? ''}
                    onChange={(e) => setMeasurement(mm.id, { note: e.target.value })}
                    placeholder="opcional: turno, lote, cambio aplicado..."
                    spellCheck
                    lang="es"
                    className={cell}
                  />
                </td>
                <td className="text-center">
                  <button
                    type="button"
                    onClick={() => removeMeasurement(mm.id)}
                    aria-label={`Borrar la medición ${i + 1}`}
                    className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addMeasurement}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Añadir medición
        </button>
      </div>
      <ConfirmModal
        isOpen={confirmRemove}
        title="¿Quitar el seguimiento del indicador?"
        message={`Se borrarán sus ${indicator.measurements.length} mediciones registradas. Puede que el historial del A3 no tenga las más recientes.`}
        confirmText="Quitar y borrar mediciones"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          onChange(undefined);
        }}
      />
    </section>
  );
};
