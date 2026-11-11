// Almacén de A3 en un archivo .json elegido por el usuario (carpeta local o compartida).
// - localStorage sigue siendo la caché de trabajo (lo gestiona App).
// - La sincronización con el archivo la hace AlmacenSync (sin React); este hook
//   le da acceso a los A3, refleja su estado en la interfaz y decide CUÁNDO
//   sincronizar (cada cambio, opiniones nuevas, al volver a la ventana y cada minuto).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { A3Project } from '../types/lean';
import { downloadText, fsaSupported, serializeAlmacen } from './fileStore';
import { saveDailyBackup } from './backups';
import { AlmacenConflict, AlmacenStatus } from './almacenShared';
import { AlmacenSync, Notify, SyncHost } from './almacen/AlmacenSync';
import { useTeamOpinions } from './almacen/useTeamOpinions';
import { useBackupReminder } from './almacen/useBackupReminder';
import { useFileWatch } from './almacen/useFileWatch';

export type { AlmacenConflict, AlmacenStatus, ConflictOption } from './almacenShared';

/** Espera tras un cambio de los A3 antes de escribir en el archivo */
const WRITE_DELAY_MS = 400;

type Latest = {
  replaceProjects: (p: A3Project[]) => void;
  notify: Notify;
  team: ReturnType<typeof useTeamOpinions>;
};
type Setters = Pick<
  SyncHost,
  'setError' | 'setConflict' | 'setNewerVersion' | 'setFileName' | 'markSaved' | 'externalChange'
> & { setStatus: (s: AlmacenStatus) => void };

/** Une el motor con el estado de React (lee siempre el valor más reciente por refs) */
function makeHost(
  projectsRef: React.RefObject<A3Project[]>,
  statusRef: React.RefObject<AlmacenStatus>,
  latest: React.RefObject<Latest>,
  set: Setters
): SyncHost {
  return {
    ...set,
    getProjects: () => projectsRef.current,
    replaceProjects: (list) => latest.current.replaceProjects(list),
    getStatus: () => statusRef.current,
    setStatus: (s) => {
      statusRef.current = s;
      set.setStatus(s);
    },
    notify: (msg, type) => latest.current.notify(msg, type),
    opinions: {
      current: () => latest.current.team.opinionsRef.current,
      absorb: (o) => latest.current.team.absorb(o),
      markWritten: (o) => latest.current.team.markWritten(o),
      pending: () => latest.current.team.pending(),
      matchesFile: (o) => latest.current.team.matchesFile(o),
    },
  };
}

export function useAlmacenArchivo(projects: A3Project[], replaceProjects: (p: A3Project[]) => void, notify: Notify) {
  // Navegador sin acceso a archivos (Firefox, Safari): solo en el navegador
  const [status, setStatusState] = useState<AlmacenStatus>(() => (fsaSupported() ? 'loading' : 'unsupported'));
  const [fileName, setFileName] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [conflict, setConflict] = useState<AlmacenConflict | null>(null);
  const [newerVersion, setNewerVersion] = useState<string | null>(null);
  // Cambios de otras personas incorporados: `hard` si el editor debe recargarse
  const [externalChange, setExternalChange] = useState({ version: 0, hard: false });
  const team = useTeamOpinions();
  const backup = useBackupReminder();
  const markBackupChanged = backup.markChanged;

  // El motor lee siempre lo último (no espera a que React vuelva a pintar)
  const projectsRef = useRef(projects);
  const statusRef = useRef(status);
  const latest = useRef<Latest>({ replaceProjects, notify, team });
  useEffect(() => {
    projectsRef.current = projects;
    latest.current = { replaceProjects, notify, team };
  });

  // makeHost solo lee las refs dentro de funciones que el motor llama más tarde
  // (nunca durante el render); el motor se crea una sola vez.
  const [sync] = useState(
    // eslint-disable-next-line react/refs
    () =>
      new AlmacenSync(
        makeHost(projectsRef, statusRef, latest, {
          setStatus: setStatusState,
          setError: setErrorMsg,
          setConflict,
          setNewerVersion,
          setFileName,
          markSaved: setLastSavedAt,
          externalChange: (hard) => setExternalChange((c) => ({ version: c.version + 1, hard })),
        })
      )
  );

  // Arranque: recuperar el archivo vinculado
  useEffect(() => {
    if (fsaSupported()) sync.start();
  }, [sync]);

  // Guardado automático en el archivo ante cada cambio (o recordatorio de copia sin archivo)
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    const st = statusRef.current;
    if (st === 'connected') {
      if (sync.isSynced(projects)) return;
      const t = setTimeout(() => sync.syncNow(), WRITE_DELAY_MS);
      return () => clearTimeout(t);
    }
    if (st === 'none' || st === 'unsupported') markBackupChanged();
  }, [projects, sync, markBackupChanged]);

  // Guardar en el archivo las opiniones nuevas o actualizadas
  useEffect(() => {
    if (team.version === 0 || statusRef.current !== 'connected') return;
    const t = setTimeout(() => sync.syncNow(), 200);
    return () => clearTimeout(t);
  }, [team.version, sync]);

  // Copia de seguridad diaria (como mucho una escritura cada 10 minutos)
  useEffect(() => {
    if (status === 'loading' || status === 'conflict') return;
    saveDailyBackup(projects, fileName || 'este navegador').catch((e) =>
      console.warn('No se ha podido guardar la copia de seguridad', e)
    );
  }, [projects, status, fileName]);

  // Recoger cambios de otras personas al volver a la ventana y cada minuto
  // (p. ej. una petición de revisión), también en solo lectura
  const shouldWatch = useCallback(() => sync.shouldWatch(), [sync]);
  useFileWatch(shouldWatch, sync.syncNow);

  const exportBackup = async () => {
    const date = new Date().toISOString().split('T')[0];
    // Solo cuenta como copia hecha si se ha guardado de verdad (en el móvil se puede rechazar)
    const saved = await downloadText(
      `almacen_A3_${date}.json`,
      serializeAlmacen(projectsRef.current, team.opinionsRef.current)
    );
    if (saved) backup.markExported();
  };

  return {
    status,
    fileName,
    lastSavedAt,
    errorMsg,
    conflict,
    newerVersion,
    externalChange,
    lastBackup: backup.lastBackup,
    changedSinceBackup: backup.changedSinceBackup,
    createFile: sync.createFile,
    openFile: sync.openFile,
    reconnect: sync.reconnect,
    retry: sync.retry,
    disconnect: sync.disconnect,
    exportBackup,
    overwriteDamaged: sync.overwriteDamaged,
    restoreBackup: sync.restoreBackup,
    opinions: team.opinions,
    addOpinion: team.add,
    updateOpinion: team.update,
    hasUnsyncedChanges: () => sync.hasUnsyncedChanges(),
  };
}
