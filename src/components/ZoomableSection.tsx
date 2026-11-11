import React, { useState } from 'react';
import { useDialog } from './ui/useDialog';
import { Maximize2, Minimize2 } from 'lucide-react';

interface ZoomableSectionProps {
  stepNumber: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  extraHeaderActions?: React.ReactNode;
}

export const ZoomableSection: React.FC<ZoomableSectionProps> = ({
  stepNumber,
  title,
  subtitle,
  children,
  className = '',
  extraHeaderActions,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Pantalla completa: misma gestión de teclado que el resto de ventanas
  // (Escape contrae, Tab no se escapa y el foco vuelve al botón de expandir)
  const panelRef = useDialog<HTMLDivElement>(isExpanded, () => setIsExpanded(false));

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Paso ${stepNumber}: ${title}`}
          tabIndex={-1}
          className="outline-none bg-white dark:bg-neutral-900 w-full h-full max-w-7xl rounded-xl shadow-2xl border border-neutral-300 dark:border-neutral-700 flex flex-col overflow-hidden"
        >
          {/* Expanded Modal Header */}
          <div className="bg-neutral-900 dark:bg-neutral-950 text-white px-6 py-3.5 flex items-center justify-between shrink-0 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded tracking-wider">
                PASO {stepNumber}
              </span>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-tight">{title}</h3>
                {subtitle && <p className="text-xs text-neutral-400 dark:text-neutral-400">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {extraHeaderActions}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white rounded-md border border-neutral-700 transition-colors"
                title="Contraer vista a tamaño normal (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Contraer (Esc)</span>
              </button>
            </div>
          </div>

          {/* Expanded Body Content */}
          <div className="flex-1 p-6 overflow-auto custom-scrollbar flex flex-col bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-900 dark:text-neutral-100">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-neutral-900 rounded-lg border border-neutral-300 dark:border-neutral-700/80 shadow-2xs flex flex-col overflow-hidden transition-all hover:shadow-xs ${className}`}
    >
      {/* Normal Header Bar */}
      <div className="@container bg-neutral-800 dark:bg-neutral-950 text-white px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 select-none border-b border-neutral-800">
        <div className="flex items-center gap-2 min-w-0" title={title}>
          <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded tracking-wider shrink-0">
            {stepNumber}
          </span>
          <span className="text-xs font-bold uppercase tracking-tight truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {extraHeaderActions}
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="no-print p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
            title="Expandir paso a pantalla completa (Modo Foco)"
            aria-label={`Expandir el paso ${stepNumber} a pantalla completa`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Section Content */}
      <div className="p-2.5 flex-1 flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100">
        {children}
      </div>
    </div>
  );
};
