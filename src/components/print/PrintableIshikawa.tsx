import React from 'react';
import type { IshikawaCategory, IshikawaData } from '../../types/lean';
import { IshikawaLayout } from '../ishikawa/IshikawaLayout';

type RootRefs = { id: string; text: string }[];

const navy = 'bg-[#0f274a] text-white border-blue-900 font-bold';

/** Causas (1.º nivel) y subcausas (2.º nivel) de una espina, en tamaño de impresión */
const PrintCauses: React.FC<{ category: IshikawaCategory; rootCauses: RootRefs }> = ({ category, rootCauses }) => (
  <div className="flex flex-col gap-1 w-full">
    {category.causes.map((c) => {
      const rootIdx = rootCauses.findIndex((r) => r.id === c.id);
      return (
        <div key={c.id} className="flex flex-col gap-0.5 w-full">
          <div
            className={`relative border text-[9px] px-1 py-0.5 rounded truncate ${
              c.isRootCause ? navy : 'bg-white text-neutral-800 border-neutral-300'
            }`}
          >
            {c.isRootCause && (
              <span className="inline-block bg-red-600 text-white rounded-full w-3 h-3 text-[8px] text-center font-bold mr-1">
                {rootIdx + 1}
              </span>
            )}
            <span>{c.text}</span>
          </div>
          {c.subcauses && c.subcauses.length > 0 && (
            <div className="ml-1.5 pl-1 border-l border-neutral-400 space-y-0.5">
              {c.subcauses.map((sub) => {
                const subRootIdx = rootCauses.findIndex((r) => r.id === sub.id);
                return (
                  <div
                    key={sub.id}
                    className={`relative border text-[8px] px-1 rounded truncate flex items-center gap-0.5 ${
                      sub.isRootCause ? navy : 'bg-neutral-50 text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {sub.isRootCause && (
                      <span className="inline-block bg-red-600 text-white rounded-full w-2.5 h-2.5 text-[7px] text-center font-bold shrink-0">
                        {subRootIdx + 1}
                      </span>
                    )}
                    <span className="truncate">↳ {sub.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

const CategoryName: React.FC<{ name: string }> = ({ name }) => (
  <div className="bg-neutral-200 border border-neutral-400 text-neutral-900 text-[9px] font-extrabold px-1.5 py-0.5 rounded text-center truncate w-full">
    {name}
  </div>
);

/**
 * Ishikawa de la lámina impresa (solo lectura). Usa la misma geometría que el
 * editor (IshikawaLayout), así que lo que está centrado en pantalla lo está en papel.
 */
export const PrintableIshikawa: React.FC<{ ishikawa: IshikawaData; rootCauses: RootRefs }> = ({
  ishikawa,
  rootCauses,
}) => (
  <div className="flex items-center justify-center select-none py-2" data-print-ishikawa>
    <IshikawaLayout
      variant="print"
      categories={ishikawa.categories || []}
      renderColumn={(cat, position) => (
        <div className={`flex flex-col items-center w-28 ${position === 'top' ? 'justify-end' : 'justify-start'}`}>
          {position === 'top' && <CategoryName name={cat.name} />}
          {position === 'top' && <div className="w-0.5 bg-neutral-400 h-8 my-0.5" />}
          <PrintCauses category={cat} rootCauses={rootCauses} />
          {position === 'bottom' && <div className="w-0.5 bg-neutral-400 h-8 my-0.5" />}
          {position === 'bottom' && <CategoryName name={cat.name} />}
        </div>
      )}
      head={
        <div className="w-36 p-2 bg-neutral-900 text-white rounded-lg border border-neutral-700 text-center">
          <div className="text-[8px] font-bold text-red-400 uppercase tracking-wider mb-0.5">PROBLEMA</div>
          <div className="text-[10px] font-extrabold leading-tight line-clamp-3">
            {ishikawa.problemHead || 'Efecto / Problema'}
          </div>
        </div>
      }
    />
  </div>
);
