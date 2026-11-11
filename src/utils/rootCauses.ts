import { A3Project, TreeNode } from '../types/lean';

export interface RootCauseRef {
  id: string;
  text: string;
}

/** Causas raíz marcadas en el paso 4 (árbol o Ishikawa), en orden, con su texto para mostrar */
export function rootCausesOf(
  data: Pick<A3Project, 'rootCauseMode' | 'rootCauseTree' | 'rootCauseIshikawa'>
): RootCauseRef[] {
  const list: RootCauseRef[] = [];
  if (data.rootCauseMode === 'tree') {
    const traverse = (node: TreeNode) => {
      if (node.isRootCause) list.push({ id: node.id, text: node.text.trim() || '(Causa sin definir)' });
      node.children?.forEach(traverse);
    };
    if (data.rootCauseTree) traverse(data.rootCauseTree);
  } else {
    (data.rootCauseIshikawa?.categories || []).forEach((cat) => {
      (cat.causes || []).forEach((c) => {
        if (c.isRootCause) list.push({ id: c.id, text: `[${cat.name}] ${c.text.trim() || '(Causa sin definir)'}` });
        (c.subcauses || []).forEach((sub) => {
          if (sub.isRootCause) {
            list.push({
              id: sub.id,
              text: `[${cat.name}] ${c.text.trim() ? `${c.text.trim()} ➔ ` : ''}${sub.text.trim() || '(Subcausa sin definir)'}`,
            });
          }
        });
      });
    });
  }
  return list;
}
