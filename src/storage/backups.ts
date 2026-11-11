// Copias de seguridad automáticas del almacén completo.
// - Siempre: una copia por día en este navegador (IndexedDB), se guardan 30 días.
//   Cada persona del equipo guarda las suyas, así que el almacén compartido
//   queda copiado en varios equipos.
// - Opcional: además, una copia por día en una carpeta elegida (por ejemplo,
//   la misma carpeta compartida del almacén), en «copias_A3/».
import { A3Project } from '../types/lean';
import { FileHandle, serializeAlmacen } from './fileStore';
import { localDate } from '../utils/dates';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const KEEP_DAYS = 30;
const DB = 'lean-a3-cms-copias';
const STORE = 'copias';
const META = 'meta';
const DIR_KEY = 'carpeta';
/** Como mucho una escritura cada 10 minutos (la copia del día se va actualizando) */
const MIN_INTERVAL_MS = 10 * 60_000;

export interface BackupInfo {
  /** YYYY-MM-DD */
  date: string;
  savedAt: string;
  count: number;
  bytes: number;
  source: string;
}
interface BackupRecord extends BackupInfo {
  text: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'date' });
      req.result.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest | void
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    let result: T;
    if (req) req.onsuccess = () => (result = req.result as T);
    t.oncomplete = () => {
      db.close();
      resolve(result);
    };
    t.onerror = () => reject(t.error);
  });
}

const activeCount = (list: A3Project[]) => list.filter((p) => !p.deletedAt).length;

export async function listBackups(): Promise<BackupInfo[]> {
  const all = (await tx<BackupRecord[]>(STORE, 'readonly', (s) => s.getAll())) || [];
  return all
    .map(({ text, ...info }) => ({ ...info, bytes: info.bytes ?? text.length }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getBackupText(date: string): Promise<string | undefined> {
  const rec = await tx<BackupRecord | undefined>(STORE, 'readonly', (s) => s.get(date));
  return rec?.text;
}

let lastWrite = 0;
let lastJson = '';

/**
 * Guarda (o actualiza) la copia de hoy. No hace nada con un almacén vacío,
 * si no ha cambiado o si se guardó hace menos de 10 minutos (salvo `force`).
 */
export async function saveDailyBackup(projects: A3Project[], source: string, force = false): Promise<boolean> {
  if (!projects.length || typeof indexedDB === 'undefined') return false;
  const j = JSON.stringify(projects);
  if (j === lastJson) return false;
  if (!force && Date.now() - lastWrite < MIN_INTERVAL_MS) return false;
  const text = serializeAlmacen(projects);
  const rec: BackupRecord = {
    date: localDate(),
    savedAt: new Date().toISOString(),
    count: activeCount(projects),
    bytes: text.length,
    source,
    text,
  };
  await tx(STORE, 'readwrite', (s) => {
    s.put(rec);
  });
  lastWrite = Date.now();
  lastJson = j;
  await pruneLocal();
  await writeFolderBackup(rec).catch(() => undefined);
  return true;
}

async function pruneLocal() {
  const list = await listBackups();
  const old = list.slice(KEEP_DAYS);
  if (!old.length) return;
  await tx(STORE, 'readwrite', (s) => {
    old.forEach((b) => s.delete(b.date));
  });
}

/** Solo para pruebas: olvidar el control de frecuencia */
export const resetBackupThrottle = () => {
  lastWrite = 0;
  lastJson = '';
};

// ---------------------------------------------------------------------------
// Copias en una carpeta (opcional)
// ---------------------------------------------------------------------------
export const folderSupported = () => typeof (window as any).showDirectoryPicker === 'function';

export const getBackupFolder = (): Promise<FileHandle | undefined> =>
  tx<FileHandle | undefined>(META, 'readonly', (s) => s.get(DIR_KEY)).catch(() => undefined);

export async function chooseBackupFolder(): Promise<FileHandle | null> {
  try {
    const dir = await (window as any).showDirectoryPicker({ id: 'copias-a3', mode: 'readwrite' });
    await tx(META, 'readwrite', (s) => {
      s.put(dir, DIR_KEY);
    });
    return dir;
  } catch (e: any) {
    if (e?.name === 'AbortError') return null;
    throw e;
  }
}

export const forgetBackupFolder = () =>
  tx(META, 'readwrite', (s) => {
    s.delete(DIR_KEY);
  });

export async function folderPermission(dir: FileHandle, ask = false): Promise<boolean> {
  try {
    if ((await dir.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
    return ask && (await dir.requestPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

const FOLDER = 'copias_A3';
const fileFor = (date: string) => `almacen_A3_${date}.json`;

async function writeFolderBackup(rec: BackupRecord): Promise<void> {
  const dir = await getBackupFolder();
  if (!dir || !(await folderPermission(dir))) return;
  const sub = await dir.getDirectoryHandle(FOLDER, { create: true });
  const fh = await sub.getFileHandle(fileFor(rec.date), { create: true });
  const w = await fh.createWritable();
  await w.write(rec.text);
  await w.close();
  // Borrar las copias de la carpeta con más de 30 días
  const names: string[] = [];
  for await (const [name] of sub.entries()) if (/^almacen_A3_\d{4}-\d{2}-\d{2}\.json$/.test(name)) names.push(name);
  names.sort().reverse();
  for (const name of names.slice(KEEP_DAYS)) await sub.removeEntry(name).catch(() => undefined);
}

/** Escribe ya la copia de hoy en la carpeta (tras elegirla) */
export async function writeTodayToFolder(projects: A3Project[]): Promise<void> {
  const text = serializeAlmacen(projects);
  await writeFolderBackup({
    date: localDate(),
    savedAt: new Date().toISOString(),
    count: activeCount(projects),
    bytes: text.length,
    source: 'manual',
    text,
  });
}
