import React from 'react';
import type { TreeNode } from '../../types/lean';

/** Árbol de 5 por qués en la lámina impresa (solo lectura) */
export const PrintableTree: React.FC<{ node: TreeNode; rootCauses: { id: string; text: string }[] }> = ({
  node,
  rootCauses,
}) => {
  const rootIndex = rootCauses.findIndex((r) => r.id === node.id);
  const isRootCause = Boolean(node.isRootCause);

  return (
    <div className="tree-container select-none">
      <ul>
        <li>
          <div
            className={`relative inline-block p-1.5 rounded border text-[10px] font-medium min-w-[110px] max-w-[150px] shadow-2xs ${
              isRootCause
                ? 'bg-[#0f274a] text-white border-blue-900 font-bold'
                : 'bg-white text-neutral-900 border-neutral-300'
            }`}
          >
            {isRootCause && (
              <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-red-600 text-white font-extrabold flex items-center justify-center text-[9px] border border-white">
                {rootIndex + 1}
              </div>
            )}
            <div className="truncate">{node.text || '...'}</div>
          </div>

          {node.children && node.children.length > 0 && (
            <ul>
              {node.children.map((child) => (
                <PrintableTree key={child.id} node={child} rootCauses={rootCauses} />
              ))}
            </ul>
          )}
        </li>
      </ul>
    </div>
  );
};
