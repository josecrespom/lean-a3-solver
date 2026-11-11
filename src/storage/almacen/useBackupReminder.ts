// Recordatorio de descargar una copia cuando los A3 solo están en este navegador.
import { useCallback, useState } from 'react';
import { CHANGED_SINCE_BACKUP_KEY, LAST_BACKUP_KEY, lsGet, lsSet } from '../almacenShared';

export function useBackupReminder() {
  const [lastBackup, setLastBackup] = useState<string | null>(() => lsGet(LAST_BACKUP_KEY));
  const [changedSinceBackup, setChanged] = useState<boolean>(() => lsGet(CHANGED_SINCE_BACKUP_KEY) === '1');

  const markChanged = useCallback(() => {
    lsSet(CHANGED_SINCE_BACKUP_KEY, '1');
    setChanged(true);
  }, []);

  const markExported = () => {
    const now = new Date().toISOString();
    lsSet(LAST_BACKUP_KEY, now);
    lsSet(CHANGED_SINCE_BACKUP_KEY, null);
    setLastBackup(now);
    setChanged(false);
  };

  return { lastBackup, changedSinceBackup, markChanged, markExported };
}
