// Motor de sincronización del almacén con su archivo .json (sin React).
// - Cada cambio local se escribe en el archivo; si otra persona ha guardado
//   entretanto, se fusiona elemento a elemento (ver merge.ts y planMerge.ts).
// - Nunca escribe encima de un archivo que no conoce: vuelve a leerlo y fusiona.
// - Si el archivo lo guardó una versión más nueva de la app, pasa a solo lectura.
// La interfaz (useAlmacenArchivo) le da acceso a los A3 y recibe estados y avisos
// por SyncHost.
import { A3Project, Opinion } from '../../types/lean';
import {
  DamagedFileError,
  OutdatedAppError,
  FileHandle,
  FileSnapshot,
  forgetHandle,
  getLastModified,
  hasPermission,
  loadStoredHandle,
  clearBase,
  pickExistingFile,
  storeBase,
  parseAlmacen,
  pickNewFile,
  readFromHandle,
  requestPermission,
  storeHandle,
  writeToHandle,
} from '../fileStore';
import { MergeConflict } from '../merge';
import { AlmacenConflict, AlmacenStatus, json } from '../almacenShared';
import { missingDialog, onlyLocalDialog, perA3Dialog, wholeFileDialog } from '../conflictDialogs';
import { APP_VERSION, compareVersions } from '../../utils/version';
import { FORMAT_VERSION } from '../../utils/normalize';
import { describeFileError } from './fileErrors';
import { restoreSyncBase } from './syncBase';
import { planMerge } from './planMerge';

export type Notify = (msg: string, type?: 'success' | 'error' | 'info') => void;

/** Lo que el motor necesita de la interfaz */
export interface SyncHost {
  getProjects(): A3Project[];
  replaceProjects(list: A3Project[]): void;
  getStatus(): AlmacenStatus;
  setStatus(status: AlmacenStatus): void;
  setError(message: string): void;
  setConflict(conflict: AlmacenConflict | null): void;
  setNewerVersion(version: string | null): void;
  setFileName(name: string): void;
  /** Se acaba de escribir en el archivo */
  markSaved(at: Date | null): void;
  /** Han llegado cambios de otras personas (`hard`: el editor debe recargarse) */
  externalChange(hard: boolean): void;
  notify: Notify;
  opinions: {
    current(): Opinion[];
    absorb(fromFile: Opinion[]): boolean;
    markWritten(list: Opinion[]): void;
    pending(): boolean;
    matchesFile(list: Opinion[]): boolean;
  };
}

/** Versión más nueva que esta copia de la app, por versión o por formato de datos */
export function newerThanApp(snap: Pick<FileSnapshot, 'appVersion' | 'formatVersion'>): string | null {
  if (snap.appVersion && compareVersions(snap.appVersion, APP_VERSION) > 0) return snap.appVersion;
  if (snap.formatVersion > FORMAT_VERSION) return snap.appVersion || `formato ${snap.formatVersion}`;
  return null;
}

export class AlmacenSync {
  private handle: FileHandle | null = null;
  /** Fecha del archivo la última vez que se leyó o escribió */
  private lastModified = 0;
  /** Base de la fusión: lo último que se sabe que había en el archivo */
  private base: A3Project[] | null = null;
  private syncedJson = '';
  private syncing = false;
  private rerun = false;
  /** Nuestra última escritura no quedó bien: el archivo puede estar a medias por nuestra culpa */
  private brokenOwnWrite = false;
  /** Versión más nueva que ha guardado el archivo: mientras exista, no se escribe en él */
  private newerVersion: string | null = null;
  /** Datos del archivo que esta versión no conoce: se conservan al escribir */
  private extra: Record<string, unknown> = {};
  /** La primera sincronización de cada sesión siempre lee el archivo (para saber su versión) */
  private mustRead = true;

  constructor(private host: SyncHost) {}

  // -------------------------------------------------------------------------
  // Estado para la interfaz
  // -------------------------------------------------------------------------
  get connected() {
    return Boolean(this.handle);
  }

  /** ¿Hay cambios locales sin escribir en el archivo? (para avisar al cerrar la pestaña) */
  hasUnsyncedChanges() {
    return this.host.getStatus() === 'connected' && json(this.host.getProjects()) !== this.syncedJson;
  }

  /** ¿Los A3 actuales son los que hay en el archivo? */
  isSynced(list: A3Project[]) {
    return json(list) === this.syncedJson;
  }

  /** ¿Hay que vigilar el archivo para recoger cambios ajenos? */
  shouldWatch() {
    const st = this.host.getStatus();
    return Boolean(this.handle) && (st === 'connected' || st === 'outdated');
  }

  // -------------------------------------------------------------------------
  // Lectura y escritura
  // -------------------------------------------------------------------------
  /** Escribe proyectos + opiniones y recuerda qué opiniones quedaron guardadas */
  private async write(h: FileHandle, list: A3Project[]) {
    if (this.newerVersion) throw new OutdatedAppError(this.newerVersion);
    const ops = this.host.opinions.current();
    const lm = await writeToHandle(h, list, ops, this.extra);
    this.host.opinions.markWritten(ops);
    return lm;
  }

  private async readFile(h: FileHandle): Promise<FileSnapshot> {
    const snap = await readFromHandle(h);
    this.host.opinions.absorb(snap.opiniones);
    this.mustRead = false;
    this.extra = snap.extra;
    this.newerVersion = newerThanApp(snap);
    this.host.setNewerVersion(this.newerVersion);
    return snap;
  }

  private setSynced(list: A3Project[], lastModified: number) {
    const j = json(list);
    this.base = list;
    this.syncedJson = j;
    this.lastModified = lastModified;
    storeBase(j, lastModified);
  }

  private clearSynced() {
    this.base = null;
    this.syncedJson = '';
    this.lastModified = 0;
    clearBase();
  }

  /** Escribe `list` sin fusionar (archivo nuevo, dañado o reparado) */
  private async overwrite(h: FileHandle, list: A3Project[]) {
    this.setSynced(list, await this.write(h, list));
    this.host.markSaved(new Date());
    this.host.setError('');
    this.host.setStatus('connected');
  }

  private fail = (e: unknown) => {
    console.error('Error con el archivo del almacén', e);
    const info = describeFileError(e);
    if (info.brokenOwnWrite) this.brokenOwnWrite = true;
    this.host.setStatus(info.status);
    this.host.setError(info.message);
  };

  /** Muestra una pregunta; si la opción elegida falla, se informa como cualquier error del archivo */
  private ask(c: AlmacenConflict) {
    this.host.setStatus('conflict');
    this.host.setConflict({
      ...c,
      options: c.options.map((o) => ({
        ...o,
        action: async () => {
          try {
            await o.action();
          } catch (e) {
            this.host.setConflict(null);
            this.fail(e);
          }
        },
      })),
    });
  }

  private applyLocally(list: A3Project[], fromOthers: number, hard: boolean) {
    if (json(list) === json(this.host.getProjects())) return;
    this.host.replaceProjects(list);
    if (fromOthers > 0 || hard) this.host.externalChange(hard);
  }

  /**
   * Deja `list` como contenido de la app y del archivo.
   * `list` ya incluye lo que había en el archivo (`fileContent`, leído con fecha
   * `fileLm`). Si alguien ha guardado después (p. ej. mientras se contestaba a un
   * conflicto), NO se escribe encima: se toma `fileContent` como nueva base y se
   * vuelve a fusionar con lo que hay ahora en el archivo.
   */
  private commit = async (
    list: A3Project[],
    fileContent: A3Project[],
    fileLm: number,
    fromOthers: number,
    hard = false
  ) => {
    const h = this.handle;
    if (!h) return;
    let lm = fileLm;
    if (json(list) !== json(fileContent) || this.host.opinions.pending()) {
      // Comprobar el CONTENIDO (no solo la fecha: en red puede tener resolución de 1-2 s)
      const now = await readFromHandle(h).catch(() => null);
      if (!now || now.lastModified !== fileLm || json(now.projects) !== json(fileContent)) {
        this.setSynced(fileContent, fileLm);
        this.applyLocally(list, fromOthers, hard);
        this.host.setConflict(null);
        this.host.setStatus('connected');
        if (this.syncing) this.rerun = true;
        else setTimeout(() => this.syncNow(), 0);
        return;
      }
      lm = await this.write(h, list);
      this.host.markSaved(new Date());
    }
    this.setSynced(list, lm);
    this.applyLocally(list, fromOthers, hard);
    if (fromOthers > 0) {
      this.host.notify(
        fromOthers === 1
          ? 'Se ha incorporado un A3 modificado por otra persona.'
          : `Se han incorporado ${fromOthers} A3 modificados por otras personas.`,
        'info'
      );
    }
    this.host.setConflict(null);
    this.host.setError('');
    this.host.setStatus('connected');
  };

  private askPerA3(merged: A3Project[], conflicts: MergeConflict[], file: A3Project[], lm: number, fromOthers: number) {
    this.ask(perA3Dialog(merged, conflicts, file, lm, fromOthers, this.commit));
  }

  // -------------------------------------------------------------------------
  // Sincronizar
  // -------------------------------------------------------------------------
  /** Lleva los cambios locales al archivo y recoge los de otras personas. */
  syncNow = async (): Promise<void> => {
    const h = this.handle;
    if (!h) return;
    if (this.syncing) {
      this.rerun = true;
      return;
    }
    this.syncing = true;
    try {
      await this.syncOnce(h);
    } catch (e) {
      this.fail(e);
    } finally {
      this.syncing = false;
      if (this.rerun) {
        this.rerun = false;
        if (this.host.getStatus() === 'connected') setTimeout(() => this.syncNow(), 50);
      }
    }
  };

  private async syncOnce(h: FileHandle) {
    const host = this.host;
    const mine = host.getProjects();
    if (this.brokenOwnWrite) {
      // Reintento tras una escritura propia fallida: si el archivo no se puede
      // leer es por esa escritura, así que se vuelve a escribir sin preguntar
      const readable = await readFromHandle(h).then(
        (snap) => !snap.empty,
        () => false
      );
      this.brokenOwnWrite = false;
      if (!readable) return this.overwrite(h, mine);
    }
    const lm = await getLastModified(h);
    const fileUnchanged = !this.mustRead && this.lastModified !== 0 && lm === this.lastModified;

    // Archivo de una versión más nueva: solo lectura. Se recogen los cambios de
    // los demás si aquí no hay nada pendiente; lo pendiente se queda en el navegador.
    if (this.newerVersion && fileUnchanged) {
      host.setStatus('outdated');
      return;
    }

    const localChanges = json(mine) !== this.syncedJson || host.opinions.pending();
    if (fileUnchanged && !localChanges) {
      host.setStatus('connected');
      host.setError('');
      return;
    }
    if (fileUnchanged) {
      // Antes de escribir se confirma que el archivo sigue siendo el que conocemos: la
      // fecha de modificación puede no cambiar si otra persona guardó en el mismo segundo.
      const current = await readFromHandle(h);
      if (json(current.projects) === this.syncedJson && host.opinions.matchesFile(current.opiniones)) {
        return this.overwrite(h, mine);
      }
      // Ha cambiado aunque la fecha no lo diga: fusionar como cualquier cambio ajeno
    }

    // El archivo ha cambiado (u otra sesión): fusionar
    const snap = await this.readFile(h);
    if (this.newerVersion) {
      const clean = json(mine) === this.syncedJson;
      if (clean && json(snap.projects) !== json(mine)) {
        host.replaceProjects(snap.projects);
        host.externalChange(false);
      }
      if (clean) this.setSynced(snap.projects, snap.lastModified);
      host.setError(new OutdatedAppError(this.newerVersion).message);
      host.setStatus('outdated');
      return;
    }
    if (host.getProjects() !== mine) {
      this.rerun = true; // hubo cambios mientras se leía
      return;
    }
    if (json(snap.projects) === json(mine)) {
      if (host.opinions.pending()) {
        this.setSynced(mine, await this.write(h, mine));
        host.markSaved(new Date());
      } else this.setSynced(mine, snap.lastModified);
      host.setStatus('connected');
      return;
    }
    const plan = planMerge(this.base, mine, snap);
    const fileLm = snap.lastModified;
    switch (plan.kind) {
      case 'damaged':
        throw new DamagedFileError('el archivo está vacío');
      case 'whole':
        return this.ask(wholeFileDialog(h.name, snap.projects, fileLm, host.getProjects, this.commit));
      case 'missing':
        return this.ask(
          missingDialog(
            plan.merged,
            plan.conflicts,
            plan.missing,
            host.getProjects,
            snap.projects,
            fileLm,
            plan.fromOthers,
            this.commit
          )
        );
      case 'conflicts':
        return this.askPerA3(plan.merged, plan.conflicts, snap.projects, fileLm, plan.fromOthers);
      case 'commit':
        await this.commit(plan.merged, snap.projects, fileLm, plan.fromOthers);
    }
  }

  // -------------------------------------------------------------------------
  // Conectar un archivo
  // -------------------------------------------------------------------------
  private async connect(h: FileHandle, mode: 'new' | 'open' | 'reconnect') {
    const host = this.host;
    this.handle = h;
    host.setFileName(h.name);
    await storeHandle(h).catch(() => undefined);

    if (mode === 'new') {
      await this.overwrite(h, host.getProjects());
      host.notify(`Almacén guardado en "${h.name}". A partir de ahora cada cambio se guarda ahí.`, 'success');
      return;
    }

    if (mode === 'reconnect') {
      host.setStatus('connected');
      await this.syncNow();
      return;
    }

    // mode === 'open': otro almacén. Avisar si hay A3 locales que no están en él.
    this.clearSynced();
    const snap = await this.readFile(h);
    const fileIds = new Set(snap.projects.map((p) => p.id));
    const onlyLocal = host.getProjects().filter((p) => !fileIds.has(p.id));
    if (onlyLocal.length > 0) {
      this.ask(onlyLocalDialog(h.name, onlyLocal, snap.projects, snap.lastModified, this.commit));
      return;
    }
    await this.commit(snap.projects, snap.projects, snap.lastModified, 0);
    host.notify(`Almacén "${h.name}" abierto.`, 'success');
  }

  /** Arranque: recuperar la base de la fusión y el archivo vinculado */
  async start() {
    const base = await restoreSyncBase();
    if (base) {
      this.base = base.list;
      this.syncedJson = base.json;
      this.lastModified = base.lastModified;
    }
    const h = await loadStoredHandle();
    if (!h) {
      this.host.setStatus('none');
      return;
    }
    this.handle = h;
    this.host.setFileName(h.name);
    if (await hasPermission(h)) await this.connect(h, 'reconnect').catch(this.fail);
    else this.host.setStatus('reconnect');
  }

  // -------------------------------------------------------------------------
  // Acciones de la interfaz (todas se lanzan con un clic del usuario)
  // -------------------------------------------------------------------------
  private async safely(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e) {
      console.error(e);
      this.host.notify((e as Error)?.message || 'No se ha podido acceder al archivo.', 'error');
    }
  }

  createFile = () =>
    this.safely(async () => {
      const h = await pickNewFile();
      if (h) await this.connect(h, 'new');
    });

  openFile = () =>
    this.safely(async () => {
      const h = await pickExistingFile();
      if (h) await this.connect(h, 'open');
    });

  reconnect = () =>
    this.safely(async () => {
      const h = this.handle;
      if (!h) return;
      if (await requestPermission(h)) await this.connect(h, 'reconnect');
      else this.host.notify('Sin permiso no se puede usar el archivo. Puedes volver a intentarlo.', 'error');
    });

  retry = () =>
    this.safely(async () => {
      const h = this.handle;
      if (!h) return;
      if (!(await hasPermission(h)) && !(await requestPermission(h))) return;
      this.host.setStatus('connected');
      await this.syncNow();
    });

  disconnect = () =>
    this.safely(async () => {
      await forgetHandle();
      this.handle = null;
      this.clearSynced();
      this.host.setFileName('');
      this.host.markSaved(null);
      this.host.setConflict(null);
      this.host.setStatus('none');
      this.host.notify('Archivo desvinculado. Los A3 siguen en este navegador.', 'info');
    });

  /** Archivo dañado: guardar en él los A3 de este navegador (tras confirmarlo el usuario) */
  overwriteDamaged = () =>
    this.safely(async () => {
      const h = this.handle;
      if (!h) return;
      await this.overwrite(h, this.host.getProjects());
      this.host.notify(`"${h.name}" reparado con los A3 de este navegador.`, 'success');
    });

  /** Recupera una copia de seguridad (texto del almacén) */
  restoreBackup = (text: string, label: string) =>
    this.safely(async () => {
      const list = parseAlmacen(text);
      const h = this.handle;
      const st = this.host.getStatus();
      // Archivo no fiable: se sobrescribe con la copia. Si no, cuenta como un
      // cambio propio y se fusiona y guarda como cualquier otro.
      if (h && (st === 'damaged' || st === 'error')) await this.overwrite(h, list);
      this.host.replaceProjects(list);
      this.host.externalChange(true);
      this.host.notify(`Copia del ${label} recuperada (${list.filter((p) => !p.deletedAt).length} A3).`, 'success');
    });
}
