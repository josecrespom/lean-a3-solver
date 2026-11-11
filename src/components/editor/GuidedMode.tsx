import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, MessageSquare, Table } from 'lucide-react';
import { A3Project } from '../../types/lean';
import { calculateA3Completeness } from '../../utils/completeness';
import { openComments, toggleResolved } from '../../utils/review';
import { Glossed } from '../ui/Glossed';
import { buttonClass } from '../ui/Button';
import { CommentList } from '../ReviewPanel';
import { SenseiGuide } from '../SenseiGuide';
import { QualityChecklist } from '../QualityChecklist';
import { A3Header } from './A3Header';
import { StepFields } from './StepFields';
import { STEPS } from './steps';

const GUIDED_STEPS = STEPS.map((st) => ({ step: st.step, label: st.label, subtitle: st.heading }));

type FieldProps = Omit<React.ComponentProps<typeof StepFields>, 'step' | 'variant'>;

interface Props {
  data: A3Project;
  step: number;
  onStep: (step: number) => void;
  /** Volver a la lámina completa */
  onExit: () => void;
  fieldProps: FieldProps;
  onToggleQualityCheck: (criterionId: string) => void;
  userName?: string;
}

/** Modo asistente: un paso cada vez, con su guía, criterios y comentarios al lado */
export const GuidedMode: React.FC<Props> = ({
  data,
  step,
  onStep,
  onExit,
  fieldProps,
  onToggleQualityCheck,
  userName,
}) => {
  const completeness = calculateA3Completeness(data);
  const currentStepInfo = GUIDED_STEPS.find((s) => s.step === step) || GUIDED_STEPS[0];
  return (
    <div className="bg-white dark:bg-neutral-900 border-2 border-neutral-800 dark:border-neutral-700 shadow-xl rounded-xl p-5 md:p-8 flex flex-col gap-6 text-neutral-900 dark:text-neutral-100 transition-colors">
      <A3Header data={data} onChange={fieldProps.onChange} />

      {/* Top Banner with Step Progress Stepper */}
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">
              <span className="bg-red-600 text-white px-2 py-0.5 rounded font-black">A3</span>
              <span>Modo Asistente Guiado Paso a Paso</span>
              <span>·</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">Paso {step} de 7</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              <Glossed text={currentStepInfo.subtitle} />
            </h2>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button type="button" onClick={() => onExit()} className={buttonClass('secondary', 'sm')}>
              <Table className="w-3.5 h-3.5 text-neutral-500" />
              <span>Ver Lámina A3 Completa</span>
            </button>
          </div>
        </div>

        {/* 7-Step Stepper Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
          {GUIDED_STEPS.map((s) => {
            const isActive = step === s.step;
            const stepCompleted = completeness.steps[s.step]?.completed;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => onStep(s.step)}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-neutral-50 dark:bg-neutral-850/60 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : stepCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {stepCompleted ? '✓' : s.step}
                  </span>
                  {stepCompleted && !isActive && (
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Listo</span>
                  )}
                </div>
                <div className="text-[11px] font-bold truncate text-neutral-900 dark:text-neutral-100">{s.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Guided Content Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Form for Current Step (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-neutral-50 dark:bg-neutral-850 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <StepFields step={step} variant="guided" {...fieldProps} />
          </div>
        </div>

        {/* Right Column: Sensei Guide & Quality Checklist for Current Step (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-36">
          {openComments(data, step).length > 0 && (
            <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Comentarios de revisión de este paso
              </div>
              <CommentList
                comments={openComments(data, step)}
                showStep={false}
                onToggle={(id) => fieldProps.onChange('comments', toggleResolved(data, id, userName || undefined))}
              />
            </div>
          )}
          <SenseiGuide stepNumber={step} />
          <QualityChecklist stepNumber={step} qualityChecks={data.qualityChecks} onToggleCheck={onToggleQualityCheck} />
        </div>
      </div>

      {/* Stepper Footer Navigation */}
      <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className={buttonClass('secondary', 'md')}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Anterior</span>
        </button>

        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          Paso {step} de 7 · {currentStepInfo.label}
        </span>

        {step < 7 ? (
          <button type="button" onClick={() => onStep(Math.min(7, step + 1))} className={buttonClass('primary', 'md')}>
            <span className="sm:hidden">Siguiente</span>
            <span className="hidden sm:inline">Siguiente: {GUIDED_STEPS[step].label}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button type="button" onClick={() => onExit()} className={buttonClass('primary', 'md')}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="sm:hidden">Ver la lámina</span>
            <span className="hidden sm:inline">Finalizar y Ver Lámina A3 Completa</span>
          </button>
        )}
      </div>
    </div>
  );
};
