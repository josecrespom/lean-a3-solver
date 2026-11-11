// A3 abierto en el editor y cómo le llegan los cambios de otras personas:
//  - fusión normal: el editor los incorpora sin recargarse (no se pierde lo que se escribe)
//  - el usuario eligió descartar los suyos (o restauró una versión): el editor se
//    recarga con la otra versión y no guarda su borrador al desmontarse
import { useEffect, useRef, useState } from 'react';
import { A3Project } from '../types/lean';

export function useOpenEditor(projects: A3Project[], externalChange: { version: number; hard: boolean }) {
  const [currentProject, setCurrentProject] = useState<A3Project | null>(null);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [editorSync, setEditorSync] = useState(0);
  const discardFlushRef = useRef(false);

  /** Recarga el editor con `p` descartando lo que tuviera sin guardar */
  const reloadWith = (p: A3Project) => {
    discardFlushRef.current = true;
    setCurrentProject(p);
    setEditorEpoch((e) => e + 1);
  };

  useEffect(() => {
    if (externalChange.version === 0 || !currentProject) return;
    const latest = projects.find((p) => p.id === currentProject.id);
    if (!latest || JSON.stringify(latest) === JSON.stringify(currentProject)) return;
    if (externalChange.hard) reloadWith(latest);
    else {
      setCurrentProject(latest);
      setEditorSync((v) => v + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalChange]);
  useEffect(() => {
    discardFlushRef.current = false;
  }, [editorEpoch]);

  const editorProject = currentProject ? (projects.find((p) => p.id === currentProject.id) ?? currentProject) : null;

  /** Guardado automático del editor que se está descartando: se ignora */
  const isDiscarding = () => discardFlushRef.current;

  return { currentProject, setCurrentProject, editorProject, editorEpoch, editorSync, reloadWith, isDiscarding };
}
