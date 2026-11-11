import React from 'react';
import { STEPS } from '../editor/steps';

/**
 * Cabecera de un paso en la lámina impresa. El título sale de la misma
 * definición de pasos que usa el editor, así no pueden divergir.
 */
export const PrintStepHeader: React.FC<{ step: number; hint?: string; extra?: string }> = ({ step, hint, extra }) => {
  const meta = STEPS.find((s) => s.step === step);
  return (
    <div className="bg-neutral-900 text-white px-2.5 py-1 flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wider">
        {step}. {meta?.title ?? ''}
        {extra ? ` (${extra})` : ''}
      </span>
      {hint && <span className="text-[9px] text-neutral-400 uppercase">{hint}</span>}
    </div>
  );
};
