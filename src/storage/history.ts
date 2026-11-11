// Historial de versiones de cada A3, guardado en ESTE navegador (IndexedDB).
// No se guarda en el archivo compartido para no hacerlo pesado; incluye las
// versiones que este equipo ha visto, también las que llegan de otras personas.
import { A3Project } from '../types/lean';
import { localStamp } from '../utils/dates';

export interface A3Version {
  id?: number;
  projectId: string;
  savedAt: number;
  stamp: string;
  data: A3Project;
}

const DB = 'lean-a3-cms-historial';
const STORE = 'versiones';
const MAX_PER_A3 = 30;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const st = req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      st.createIndex('projectId', 'projectId');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listVersions(projectId: string): Promise<A3Version[]> {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).index('projectId').getAll(projectId);
      req.onsuccess = () => resolve((req.result as A3Version[]).sort((a, b) => b.savedAt - a.savedAt));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/** Guarda una versión de un A3 y conserva solo las más recientes. */
export async function saveVersion(project: A3Project): Promise<void> {
  try {
    const existing = await listVersions(project.id);
    if (existing[0] && JSON.stringify(existing[0].data) === JSON.stringify(project)) return; // ya guardada
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      st.add({ projectId: project.id, savedAt: Date.now(), stamp: localStamp(), data: project });
      existing.slice(MAX_PER_A3 - 1).forEach((v) => v.id !== undefined && st.delete(v.id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* sin IndexedDB no hay historial; la app sigue funcionando */
  }
}
