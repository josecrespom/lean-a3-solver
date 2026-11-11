import React from 'react';
import { Glossed } from './ui/Glossed';
import { CheckSquare, Square, ShieldCheck } from 'lucide-react';

import { QUALITY_CRITERIA_BY_STEP } from '../data/qualityCriteria';

export { QUALITY_CRITERIA_BY_STEP };

interface QualityChecklistProps {
  stepNumber: number;
  qualityChecks?: Record<string, boolean>;
  onToggleCheck: (criterionId: string) => void;
  compact?: boolean;
}

export const QualityChecklist: React.FC<QualityChecklistProps> = ({
  stepNumber,
  qualityChecks = {},
  onToggleCheck,
  compact = false,
}) => {
  const stepData = QUALITY_CRITERIA_BY_STEP[stepNumber];
  if (!stepData) return null;

  const total = stepData.criteria.length;
  const completed = stepData.criteria.filter((c) => qualityChecks[c.id]).length;
  const allPassed = completed === total;

  return (
    <div
      className={`rounded-lg border transition-all ${
        allPassed
          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
          : 'bg-neutral-50/80 dark:bg-neutral-850/60 border-neutral-200 dark:border-neutral-700/80'
      } ${compact ? 'p-2.5' : 'p-3.5'}`}
    >
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-neutral-200/80 dark:border-neutral-700/60">
        <div className="flex items-center gap-1.5">
          <ShieldCheck
            className={`w-4 h-4 ${
              allPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500 dark:text-neutral-400'
            }`}
          />
          <span className="text-[11px] font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
            Checklist de Rigor Lean
          </span>
        </div>
        <span
          className={`text-[10px] tabular-nums font-bold px-2 py-0.5 rounded-full ${
            allPassed
              ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
          }`}
        >
          {completed}/{total} {allPassed ? '✓ Validado' : 'Pendiente'}
        </span>
      </div>

      <div className="space-y-1.5">
        {stepData.criteria.map((item) => {
          const isChecked = Boolean(qualityChecks[item.id]);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggleCheck(item.id)}
              className="w-full flex items-start gap-2 text-left p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors group"
            >
              <div className="mt-0.5 shrink-0 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
                {isChecked ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[11px] leading-tight font-medium ${
                    isChecked
                      ? 'text-neutral-500 dark:text-neutral-400 line-through'
                      : 'text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <Glossed text={item.label} />
                </p>
                {item.hint && (
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5">{item.hint}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
