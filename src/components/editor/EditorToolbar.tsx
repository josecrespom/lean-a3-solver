import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  History,
  Printer,
  Table,
} from 'lucide-react';
import { A3Project } from '../../types/lean';
import { a3Progress, calculateA3Completeness, calculateA3Validation } from '../../utils/completeness';
import { ProgressPhase } from '../dashboard/ProjectCard';
import { describeStamp } from '../../utils/dates';

interface Props {
  data: A3Project;
  project: A3Project;
  saveStatus: 'saved' | 'saving' | 'dirty';
  lastSavedTime: string;
  editorMode: 'sheet' | 'guided';
  onModeChange: (m: 'sheet' | 'guided') => void;
  showBreakdown: boolean;
  onToggleBreakdown: () => void;
  onPrint: () => void;
  onShowHistory?: () => void;
  onBack: () => void;
  /** Resumen de la revisión (dentro de la barra) */
  review?: React.ReactNode;
}

const bar = (pct: number, color: string, label: string, value: string) => (
  <span className="flex items-center gap-1.5">
    <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
    <span className="font-extrabold text-neutral-900 dark:text-white tabular-nums">{value}</span>
    <span
      className="hidden md:block w-12 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden"
      aria-hidden
    >
      <span className={`block h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </span>
  </span>
);

const toolBtn =
  'px-2 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1.5';

/** Barra única y fija del editor: guardado, modo, progreso (con su desglose) y acciones */
export const EditorToolbar: React.FC<Props> = ({
  data,
  project,
  saveStatus,
  lastSavedTime,
  editorMode,
  onModeChange,
  showBreakdown,
  onToggleBreakdown,
  onPrint,
  onShowHistory,
  onBack,
  review,
}) => {
  const completeness = calculateA3Completeness(data);
  const validation = calculateA3Validation(data);
  const progress = a3Progress(data);
  const pendingCriteria = progress.phase === 'review';
  return (
    <>
      <div
        data-editor-toolbar
        className="no-print mb-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2 shadow-xs flex flex-wrap items-center gap-x-4 gap-y-2 md:sticky md:top-14 z-30 transition-colors"
      >
        {/* Guardado */}
        <div
          data-save-status={saveStatus}
          role="status"
          className="flex items-center gap-1.5 text-xs"
          title={
            project.updatedBy
              ? `Último cambio: ${project.updatedBy}${project.updatedAt ? `, ${describeStamp(project.updatedAt)}` : ''}`
              : undefined
          }
        >
          {saveStatus === 'saving' ? (
            <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-300 font-medium">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando…</span>
            </span>
          ) : saveStatus === 'dirty' ? (
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>Guardando…</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Guardado {lastSavedTime.slice(0, 5)}</span>
            </span>
          )}
        </div>

        {/* Lámina / Asistente */}
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs">
          {(
            [
              ['sheet', 'Lámina', Table, 'Ver la lámina DIN A3 completa con todas las secciones'],
              ['guided', 'Asistente', Compass, 'Paso a paso, con la Guía Sensei y los criterios de calidad'],
            ] as const
          ).map(([mode, label, Icon, title]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onModeChange(mode)}
              aria-pressed={editorMode === mode}
              aria-label={`Modo ${label}`}
              title={title}
              className={`px-2.5 py-1 font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                editorMode === mode
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Progreso: abre el desglose */}
        <button
          type="button"
          onClick={() => onToggleBreakdown()}
          aria-expanded={showBreakdown}
          title={
            pendingCriteria
              ? 'Todo relleno, pero falta confirmar los criterios de calidad de cada paso (autoevaluación). Pulsa para ver el desglose.'
              : `Pasos rellenos; después, autoevaluación con los criterios de calidad (${validation.checkedCount}/${validation.totalCount}). Pulsa para ver qué falta.`
          }
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          {bar(
            Math.round((progress.done / progress.total) * 100),
            progress.phase === 'validated' ? 'bg-emerald-600' : 'bg-blue-600',
            'Pasos',
            `${progress.done}/${progress.total}`
          )}
          <ProgressPhase progress={progress} />
          {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {review}

        <div className="flex items-center gap-0.5 ml-auto">
          <button
            type="button"
            onClick={onPrint}
            className={toolBtn}
            title="Vista Previa e Imprimir (A3)"
            aria-label="Imprimir"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          {onShowHistory && (
            <button
              type="button"
              onClick={onShowHistory}
              className={toolBtn}
              title="Ver y restaurar versiones anteriores de este A3"
              aria-label="Historial"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Historial</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver al Almacén"
            title="Volver al Almacén"
            className={toolBtn}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Almacén</span>
          </button>
        </div>
      </div>

      {showBreakdown && (
        <div className="no-print mb-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 shadow-xs">
          {pendingCriteria && (
            <p className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Relleno, pero falta confirmar los criterios de calidad de cada paso ({validation.checkedCount}/
              {validation.totalCount}).
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {completeness.steps.map((step, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-md border flex items-start gap-2 ${
                  step.completed
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300'
                    : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                    step.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-300 dark:text-neutral-600'
                  }`}
                />
                <div>
                  <div className="font-bold">{step.name}</div>
                  <div className="text-[10px] opacity-80 leading-tight">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
