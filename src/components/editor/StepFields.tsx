import React, { useEffect, useState } from 'react';
import { HelpCircle, LayoutGrid, LineChart, Table, Target } from 'lucide-react';
import { A3Project } from '../../types/lean';
import { AutoTextarea } from '../AutoTextarea';
import { W5H1Tool } from '../W5H1Tool';
import { ZoomPanCanvas } from '../ZoomPanCanvas';

import { CauseTree } from '../CauseTree';
import { IshikawaDiagram } from '../IshikawaDiagram';
import { ActionItemsTable } from '../ActionItemsTable';
import { PrioritizationMatrix } from '../PrioritizationMatrix';
import { IndicatorPanel } from '../IndicatorPanel';
import { emptyIndicator, firstNumber, metricSummary } from '../../utils/indicator';
import { Segmented } from '../ui/Segmented';
import { localDate } from '../../utils/dates';

/** Altura del lienzo del diagrama en la lámina (se ajusta al diagrama entre estos límites) */
const SHEET_CANVAS_HEIGHT = { min: 320, max: 900 };

export type StepVariant = 'sheet' | 'guided';

export interface StepFieldsProps {
  step: number;
  /** 'sheet': dentro de la lámina (campos sin borde); 'guided': modo asistente (campos con borde) */
  variant: StepVariant;
  data: A3Project;
  onChange: <K extends keyof A3Project>(field: K, value: A3Project[K]) => void;
  rootCauses: { id: string; text: string }[];
  show5W1H: boolean;
  onToggle5W1H: () => void;
  onSynthesize5W1H: (text: string) => void;
  step5Tab: '5w2h' | 'matrix';
  onStep5Tab: (tab: '5w2h' | 'matrix') => void;
}

/**
 * Campos editables de cada paso del A3. Es el ÚNICO sitio donde se definen:
 * la lámina y el modo asistente usan este mismo componente.
 */
export const StepFields: React.FC<StepFieldsProps> = (props) => {
  const { step, variant, data, onChange, rootCauses } = props;
  const guided = variant === 'guided';

  const mainText =
    `w-full text-xs leading-relaxed outline-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 ` +
    (guided
      ? 'p-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:ring-1 focus:ring-blue-500'
      : 'p-1.5 bg-transparent');
  const subText =
    `w-full text-xs leading-relaxed outline-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 ` +
    (guided
      ? 'mt-1 p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900'
      : 'mt-1 p-1 bg-transparent');
  const subLabel = 'text-[11px] font-bold text-neutral-700 dark:text-neutral-300';

  switch (step) {
    case 1:
      return (
        <AutoTextarea
          minRows={guided ? 8 : 4}
          value={data.background}
          onChange={(e) => onChange('background', e.target.value)}
          aria-label="Contexto y antecedentes"
          placeholder="Explica el contexto histórico, la importancia estratégica, impacto en seguridad, calidad, coste o entrega (SQDC)..."
          className={mainText}
        />
      );

    case 2:
      return (
        <div className="flex flex-col gap-2">
          <div>
            <button
              type="button"
              onClick={props.onToggle5W1H}
              className="no-print inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors shadow-2xs"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{props.show5W1H ? 'Ocultar 5W1H' : 'Desplegar 5W1H'}</span>
            </button>
          </div>
          {props.show5W1H && (
            <W5H1Tool
              data={data.w5h1}
              onChange={(val) => onChange('w5h1', val)}
              onSynthesize={props.onSynthesize5W1H}
            />
          )}
          <AutoTextarea
            minRows={guided ? 6 : 5}
            value={data.currentCondition}
            onChange={(e) => onChange('currentCondition', e.target.value)}
            aria-label="Situación actual"
            placeholder="Describe la situación actual con datos numéricos: estratificación de defectos, dónde, cuándo y cuánto..."
            className={mainText}
          />
        </div>
      );

    case 3:
      return (
        <AutoTextarea
          minRows={guided ? 6 : 3}
          value={data.goals}
          onChange={(e) => onChange('goals', e.target.value)}
          aria-label="Objetivo"
          placeholder="Reducir [métrica] de [valor actual] a [valor meta] antes del [fecha límite]..."
          className={`${mainText} font-semibold`}
        />
      );

    case 4:
      return (
        <div className="flex flex-col gap-3 flex-1">
          <MethodSelector data={data} onChange={onChange} />

          <div className={guided ? 'h-[min(70vh,620px)] min-h-[420px]' : ''}>
            <ZoomPanCanvas
              minZoom={0.3}
              maxZoom={2}
              fitKey={data.rootCauseMode}
              // En la lámina la columna es estrecha: el lienzo toma la altura del diagrama
              fitHeight={guided ? undefined : SHEET_CANVAS_HEIGHT}
            >
              {data.rootCauseMode === 'tree' ? (
                <CauseTree
                  data={data.rootCauseTree}
                  onChange={(tree) => onChange('rootCauseTree', tree)}
                  rootCausesList={rootCauses}
                />
              ) : (
                <IshikawaDiagram
                  data={data.rootCauseIshikawa}
                  onChange={(ish) => onChange('rootCauseIshikawa', ish)}
                  rootCausesList={rootCauses}
                />
              )}
            </ZoomPanCanvas>
          </div>

          {/* Causas raíz marcadas en el diagrama */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/80 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="text-[11px] font-bold text-[#0f274a] dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-red-600" />
                <span>Causas raíz identificadas</span>
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                {rootCauses.length} marcada(s)
              </span>
            </div>
            {rootCauses.length === 0 ? (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic">
                Pasa el ratón sobre una causa del diagrama y pulsa la diana (🎯) para marcarla como causa raíz.
                Aparecerá aquí numerada y pasará al plan de acción del paso 5.
              </p>
            ) : (
              <ol className="flex flex-col gap-1.5 pt-1">
                {rootCauses.map((rc, idx) => (
                  <li
                    key={rc.id}
                    className="flex items-start gap-1.5 bg-[#0f274a] text-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-xs"
                  >
                    <span className="w-4 h-4 mt-px bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{rc.text}</span>
                  </li>
                ))}
              </ol>
            )}
            <label className={`${subLabel} block mt-3`} htmlFor={`conclusiones-${variant}`}>
              Conclusión del análisis
            </label>
            <AutoTextarea
              id={`conclusiones-${variant}`}
              minRows={2}
              value={data.rootCauseConclusions || ''}
              onChange={(e) => onChange('rootCauseConclusions', e.target.value)}
              placeholder="Resume las causas raíz confirmadas que se abordarán en el paso 5..."
              className={subText}
            />
          </div>
        </div>
      );

    case 5:
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              options={[
                {
                  id: '5w2h',
                  label: (
                    <>
                      <Table className="w-3.5 h-3.5" /> Contramedidas
                    </>
                  ),
                },
                {
                  id: 'matrix',
                  label: (
                    <>
                      <LayoutGrid className="w-3.5 h-3.5 text-blue-600" /> Matriz de priorización
                    </>
                  ),
                },
              ]}
              value={props.step5Tab}
              onSelect={(id) => props.onStep5Tab(id as '5w2h' | 'matrix')}
              ariaLabel="Vista del plan de acción"
            />
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:inline">
              {props.step5Tab === '5w2h' ? 'Quién, qué y cuándo' : 'Impacto frente a esfuerzo'}
            </span>
          </div>

          {props.step5Tab === '5w2h' ? (
            <ActionItemsTable
              items={data.actionItems || []}
              onChange={(items) => onChange('actionItems', items)}
              rootCausesList={rootCauses}
              defaultOwner={data.owner}
            />
          ) : (
            <PrioritizationMatrix
              actionItems={data.actionItems || []}
              rootCauses={rootCauses}
              onChange={(items) => onChange('actionItems', items)}
            />
          )}

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
            <label className={subLabel} htmlFor={`notas-plan-${variant}`}>
              Notas del plan (opcional)
            </label>
            <AutoTextarea
              id={`notas-plan-${variant}`}
              minRows={2}
              value={data.countermeasures}
              onChange={(e) => onChange('countermeasures', e.target.value)}
              placeholder="Recursos, presupuesto o aclaraciones. Las acciones se registran en la tabla de arriba, no aquí."
              className={subText}
            />
          </div>
        </div>
      );

    case 6: {
      const ind = data.indicator;
      const derived = metricSummary(data);
      const metric = (
        field: 'beforeMetric' | 'targetMetric' | 'afterMetric',
        label: string,
        placeholder: string,
        color: string
      ) => {
        const key = field === 'beforeMetric' ? 'before' : field === 'targetMetric' ? 'target' : 'after';
        return (
          <label className="flex flex-col text-center gap-0.5">
            <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">{label}</span>
            {ind ? (
              <output
                aria-label={label}
                title="Calculado a partir del seguimiento del indicador"
                className={`text-base font-extrabold text-center ${color}`}
              >
                {derived[key] || '—'}
              </output>
            ) : (
              <input
                type="text"
                value={data[field] || ''}
                onChange={(e) => onChange(field, e.target.value)}
                placeholder={placeholder}
                className={`text-base font-extrabold bg-transparent text-center outline-none ${color}`}
              />
            )}
          </label>
        );
      };
      const startTracking = () => {
        const before = firstNumber(data.beforeMetric);
        const target = firstNumber(data.targetMetric);
        const after = firstNumber(data.afterMetric);
        const pct = /%/.test(`${data.beforeMetric}${data.targetMetric}${data.afterMetric}`);
        const direction: 'down' | 'up' =
          /[>≥]/.test(data.targetMetric || '') || (before != null && target != null && target > before) ? 'up' : 'down';
        onChange('indicator', {
          ...emptyIndicator(),
          unit: pct ? '%' : '',
          direction,
          baseline: before,
          target,
          measurements:
            after != null ? [{ id: `med-${Date.now().toString(36)}`, date: localDate(), value: after }] : [],
        });
      };
      return (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3 p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 divide-x divide-neutral-200 dark:divide-neutral-700">
            {metric('beforeMetric', 'Antes (línea base)', 'ej: 4.8%', 'text-red-600 dark:text-red-400')}
            {metric('targetMetric', 'Objetivo (meta)', 'ej: < 0.3%', 'text-blue-700 dark:text-blue-400')}
            {metric('afterMetric', 'Resultado actual', 'ej: 1.4%', 'text-emerald-700 dark:text-emerald-400')}
          </div>
          {ind ? (
            <IndicatorPanel indicator={ind} onChange={(v) => onChange('indicator', v)} guided={guided} />
          ) : (
            <button
              type="button"
              onClick={startTracking}
              className="no-print self-start inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              <LineChart className="w-3.5 h-3.5" /> Registrar mediciones con gráfico
            </button>
          )}
          <AutoTextarea
            minRows={guided ? 6 : 4}
            value={data.check}
            onChange={(e) => onChange('check', e.target.value)}
            aria-label="Verificación de resultados"
            placeholder="Describe el seguimiento con gráficos de control, confirmación en el Gemba y comparación cuantitativa con el objetivo..."
            className={mainText}
          />
        </div>
      );
    }

    case 7:
      return (
        <AutoTextarea
          minRows={guided ? 8 : 5}
          value={data.followUp}
          onChange={(e) => onChange('followUp', e.target.value)}
          aria-label="Estandarización y Yokoten"
          placeholder="Acciones para que el problema no reaparezca: actualización del trabajo estándar (SWCS), auditorías, despliegue Yokoten a otras líneas o plantas..."
          className={mainText}
        />
      );

    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// Paso 4: un A3 usa UN método de análisis. Cuando se empieza uno (hay algún
// porqué o alguna causa), el otro queda deshabilitado.
// ---------------------------------------------------------------------------
type Method = A3Project['rootCauseMode'];

export const treeStarted = (p: A3Project) => (p.rootCauseTree?.children?.length ?? 0) > 0;
export const ishikawaStarted = (p: A3Project) =>
  (p.rootCauseIshikawa?.categories || []).some((c) => c.causes.length > 0);

const METHOD_NAME: Record<Method, string> = { tree: 'el árbol de 5 Por Qués', ishikawa: 'el Ishikawa' };

interface MethodSelectorProps {
  data: A3Project;
  onChange: StepFieldsProps['onChange'];
}

const MethodSelector: React.FC<MethodSelectorProps> = ({ data, onChange }) => {
  const [confirmClear, setConfirmClear] = useState<Method | null>(null);
  const tree = treeStarted(data);
  const ish = ishikawaStarted(data);
  const locked: Method | null = tree && !ish ? 'tree' : ish && !tree ? 'ishikawa' : null;
  const other: Method = data.rootCauseMode === 'tree' ? 'ishikawa' : 'tree';

  // Si solo hay contenido en un método, mostrar siempre ese
  useEffect(() => {
    if (locked && data.rootCauseMode !== locked) onChange('rootCauseMode', locked);
  }, [locked, data.rootCauseMode, onChange]);

  const clear = (m: Method) => {
    if (m === 'tree') {
      onChange('rootCauseTree', { ...data.rootCauseTree, children: [] });
    } else {
      onChange('rootCauseIshikawa', {
        ...data.rootCauseIshikawa,
        categories: data.rootCauseIshikawa.categories.map((c) => ({ ...c, causes: [] })),
      });
    }
    onChange('rootCauseMode', m === 'tree' ? 'ishikawa' : 'tree');
    setConfirmClear(null);
  };

  const disabledTitle = (m: Method) =>
    locked && locked !== m
      ? `El análisis ya se ha empezado con ${METHOD_NAME[locked]}. Un A3 usa un solo método.`
      : undefined;

  const linkBtn = 'font-semibold underline underline-offset-2 hover:no-underline';

  return (
    <div className="no-print flex flex-col gap-1.5">
      <Segmented
        options={[
          { id: 'tree', label: 'Árbol 5 Por Qués', disabled: locked === 'ishikawa', title: disabledTitle('tree') },
          {
            id: 'ishikawa',
            label: 'Espina Ishikawa (6M)',
            disabled: locked === 'tree',
            title: disabledTitle('ishikawa'),
          },
        ]}
        value={locked ?? data.rootCauseMode}
        onSelect={(id) => onChange('rootCauseMode', id as Method)}
        ariaLabel="Método de análisis"
      />

      {locked && confirmClear === null && (
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
          Análisis con {METHOD_NAME[locked]}: el otro método queda deshabilitado.{' '}
          <button
            type="button"
            onClick={() => setConfirmClear(locked)}
            className={`${linkBtn} text-neutral-700 dark:text-neutral-300`}
          >
            Vaciar y cambiar de método
          </button>
        </p>
      )}

      {!locked && tree && ish && confirmClear === null && (
        <p
          role="status"
          className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md px-2.5 py-1.5"
        >
          Este A3 tiene contenido en los dos métodos y un A3 debe usar uno solo. Se muestra{' '}
          {METHOD_NAME[data.rootCauseMode]}.{' '}
          <button type="button" onClick={() => setConfirmClear(other)} className={linkBtn}>
            Vaciar {METHOD_NAME[other]}
          </button>
        </p>
      )}

      {confirmClear && (
        <p
          role="alert"
          className="text-[11px] font-medium text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-2.5 py-1.5 flex flex-wrap items-center gap-2"
        >
          <span>Se borrará todo el contenido de {METHOD_NAME[confirmClear]}. ¿Continuar?</span>
          <button
            type="button"
            onClick={() => clear(confirmClear)}
            className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            Sí, vaciar
          </button>
          <button type="button" onClick={() => setConfirmClear(null)} className={linkBtn}>
            Cancelar
          </button>
        </p>
      )}
    </div>
  );
};
