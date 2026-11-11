// Recoge los cambios de otras personas: al volver a la ventana y cada minuto.
import { useEffect } from 'react';

export function useFileWatch(shouldSync: () => boolean, syncNow: () => Promise<void>, intervalMs = 60_000) {
  useEffect(() => {
    const run = () => {
      if (shouldSync()) syncNow();
    };
    window.addEventListener('focus', run);
    const id = window.setInterval(run, intervalMs);
    return () => {
      window.removeEventListener('focus', run);
      window.clearInterval(id);
    };
  }, [shouldSync, syncNow, intervalMs]);
}
