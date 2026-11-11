// Borrador del A3 que se está editando: autoguardado, Ctrl+S, fusión en caliente
// de los cambios de otras personas y guardado al salir o cerrar la pestaña.
import { useEffect, useRef, useState } from 'react';
import { A3Project } from '../../types/lean';
import { localStamp } from '../../utils/dates';
import { mergeProject } from '../../storage/merge';

export type SaveStatus = 'saved' | 'saving' | 'dirty';

const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Espera tras el último cambio antes de autoguardar */
const AUTOSAVE_MS = 1000;

export function useEditorDraft(
  project: A3Project,
  onSave: (updated: A3Project, isAutoSave?: boolean) => void,
  externalRevision: number
) {
  const [data, setData] = useState<A3Project>(project);
  const [lastSavedTime, setLastSavedTime] = useState<string>(clock);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const lastSavedSnapshotRef = useRef<string>(JSON.stringify(project));
  const dataRef = useRef<A3Project>(project);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  /** Aplica un cambio al borrador (con fecha de modificación) */
  const update = (fn: (prev: A3Project) => Partial<A3Project>) => {
    setData((prev) => {
      const next = { ...prev, ...fn(prev), updatedAt: localStamp() };
      dataRef.current = next;
      return next;
    });
    setSaveStatus('dirty');
  };

  const handleChange = <K extends keyof A3Project>(field: K, val: A3Project[K]) =>
    update(() => ({ [field]: val }) as Partial<A3Project>);

  /** Guarda en silencio lo pendiente; devuelve si había algo que guardar */
  const flushAutosave = () => {
    const currentSnapshot = JSON.stringify(dataRef.current);
    if (currentSnapshot === lastSavedSnapshotRef.current) return false;
    onSaveRef.current(dataRef.current, true);
    lastSavedSnapshotRef.current = currentSnapshot;
    return true;
  };
  const flushRef = useRef(flushAutosave);
  useEffect(() => {
    flushRef.current = flushAutosave;
  });

  // Autoguardado 1 s después del último cambio
  useEffect(() => {
    if (saveStatus !== 'dirty') return;
    const timer = setTimeout(() => {
      if (flushRef.current()) setLastSavedTime(clock());
      setSaveStatus('saved');
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
    // `data` reinicia la espera con cada cambio: se guarda 1 s después del ÚLTIMO
    // eslint-disable-next-line react/exhaustive-effect-dependencies
  }, [data, saveStatus]);

  // Cambios de otras personas en este A3: se fusionan con lo que se está
  // editando (campo a campo; si coincide el campo, se conserva lo local)
  const lastExternalRef = useRef(externalRevision);
  useEffect(() => {
    if (externalRevision === lastExternalRef.current) return;
    lastExternalRef.current = externalRevision;
    const base = JSON.parse(lastSavedSnapshotRef.current) as A3Project;
    const merged = mergeProject(base, dataRef.current, project).mine;
    const theirs = JSON.stringify(project);
    dataRef.current = merged;
    lastSavedSnapshotRef.current = theirs;
    setData(merged);
    if (JSON.stringify(merged) !== theirs) setSaveStatus('dirty');
  }, [externalRevision, project]);

  /** Guardado inmediato (botón o Ctrl+S) */
  const handleManualSave = () => {
    const current = dataRef.current;
    setSaveStatus('saving');
    onSaveRef.current(current, false);
    lastSavedSnapshotRef.current = JSON.stringify(current);
    setLastSavedTime(clock());
    // Solo pasa a «guardado» si no se ha vuelto a escribir entretanto (si no, el
    // cambio nuevo se quedaría sin guardar: el autoguardado solo actúa en «dirty»)
    setTimeout(() => setSaveStatus((st) => (st === 'saving' ? 'saved' : st)), 600);
  };
  const manualSaveRef = useRef(handleManualSave);
  useEffect(() => {
    manualSaveRef.current = handleManualSave;
  });

  // Ctrl+S / Cmd+S guarda al momento
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        manualSaveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Guardar lo pendiente al desmontar el editor o al intentar cerrar la pestaña
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (flushRef.current()) {
        // Se pide confirmación para dar tiempo a escribir en el archivo del almacén
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      flushRef.current();
    };
  }, []);

  return { data, saveStatus, lastSavedTime, update, handleChange, handleManualSave };
}
