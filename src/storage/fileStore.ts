// Acceso a un archivo de almacén (.json) elegido por el usuario, mediante la
// File System Access API (Chrome y Edge). El "handle" del archivo se guarda en
// IndexedDB para poder reconectar al volver a abrir la app.
import { A3Project, Opinion } from '../types/lean';
import { FORMAT_VERSION, normalizeProjects } from '../utils/normalize';
import { APP_VERSION } from '../utils/version';
import { saveFile } from '../utils/saveFile';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type FileHandle = any; // FileSystemFileHandle (tipos aún no incluidos en lib.dom)

export const FORMATO_ALMACEN = 'lean-a3-cms';

export interface AlmacenArchivo {
  formato: typeof FORMATO_ALMACEN;
  version: number;
  /** Versión de la app que guardó el archivo (para avisar de copias antiguas) */
  appVersion?: string;
  guardadoEn: string;
  proyectos: A3Project[];
  /** Opiniones del equipo sobre la app (opcional) */
  opiniones?: Opinion[];
}

export const fsaSupported = (): boolean =>
  typeof window !== 'undefined' &&
  typeof (window as any).showSaveFilePicker === 'function' &&
  typeof (window as any).showOpenFilePicker === 'function' &&
  typeof indexedDB !== 'undefined';

const PICKER_TYPES = [
  {
    description: 'Almacén de A3 (JSON)',
    accept: { 'application/json': ['.json'] },
  },
];

// ---------------------------------------------------------------------------
// IndexedDB: persistencia del handle entre sesiones
// ---------------------------------------------------------------------------
const DB_NAME = 'lean-a3-cms';
const STORE = 'handles';
const KEY = 'almacen';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export const loadStoredHandle = (): Promise<FileHandle | undefined> =>
  idb<FileHandle | undefined>('readonly', (s) => s.get(KEY)).catch(() => undefined);

export const storeHandle = (h: FileHandle) => idb<void>('readwrite', (s) => s.put(h, KEY));

export const forgetHandle = () => idb<void>('readwrite', (s) => s.delete(KEY)).catch(() => undefined);

/**
 * Última versión en la que este navegador y el archivo coincidían (base de la
 * fusión). Va en IndexedDB y no en localStorage: con muchos A3 ocuparía la
 * mitad del espacio que el navegador da a localStorage.
 */
export const loadBase = () =>
  idb<{ json: string; lm: number } | undefined>('readonly', (s) => s.get('base')).catch(() => undefined);
export const storeBase = (json: string, lm: number) =>
  idb<void>('readwrite', (s) => s.put({ json, lm }, 'base')).catch(() => undefined);
export const clearBase = () => idb<void>('readwrite', (s) => s.delete('base')).catch(() => undefined);

// ---------------------------------------------------------------------------
// Permisos
// ---------------------------------------------------------------------------
export async function hasPermission(h: FileHandle): Promise<boolean> {
  try {
    return (await h.queryPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

/** Debe llamarse desde un gesto del usuario (clic). */
export async function requestPermission(h: FileHandle): Promise<boolean> {
  try {
    return (await h.requestPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Lectura / escritura
// ---------------------------------------------------------------------------
export function parseAlmacen(text: string): A3Project[] {
  return parseAlmacenFull(text).projects;
}

/** Claves del archivo que esta versión conoce; el resto se conserva tal cual al guardar */
const KNOWN_KEYS = new Set(['formato', 'version', 'appVersion', 'guardadoEn', 'proyectos', 'opiniones']);

export function parseAlmacenFull(text: string): {
  projects: A3Project[];
  appVersion?: string;
  /** Versión del formato de datos (1 si es un archivo antiguo) */
  formatVersion: number;
  opiniones: Opinion[];
  extra: Record<string, unknown>;
} {
  const json = JSON.parse(text);
  const formatVersion = json && typeof json.version === 'number' ? json.version : 1;
  const appVersion = json && typeof json.appVersion === 'string' ? json.appVersion : undefined;
  const opiniones =
    json && Array.isArray(json.opiniones)
      ? (json.opiniones as Opinion[]).filter((o) => o && typeof o.id === 'string' && typeof o.text === 'string')
      : [];
  const extra: Record<string, unknown> = {};
  if (json && typeof json === 'object' && !Array.isArray(json))
    for (const [k, v] of Object.entries(json)) if (!KNOWN_KEYS.has(k)) extra[k] = v;
  return { projects: parseAlmacenProjects(json), appVersion, formatVersion, opiniones, extra };
}

function rawProjects(json: any): unknown[] {
  // Formato actual: { formato, proyectos }. También acepta exportaciones antiguas
  // (array de proyectos) o un único proyecto suelto.
  if (json && json.formato === FORMATO_ALMACEN && Array.isArray(json.proyectos)) return json.proyectos;
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object' && json.id) return [json];
  throw new Error('El archivo no tiene el formato de un almacén de A3.');
}

/** A3 del archivo, validados y reparados (ver utils/normalize) */
function parseAlmacenProjects(json: any): A3Project[] {
  return normalizeProjects(rawProjects(json)).projects;
}

export function serializeAlmacen(
  projects: A3Project[],
  opiniones?: Opinion[],
  extra: Record<string, unknown> = {}
): string {
  const data: AlmacenArchivo & Record<string, unknown> = {
    ...extra,
    formato: FORMATO_ALMACEN,
    version: FORMAT_VERSION,
    appVersion: APP_VERSION,
    guardadoEn: new Date().toISOString(),
    proyectos: projects,
    ...(opiniones && opiniones.length ? { opiniones } : {}),
  };
  return JSON.stringify(data, null, 2);
}

export interface FileSnapshot {
  projects: A3Project[];
  lastModified: number;
  appVersion?: string;
  /** El archivo está vacío (0 bytes): recién creado o escritura interrumpida */
  empty?: boolean;
  formatVersion: number;
  opiniones: Opinion[];
  /** Datos del archivo que esta versión no conoce (se conservan al guardar) */
  extra: Record<string, unknown>;
}

/** El archivo existe pero su contenido no es un almacén válido: no se debe sobrescribir sin preguntar */
export class DamagedFileError extends Error {
  constructor(detail: string) {
    super(`El archivo del almacén está dañado o no se puede leer (${detail}).`);
    this.name = 'DamagedFileError';
  }
}

export async function readFromHandle(h: FileHandle): Promise<FileSnapshot> {
  const file: File = await h.getFile();
  const text = await file.text();
  if (!text.trim())
    return {
      projects: [],
      lastModified: file.lastModified,
      empty: true,
      opiniones: [],
      extra: {},
      formatVersion: FORMAT_VERSION,
    };
  let parsed: ReturnType<typeof parseAlmacenFull>;
  try {
    parsed = parseAlmacenFull(text);
  } catch (e) {
    throw new DamagedFileError(e instanceof SyntaxError ? 'JSON incompleto o mal formado' : 'formato desconocido');
  }
  return {
    projects: parsed.projects,
    lastModified: file.lastModified,
    appVersion: parsed.appVersion,
    formatVersion: parsed.formatVersion,
    opiniones: parsed.opiniones,
    extra: parsed.extra,
  };
}

export async function getLastModified(h: FileHandle): Promise<number> {
  const file: File = await h.getFile();
  return file.lastModified;
}

/** El archivo lo ha guardado una versión más nueva de la app: esta no debe escribir en él */
export class OutdatedAppError extends Error {
  constructor(public fileVersion: string) {
    super(`El almacén lo ha guardado la v${fileVersion} de la app y esta copia es más antigua.`);
    this.name = 'OutdatedAppError';
  }
}

export class VerifyError extends Error {
  constructor() {
    super('El archivo no ha quedado bien guardado.');
    this.name = 'VerifyError';
  }
}

/**
 * Escribe el almacén, lo vuelve a leer para comprobar que ha quedado igual
 * (unidades de red, antivirus…) y devuelve la nueva fecha de modificación.
 * Si no coincide, reintenta una vez; si sigue sin coincidir, lanza VerifyError.
 */
export async function writeToHandle(
  h: FileHandle,
  projects: A3Project[],
  opiniones?: Opinion[],
  extra?: Record<string, unknown>
): Promise<number> {
  const text = serializeAlmacen(projects, opiniones, extra);
  for (let attempt = 0; attempt < 2; attempt++) {
    const writable = await h.createWritable();
    await writable.write(text);
    await writable.close();
    const file: File = await h.getFile();
    if ((await file.text()) === text) return file.lastModified;
  }
  throw new VerifyError();
}

// ---------------------------------------------------------------------------
// Selectores de archivo (requieren gesto del usuario)
// ---------------------------------------------------------------------------
export async function pickNewFile(): Promise<FileHandle | null> {
  try {
    return await (window as any).showSaveFilePicker({
      suggestedName: 'almacen_A3.json',
      types: PICKER_TYPES,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') return null;
    throw e;
  }
}

export async function pickExistingFile(): Promise<FileHandle | null> {
  try {
    const [h] = await (window as any).showOpenFilePicker({ types: PICKER_TYPES, multiple: false });
    return h ?? null;
  } catch (e: any) {
    if (e?.name === 'AbortError') return null;
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Utilidades compartidas con la exportación manual
// ---------------------------------------------------------------------------
/** Descarga un .json; devuelve si se ha guardado */
export function downloadText(filename: string, text: string): Promise<boolean> {
  return saveFile(filename, text, 'application/json;charset=utf-8');
}
