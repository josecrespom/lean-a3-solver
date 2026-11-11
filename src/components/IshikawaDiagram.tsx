import React, { useState } from 'react';
import { AutoTextarea } from './AutoTextarea';
import { IshikawaData } from '../types/lean';
import { Plus, CornerDownRight } from 'lucide-react';

import { IshikawaLayout } from './ishikawa/IshikawaLayout';
import { IshikawaActions, SpineColumn } from './ishikawa/SpineColumn';
import * as ops from './ishikawa/ishikawaOps';
import { buttonClass } from './ui/Button';

interface IshikawaDiagramProps {
  data: IshikawaData;
  onChange: (newData: IshikawaData) => void;
  rootCausesList: { id: string; text: string }[];
}

/** Editor del diagrama de Ishikawa (espina de pescado) con causas de 1.º y 2.º nivel */
export const IshikawaDiagram: React.FC<IshikawaDiagramProps> = ({ data, onChange, rootCausesList }) => {
  const [newlyAddedCauseId, setNewlyAddedCauseId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const handleAddCategory = () => {
    const r = ops.addCategory(data);
    onChange(r.data);
    setEditingCatId(r.id);
  };

  const actions: IshikawaActions = {
    renameCategory: (catId, name) => onChange(ops.renameCategory(data, catId, name)),
    deleteCategory: (catId) => onChange(ops.deleteCategory(data, catId)),
    addCause: (catId) => {
      const r = ops.addCause(data, catId);
      setNewlyAddedCauseId(r.id);
      onChange(r.data);
    },
    setCauseText: (catId, causeId, text) => onChange(ops.setCauseText(data, catId, causeId, text)),
    toggleCauseRoot: (catId, causeId) => onChange(ops.toggleCauseRoot(data, catId, causeId)),
    deleteCause: (catId, causeId) => onChange(ops.deleteCause(data, catId, causeId)),
    addSubcause: (catId, causeId) => {
      const r = ops.addSubcause(data, catId, causeId);
      setNewlyAddedCauseId(r.id);
      onChange(r.data);
    },
    setSubcauseText: (catId, causeId, subId, text) => onChange(ops.setSubcauseText(data, catId, causeId, subId, text)),
    toggleSubcauseRoot: (catId, causeId, subId) => onChange(ops.toggleSubcauseRoot(data, catId, causeId, subId)),
    deleteSubcause: (catId, causeId, subId) => onChange(ops.deleteSubcause(data, catId, causeId, subId)),
  };

  return (
    <div className="flex flex-col items-center w-max mx-auto py-2 px-6 @max-[1000px]/lienzo:px-1 select-text">
      <div className="no-print w-full flex items-center justify-between pb-4 mb-2 border-b border-neutral-200 dark:border-neutral-800 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1.5">
            <span>Espinas activas:</span>
            <span className="tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">
              {data.categories.length}
            </span>
          </span>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <CornerDownRight className="w-3 h-3 text-blue-500" />
            <span>Soporta causas principales (1º nivel) y subcausas (2º nivel)</span>
          </span>
        </div>
        <button type="button" onClick={handleAddCategory} className={buttonClass('dark', 'xs')}>
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir Espina (Categoría)</span>
        </button>
      </div>

      <div className="mt-4 mb-1">
        <IshikawaLayout
          variant="editor"
          categories={data.categories}
          renderColumn={(cat, position) => (
            <SpineColumn
              category={cat}
              position={position}
              isEditing={editingCatId === cat.id}
              onSetEditing={setEditingCatId}
              actions={actions}
              rootCausesList={rootCausesList}
              newlyAddedCauseId={newlyAddedCauseId}
            />
          )}
          head={
            <div className="w-[230px] @max-[1000px]/lienzo:w-[168px] p-3.5 @max-[1000px]/lienzo:p-2.5 bg-neutral-900 dark:bg-neutral-950 text-white rounded-xl border-2 border-neutral-700 dark:border-neutral-600 shadow-md">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5 border-b border-neutral-700 dark:border-neutral-800 pb-1">
                <span>Efecto / Problema</span>
                <span className="text-red-400 tabular-nums">Cabeza A3</span>
              </div>
              <AutoTextarea
                minRows={3}
                value={data.problemHead}
                onChange={(e) => onChange(ops.setProblemHead(data, e.target.value))}
                aria-label="Efecto o problema (cabeza del Ishikawa)"
                placeholder="Describir el problema o efecto a resolver..."
                className="w-full text-xs font-semibold bg-transparent text-white placeholder-neutral-500 outline-none leading-relaxed border-none focus:ring-1 focus:ring-blue-500 rounded p-1"
              />
              <div className="text-[10px] text-neutral-400 text-right mt-1 italic">Editable en línea</div>
            </div>
          }
        />
      </div>
    </div>
  );
};
