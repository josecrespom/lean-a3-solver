import React from 'react';
import { Building, Calendar, User } from 'lucide-react';
import { A3Project } from '../../types/lean';
import { AutoTextarea } from '../AutoTextarea';

interface A3HeaderProps {
  data: A3Project;
  onChange: <K extends keyof A3Project>(field: K, value: A3Project[K]) => void;
  /** Texto de contexto sobre el título (p. ej. el modo actual) */
  kicker?: React.ReactNode;
}

const chip =
  'flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 shadow-2xs';
const chipLabel = 'font-bold text-neutral-700 dark:text-neutral-300';
const chipInput =
  'bg-transparent outline-none border-b border-transparent focus:border-neutral-400 dark:focus:border-neutral-500 font-semibold text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500';

/** Título y datos generales del A3 (líder, área, fecha, estado). Común a lámina y asistente. */
export const A3Header: React.FC<A3HeaderProps> = ({ data, onChange, kicker }) => (
  <div className="border-b-4 border-neutral-900 dark:border-neutral-700 pb-4 flex flex-col gap-3.5">
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1.5">
        <span className="bg-red-600 text-white px-1.5 py-0.5 rounded font-black" title="Lean A3">
          A3
        </span>
        {kicker ?? (
          <>
            <span>Hoja de Resolución de Problemas A3</span>
            <span>·</span>
            <span>Estructura estándar A3</span>
          </>
        )}
      </div>
      <AutoTextarea
        singleLine
        value={data.title}
        onChange={(e) => onChange('title', e.target.value)}
        onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
          if (data.title === 'Nuevo Problema A3') e.target.select();
        }}
        aria-label="Título del A3"
        spellCheck
        lang="es"
        placeholder="Título / tema del problema..."
        className="w-full text-xl md:text-2xl lg:text-3xl font-black text-neutral-900 dark:text-white border-b border-dashed border-neutral-300 dark:border-neutral-700 focus:border-neutral-900 dark:focus:border-neutral-300 outline-none pb-1.5 bg-transparent tracking-tight leading-snug resize-none"
      />
    </div>

    <div className="flex flex-wrap items-center gap-3 text-xs font-medium pt-0.5">
      <label className={chip}>
        <User className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
        <span className={chipLabel}>Líder:</span>
        <input
          type="text"
          value={data.owner}
          onChange={(e) => onChange('owner', e.target.value)}
          placeholder="Nombre del líder"
          className={`[field-sizing:content] min-w-[12ch] max-w-[48ch] ${chipInput}`}
        />
      </label>
      <label className={chip}>
        <Building className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
        <span className={chipLabel}>Área:</span>
        <input
          type="text"
          value={data.department}
          onChange={(e) => onChange('department', e.target.value)}
          placeholder="Planta / línea"
          className={`[field-sizing:content] min-w-[12ch] max-w-[48ch] ${chipInput}`}
        />
      </label>
      <label className={chip}>
        <Calendar className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
        <span className={chipLabel}>Fecha:</span>
        <input
          type="date"
          value={data.date}
          onChange={(e) => onChange('date', e.target.value)}
          className="bg-transparent outline-none text-neutral-900 dark:text-neutral-100 font-semibold cursor-pointer"
        />
      </label>
      <label className={chip}>
        <span className={chipLabel}>Estado:</span>
        <select
          value={data.status}
          onChange={(e) => onChange('status', e.target.value as A3Project['status'])}
          className="bg-transparent outline-none font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer text-xs dark:bg-neutral-800"
        >
          <option value="abierto">Abierto</option>
          <option value="en_progreso">En Progreso</option>
          <option value="estandarizado">Estandarizado</option>
        </select>
      </label>
    </div>
  </div>
);
