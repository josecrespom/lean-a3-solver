import { AutoTextarea } from './AutoTextarea';
import React, { useId } from 'react';
import { W5H1 } from '../types/lean';
import { Sparkles } from 'lucide-react';

interface W5H1ToolProps {
  data: W5H1;
  onChange: (newData: W5H1) => void;
  onSynthesize?: (synthesizedText: string) => void;
}

export const W5H1Tool: React.FC<W5H1ToolProps> = ({ data, onChange, onSynthesize }) => {
  const uid = useId();
  const handleChange = (field: keyof W5H1, val: string) => {
    onChange({
      ...data,
      [field]: val,
    });
  };

  const handleApplySynthesis = () => {
    if (!onSynthesize) return;
    const parts = [
      data.what ? `QUÉ: ${data.what}` : '',
      data.where ? `DÓNDE: ${data.where}` : '',
      data.when ? `CUÁNDO: ${data.when}` : '',
      data.who ? `QUIÉN: ${data.who}` : '',
      data.why ? `IMPACTO: ${data.why}` : '',
      data.how ? `MAGNITUD: ${data.how}` : '',
    ].filter(Boolean);

    const fullSynthesis = parts.join('\n');
    onSynthesize(fullSynthesis);
  };

  return (
    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-3 mb-2 text-xs">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-emerald-200 dark:border-emerald-800/60">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider text-[11px]">
            Herramienta 5W + 1H (Estructuración Lean)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {onSynthesize && (
            <button
              type="button"
              onClick={handleApplySynthesis}
              className="no-print flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-white bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 px-2 py-0.5 rounded transition-colors"
              title="Copiar datos estructurados a la descripción"
            >
              <Sparkles className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
              <span>Sintetizar al texto</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label
            htmlFor={`${uid}-what`}
            className="block text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase"
          >
            1. ¿Qué? · problema u objeto
          </label>
          <AutoTextarea
            id={`${uid}-what`}
            singleLine
            spellCheck
            lang="es"
            value={data.what}
            onChange={(e) => handleChange('what', e.target.value)}
            placeholder="Defecto específico o fallo observado..."
            className="w-full mt-0.5 p-1.5 text-xs bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-emerald-200 dark:border-emerald-800/70 rounded focus:border-emerald-500 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none"
          />
        </div>

        <div>
          <label
            htmlFor={`${uid}-where`}
            className="block text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase"
          >
            2. ¿Dónde? · lugar donde ocurre
          </label>
          <AutoTextarea
            id={`${uid}-where`}
            singleLine
            spellCheck
            lang="es"
            value={data.where}
            onChange={(e) => handleChange('where', e.target.value)}
            placeholder="Línea, máquina, estación, proceso..."
            className="w-full mt-0.5 p-1.5 text-xs bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-emerald-200 dark:border-emerald-800/70 rounded focus:border-emerald-500 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none"
          />
        </div>

        <div>
          <label
            htmlFor={`${uid}-when`}
            className="block text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase"
          >
            3. ¿Cuándo? · desde cuándo y en qué momento
          </label>
          <AutoTextarea
            id={`${uid}-when`}
            singleLine
            spellCheck
            lang="es"
            value={data.when}
            onChange={(e) => handleChange('when', e.target.value)}
            placeholder="Momento del día, turno, frecuencia..."
            className="w-full mt-0.5 p-1.5 text-xs bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-emerald-200 dark:border-emerald-800/70 rounded focus:border-emerald-500 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none"
          />
        </div>

        <div>
          <label
            htmlFor={`${uid}-who`}
            className="block text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase"
          >
            4. ¿Quién? · lo detecta o le afecta
          </label>
          <AutoTextarea
            id={`${uid}-who`}
            singleLine
            spellCheck
            lang="es"
            value={data.who}
            onChange={(e) => handleChange('who', e.target.value)}
            placeholder="Operador, inspector, cliente, sistema de visión..."
            className="w-full mt-0.5 p-1.5 text-xs bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-emerald-200 dark:border-emerald-800/70 rounded focus:border-emerald-500 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none"
          />
        </div>

        <div>
          <label
            htmlFor={`${uid}-why`}
            className="block text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase"
          >
            5. ¿Por qué importa? · impacto
          </label>
          <AutoTextarea
            id={`${uid}-why`}
            singleLine
            spellCheck
            lang="es"
            value={data.why}
            onChange={(e) => handleChange('why', e.target.value)}
            placeholder="Impacto en seguridad, calidad, coste, entrega..."
            className="w-full mt-0.5 p-1.5 text-xs bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-emerald-200 dark:border-emerald-800/70 rounded focus:border-emerald-500 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none"
          />
        </div>

        <div>
          <label
            htmlFor={`${uid}-how`}
            className="block text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase"
          >
            6. ¿Cómo y cuánto? · magnitud
          </label>
          <AutoTextarea
            id={`${uid}-how`}
            singleLine
            spellCheck
            lang="es"
            value={data.how}
            onChange={(e) => handleChange('how', e.target.value)}
            placeholder="Tasa de defectos %, PPM, coste económico..."
            className="w-full mt-0.5 p-1.5 text-xs bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-emerald-200 dark:border-emerald-800/70 rounded focus:border-emerald-500 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
};
