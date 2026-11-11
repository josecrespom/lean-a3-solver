import React, { useRef, useEffect } from 'react';
import { AutoTextarea } from './AutoTextarea';
import { TreeNode } from '../types/lean';
import { Target, Plus, Trash2 } from 'lucide-react';

interface CauseTreeProps {
  data: TreeNode;
  onChange: (newData: TreeNode) => void;
  rootCausesList: { id: string; text: string }[];
}

interface NodeProps {
  node: TreeNode;
  isRoot: boolean;
  onUpdate: (id: string, updates: Partial<TreeNode>) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  rootCausesList: { id: string; text: string }[];
  newlyAddedId: string | null;
}

const CauseTreeNodeComponent: React.FC<NodeProps> = ({
  node,
  isRoot,
  onUpdate,
  onAddChild,
  onDelete,
  rootCausesList,
  newlyAddedId,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rootIndex = rootCausesList.findIndex((r) => r.id === node.id);
  const isMarkedRoot = Boolean(node.isRootCause);

  useEffect(() => {
    if (newlyAddedId === node.id && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [newlyAddedId, node.id]);

  const toggleRootCause = () => {
    onUpdate(node.id, { isRootCause: !node.isRootCause });
  };

  return (
    <li>
      <div
        className={`relative inline-block text-left transition-all duration-200 rounded-lg p-2.5 min-w-[150px] max-w-[210px] border shadow-xs group ${
          isMarkedRoot
            ? 'root-cause-navy bg-[#0f274a] text-white border-blue-800 shadow-md ring-2 ring-blue-700/50'
            : isRoot
              ? 'bg-neutral-800 dark:bg-neutral-900 text-white border-neutral-900 dark:border-neutral-700'
              : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'
        }`}
      >
        {/* Numbered Badge for Root Cause */}
        {isMarkedRoot && (
          <div className="root-badge-counter" title={`Causa Raíz #${rootIndex + 1}`}>
            {rootIndex + 1}
          </div>
        )}

        {/* Node Level Label */}
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-75">
          <span>{isRoot ? 'Problema Principal' : '¿Por qué?'}</span>
          {isMarkedRoot && <span className="text-blue-300 font-bold">Causa Raíz</span>}
        </div>

        {/* Node Text Input */}
        <AutoTextarea
          ref={inputRef}
          value={node.text}
          onChange={(e) => onUpdate(node.id, { text: e.target.value })}
          placeholder={isRoot ? 'Definir el problema a analizar...' : '¿Por qué ocurre el nivel anterior?'}
          className={`w-full min-h-[2.6rem] text-xs font-medium bg-transparent outline-none leading-relaxed ${
            isMarkedRoot
              ? 'text-white placeholder-blue-300 dark:placeholder-blue-300'
              : isRoot
                ? 'text-white placeholder-neutral-400 dark:placeholder-neutral-500'
                : 'text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500'
          }`}
        />

        {/* Action Buttons Toolbar on Hover */}
        <div className="no-print absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-neutral-800 px-1.5 py-0.5 rounded-full border border-neutral-300 dark:border-neutral-600 shadow-md z-20">
          {!isRoot && (
            <button
              type="button"
              onClick={() => onDelete(node.id)}
              title="Eliminar este nodo y sus ramas"
              className="p-1 rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleRootCause}
            title={isMarkedRoot ? 'Desmarcar como causa raíz' : 'Marcar como Causa Raíz (Diana)'}
            className={`p-1 rounded-full transition-colors flex items-center justify-center ${
              isMarkedRoot
                ? 'bg-blue-900 text-white hover:bg-blue-800'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-700 dark:hover:text-amber-300'
            }`}
          >
            <Target className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => onAddChild(node.id)}
            title="Añadir siguiente '¿Por qué?' (Hijo)"
            className="p-1 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Child Nodes Recursive */}
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <CauseTreeNodeComponent
              key={child.id}
              node={child}
              isRoot={false}
              onUpdate={onUpdate}
              onAddChild={onAddChild}
              onDelete={onDelete}
              rootCausesList={rootCausesList}
              newlyAddedId={newlyAddedId}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const CauseTree: React.FC<CauseTreeProps> = ({ data, onChange, rootCausesList }) => {
  const [newlyAddedId, setNewlyAddedId] = React.useState<string | null>(null);

  // Recursively update a node
  const updateNodeRecursively = (current: TreeNode, targetId: string, updates: Partial<TreeNode>): TreeNode => {
    if (current.id === targetId) {
      return { ...current, ...updates };
    }
    if (!current.children || current.children.length === 0) {
      return current;
    }
    return {
      ...current,
      children: current.children.map((child) => updateNodeRecursively(child, targetId, updates)),
    };
  };

  // Recursively add a child node
  const addChildRecursively = (current: TreeNode, parentId: string, newChild: TreeNode): TreeNode => {
    if (current.id === parentId) {
      return {
        ...current,
        children: [...(current.children || []), newChild],
      };
    }
    if (!current.children || current.children.length === 0) {
      return current;
    }
    return {
      ...current,
      children: current.children.map((child) => addChildRecursively(child, parentId, newChild)),
    };
  };

  // Recursively delete a node
  const deleteRecursively = (current: TreeNode, targetId: string): TreeNode => {
    if (!current.children || current.children.length === 0) {
      return current;
    }
    // Filter if it's direct child
    const filtered = current.children.filter((child) => child.id !== targetId);
    if (filtered.length !== current.children.length) {
      return { ...current, children: filtered };
    }
    return {
      ...current,
      children: current.children.map((child) => deleteRecursively(child, targetId)),
    };
  };

  const handleUpdate = (id: string, updates: Partial<TreeNode>) => {
    const updated = updateNodeRecursively(data, id, updates);
    onChange(updated);
  };

  const handleAddChild = (parentId: string) => {
    const newId = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newChild: TreeNode = {
      id: newId,
      text: '',
      isRootCause: false,
      children: [],
    };
    setNewlyAddedId(newId);
    const updated = addChildRecursively(data, parentId, newChild);
    onChange(updated);
  };

  const handleDelete = (id: string) => {
    const updated = deleteRecursively(data, id);
    onChange(updated);
  };

  return (
    <div className="tree-container py-4 px-2 w-max mx-auto select-text">
      <ul>
        <CauseTreeNodeComponent
          node={data}
          isRoot={true}
          onUpdate={handleUpdate}
          onAddChild={handleAddChild}
          onDelete={handleDelete}
          rootCausesList={rootCausesList}
          newlyAddedId={newlyAddedId}
        />
      </ul>
    </div>
  );
};
