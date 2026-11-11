import React, { useRef, useEffect } from 'react';
import { AutoTextarea } from '../AutoTextarea';
import { IshikawaCause } from '../../types/lean';
import { Target, Plus, Trash2, CornerDownRight } from 'lucide-react';

// =========================================================================
// CAUSE ITEM (CAUSA PRINCIPAL DE 1º NIVEL CON SUB-CAUSAS DE 2º NIVEL)
// =========================================================================

interface CauseItemProps {
  cause: IshikawaCause;
  catId: string;
  isRootCause: boolean;
  rootIndex: number;
  onUpdateText: (text: string) => void;
  onToggleRoot: () => void;
  onDelete: () => void;
  onAddSubcause: () => void;
  onUpdateSubcauseText: (subId: string, text: string) => void;
  onToggleSubcauseRoot: (subId: string) => void;
  onDeleteSubcause: (subId: string) => void;
  rootCausesList: { id: string; text: string }[];
  newlyAddedCauseId: string | null;
}

export const CauseItem: React.FC<CauseItemProps> = ({
  cause,
  isRootCause,
  rootIndex,
  onUpdateText,
  onToggleRoot,
  onDelete,
  onAddSubcause,
  onUpdateSubcauseText,
  onToggleSubcauseRoot,
  onDeleteSubcause,
  rootCausesList,
  newlyAddedCauseId,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const subcauses = cause.subcauses || [];

  useEffect(() => {
    if (newlyAddedCauseId === cause.id && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [newlyAddedCauseId, cause.id]);

  return (
    <div className="flex flex-col w-full">
      {/* 1st Level Cause Card */}
      <div
        className={`relative rounded-md px-2.5 py-1.5 border text-xs font-medium transition-all group shadow-2xs ${
          isRootCause
            ? 'root-cause-navy bg-[#0f274a] text-white border-blue-700 ring-2 ring-blue-600/50 shadow-sm'
            : 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 border-slate-300 dark:border-neutral-700 hover:border-slate-400 dark:hover:border-neutral-500'
        }`}
      >
        {/* Numbered Badge for Root Cause */}
        {isRootCause && (
          <div className="root-badge-counter" title={`Causa Raíz #${rootIndex + 1}`}>
            {rootIndex + 1}
          </div>
        )}

        {/* Small Level Indicator */}
        <div
          className={`flex items-center justify-between text-[9px] font-bold uppercase tracking-wider mb-0.5 ${
            isRootCause ? 'text-blue-200' : 'text-slate-500 dark:text-neutral-400'
          }`}
        >
          <span>Causa 1º Nivel</span>
          {isRootCause && <span className="text-blue-200 font-extrabold">Causa Raíz</span>}
        </div>

        <AutoTextarea
          ref={inputRef}
          singleLine
          value={cause.text}
          onChange={(e) => onUpdateText(e.target.value)}
          placeholder="Escribir causa principal..."
          className={`w-full bg-transparent outline-none text-xs font-semibold leading-snug ${
            isRootCause
              ? 'text-white placeholder-blue-200'
              : 'text-slate-900 dark:text-neutral-50 placeholder-slate-400 dark:placeholder-neutral-500'
          }`}
        />

        {/* Floating Action Buttons on Hover */}
        <div className="no-print absolute -top-3 right-1 hidden group-hover:flex items-center gap-1 bg-white dark:bg-neutral-800 px-1.5 py-0.5 rounded-full border border-neutral-300 dark:border-neutral-600 shadow-md z-30">
          <button
            type="button"
            onClick={onAddSubcause}
            title="Añadir Subcausa (2º nivel sobre esta causa)"
            className="p-1 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-0.5"
          >
            <CornerDownRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onToggleRoot}
            title={isRootCause ? 'Desmarcar causa raíz' : 'Marcar como Causa Raíz (Diana)'}
            className={`p-1 rounded-full transition-colors ${
              isRootCause
                ? 'bg-blue-900 text-white hover:bg-blue-800'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-700 dark:hover:text-amber-300'
            }`}
          >
            <Target className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Eliminar causa y sus subcausas"
            className="p-1 rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2nd Level Sub-causes Container (Branching structure from user reference) */}
      {subcauses.length > 0 && (
        <div className="ml-3 pl-2.5 border-l-2 border-blue-400/60 dark:border-blue-500/60 space-y-1.5 mt-1.5">
          {subcauses.map((sub) => {
            const subRootIndex = rootCausesList.findIndex((r) => r.id === sub.id);
            const isSubRoot = Boolean(sub.isRootCause);

            return (
              <SubcauseItem
                key={sub.id}
                subcause={sub}
                isSubRoot={isSubRoot}
                subRootIndex={subRootIndex}
                onUpdateText={(text) => onUpdateSubcauseText(sub.id, text)}
                onToggleRoot={() => onToggleSubcauseRoot(sub.id)}
                onDelete={() => onDeleteSubcause(sub.id)}
                isNewlyAdded={newlyAddedCauseId === sub.id}
              />
            );
          })}

          <button
            type="button"
            onClick={onAddSubcause}
            title="Añadir otra subcausa (2º nivel)"
            className="no-print flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:underline pt-0.5"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Añadir subcausa (2º nivel)</span>
          </button>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// SUB-CAUSE ITEM (SUB-CAUSA DE 2º NIVEL)
// =========================================================================

interface SubcauseItemProps {
  subcause: IshikawaCause;
  isSubRoot: boolean;
  subRootIndex: number;
  onUpdateText: (text: string) => void;
  onToggleRoot: () => void;
  onDelete: () => void;
  isNewlyAdded: boolean;
}

const SubcauseItem: React.FC<SubcauseItemProps> = ({
  subcause,
  isSubRoot,
  subRootIndex,
  onUpdateText,
  onToggleRoot,
  onDelete,
  isNewlyAdded,
}) => {
  const subInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isNewlyAdded && subInputRef.current) {
      subInputRef.current.focus();
      subInputRef.current.select();
    }
  }, [isNewlyAdded]);

  return (
    <div
      className={`relative rounded-md px-2 py-1 border text-xs font-medium transition-all group shadow-2xs ${
        isSubRoot
          ? 'root-cause-navy bg-[#0f274a] text-white border-blue-700 ring-2 ring-blue-600/50 shadow-sm'
          : 'bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 border-slate-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400'
      }`}
    >
      {/* Numbered Badge for Root Cause */}
      {isSubRoot && (
        <div className="root-badge-counter" title={`Causa Raíz #${subRootIndex + 1}`}>
          {subRootIndex + 1}
        </div>
      )}

      {/* Subcause label tag with arrow */}
      <div
        className={`flex items-center gap-1 text-[9px] font-bold mb-0.5 uppercase tracking-wide ${
          isSubRoot ? 'text-blue-200' : 'text-slate-600 dark:text-neutral-400'
        }`}
      >
        <CornerDownRight
          className={`w-2.5 h-2.5 shrink-0 ${isSubRoot ? 'text-blue-300' : 'text-blue-600 dark:text-blue-400'}`}
        />
        <span>Subcausa 2º Nivel</span>
        {isSubRoot && <span className="text-blue-200 font-extrabold ml-auto">Raíz</span>}
      </div>

      <AutoTextarea
        ref={subInputRef}
        singleLine
        value={subcause.text}
        onChange={(e) => onUpdateText(e.target.value)}
        placeholder="Detallar causa secundaria / por qué..."
        className={`w-full bg-transparent outline-none text-[11px] font-semibold leading-snug transition-colors ${
          isSubRoot
            ? 'text-white placeholder-blue-200'
            : 'text-slate-900 dark:text-neutral-50 placeholder-slate-400 dark:placeholder-neutral-500'
        }`}
      />

      {/* Floating Action Buttons on Hover */}
      <div className="no-print absolute -top-2.5 right-1 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-neutral-800 px-1 py-0.5 rounded-full border border-neutral-300 dark:border-neutral-600 shadow-md z-30">
        <button
          type="button"
          onClick={onToggleRoot}
          title={isSubRoot ? 'Desmarcar como causa raíz' : 'Marcar subcausa como Causa Raíz (Diana)'}
          className={`p-1 rounded-full transition-colors ${
            isSubRoot
              ? 'bg-blue-900 text-white hover:bg-blue-800'
              : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-700 dark:hover:text-amber-300'
          }`}
        >
          <Target className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Eliminar subcausa"
          className="p-1 rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-700 dark:hover:text-red-300 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
