import React, { useRef, useEffect } from 'react';
import { IshikawaCategory } from '../../types/lean';
import { Plus, Trash2, Edit3 } from 'lucide-react';

import { CauseItem } from './CauseItem';
// =========================================================================
// SPINE COLUMN COMPONENT (ESPINA CATEGORÍA)
// =========================================================================

/** Acciones de edición del Ishikawa (las aplica el diagrama con las operaciones de ishikawaOps) */
export interface IshikawaActions {
  renameCategory: (catId: string, name: string) => void;
  deleteCategory: (catId: string) => void;
  addCause: (catId: string) => void;
  setCauseText: (catId: string, causeId: string, text: string) => void;
  toggleCauseRoot: (catId: string, causeId: string) => void;
  deleteCause: (catId: string, causeId: string) => void;
  addSubcause: (catId: string, causeId: string) => void;
  setSubcauseText: (catId: string, causeId: string, subId: string, text: string) => void;
  toggleSubcauseRoot: (catId: string, causeId: string, subId: string) => void;
  deleteSubcause: (catId: string, causeId: string, subId: string) => void;
}

interface SpineColumnProps {
  category: IshikawaCategory;
  position: 'top' | 'bottom';
  isEditing: boolean;
  onSetEditing: (id: string | null) => void;
  actions: IshikawaActions;
  rootCausesList: { id: string; text: string }[];
  newlyAddedCauseId: string | null;
}

export const SpineColumn: React.FC<SpineColumnProps> = ({
  category,
  position,
  isEditing,
  onSetEditing,
  actions,
  rootCausesList,
  newlyAddedCauseId,
}) => {
  const catId = category.id;
  const onUpdateName = (name: string) => actions.renameCategory(catId, name);
  const onDeleteCategory = () => actions.deleteCategory(catId);
  const onAddCause = () => actions.addCause(catId);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      className={`relative flex flex-col items-center w-[220px] @max-[1000px]/lienzo:w-[164px] ${
        position === 'top' ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Visual Spine Stem Line */}
      <div
        className={`absolute w-1 bg-neutral-300 dark:bg-neutral-700 left-1/2 -translate-x-1/2 pointer-events-none z-0 ${
          position === 'top' ? 'top-8 bottom-0' : 'top-0 bottom-8'
        }`}
      />

      {/* Top Spine Category Header */}
      {position === 'top' && (
        <CategoryHeader
          category={category}
          isEditing={isEditing}
          nameInputRef={nameInputRef}
          onSetEditing={onSetEditing}
          onUpdateName={onUpdateName}
          onDeleteCategory={onDeleteCategory}
        />
      )}

      {/* Causes List inside Spine */}
      <div className="relative z-10 w-full flex flex-col gap-2 my-2.5">
        {category.causes.map((cause) => {
          const rootIndex = rootCausesList.findIndex((r) => r.id === cause.id);
          const isRootCause = Boolean(cause.isRootCause);

          return (
            <CauseItem
              key={cause.id}
              cause={cause}
              catId={category.id}
              isRootCause={isRootCause}
              rootIndex={rootIndex}
              onUpdateText={(text) => actions.setCauseText(catId, cause.id, text)}
              onToggleRoot={() => actions.toggleCauseRoot(catId, cause.id)}
              onDelete={() => actions.deleteCause(catId, cause.id)}
              onAddSubcause={() => actions.addSubcause(catId, cause.id)}
              onUpdateSubcauseText={(subId, text) => actions.setSubcauseText(catId, cause.id, subId, text)}
              onToggleSubcauseRoot={(subId) => actions.toggleSubcauseRoot(catId, cause.id, subId)}
              onDeleteSubcause={(subId) => actions.deleteSubcause(catId, cause.id, subId)}
              rootCausesList={rootCausesList}
              newlyAddedCauseId={newlyAddedCauseId}
            />
          );
        })}

        {/* Add Cause Button with auto-focus */}
        <button
          type="button"
          onClick={onAddCause}
          title="Añadir nueva causa principal a esta espina"
          className="no-print mt-1 self-center flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-white/90 dark:bg-neutral-800/90 hover:bg-blue-50/80 dark:hover:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 shadow-2xs transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Añadir Causa Principal</span>
        </button>
      </div>

      {/* Bottom Spine Category Header */}
      {position === 'bottom' && (
        <CategoryHeader
          category={category}
          isEditing={isEditing}
          nameInputRef={nameInputRef}
          onSetEditing={onSetEditing}
          onUpdateName={onUpdateName}
          onDeleteCategory={onDeleteCategory}
        />
      )}
    </div>
  );
};

// =========================================================================
// CATEGORY HEADER (ENCABEZADO DE ESPINA)
// =========================================================================

const CategoryHeader: React.FC<{
  category: IshikawaCategory;
  isEditing: boolean;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  onSetEditing: (id: string | null) => void;
  onUpdateName: (name: string) => void;
  onDeleteCategory: () => void;
}> = ({ category, isEditing, nameInputRef, onSetEditing, onUpdateName, onDeleteCategory }) => {
  return (
    <div className="relative z-10 group w-full flex items-center justify-center">
      <div className="flex items-center gap-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 px-2 py-1 rounded-md shadow-2xs transition-colors w-full">
        {isEditing ? (
          <input
            ref={nameInputRef}
            type="text"
            value={category.name}
            onChange={(e) => onUpdateName(e.target.value)}
            onBlur={() => onSetEditing(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSetEditing(null);
            }}
            className="w-full text-xs font-bold text-center bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-blue-400 dark:border-blue-500 rounded px-1 py-0.5 outline-none"
          />
        ) : (
          <span
            onClick={() => onSetEditing(category.id)}
            className="w-full text-xs font-bold text-center truncate cursor-pointer hover:text-blue-700 dark:hover:text-blue-400"
            title="Clic para editar nombre de la espina"
          >
            {category.name}
          </span>
        )}

        {/* Spine Controls (Edit, Delete) */}
        <div className="no-print hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onSetEditing(category.id)}
            title="Editar nombre"
            className="p-0.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onDeleteCategory}
            title="Eliminar esta espina"
            className="p-0.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
