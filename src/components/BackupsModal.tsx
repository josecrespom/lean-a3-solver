import React, { useCallback, useEffect, useState } from 'react';
import { Download, FolderCog, FolderOpen, LifeBuoy, RotateCcw } from 'lucide-react';
import { Modal } from './ui/Modal';
import {
  BackupInfo,
  KEEP_DAYS,
  chooseBackupFolder,
  folderPermission,
  folderSupported,
  forgetBackupFolder,
  getBackupFolder,
  getBackupText,
  listBackups,
  writeTodayToFolder,
} from '../storage/backups';
import { downloadText } from '../storage/fileStore';
import { A3Project } from '../types/lean';
import { describeStamp, formatDate } from '../utils/dates';
import { buttonClass } from './ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projects: A3Project[];
  /** Fecha ISO de la última copia descargada a mano */
  lastDownload: string | null;
  onDownloadNow: () => void;
  onRestore: (text: string, label: string) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const btn = buttonClass('secondary', 'xs');

const label = (b: BackupInfo) => formatDate(b.date);

const download = async (b: BackupInfo) => {
  const text = await getBackupText(b.date);
  if (text) downloadText(`almacen_A3_${b.date}.json`, text);
};

export const BackupsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  projects,
  lastDownload,
  onDownloadNow,
  onRestore,
  notify,
}) => {
  const [list, setList] = useState<BackupInfo[] | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [folder, setFolder] = useState<{ name: string; ok: boolean } | null>(null);

  const refresh = useCallback(async () => {
    setList(await listBackups().catch(() => []));
    const dir = await getBackupFolder();
    setFolder(dir ? { name: dir.name, ok: await folderPermission(dir) } : null);
  }, []);

  // Se monta al abrirse (App): basta con cargar la lista
  useEffect(() => {
    let alive = true;
    (async () => {
      const backups = await listBackups().catch(() => []);
      const dir = await getBackupFolder();
      const ok = dir ? await folderPermission(dir) : false;
      if (!alive) return;
      setList(backups);
      setFolder(dir ? { name: dir.name, ok } : null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const restore = async (b: BackupInfo) => {
    const text = await getBackupText(b.date);
    if (!text) return;
    onRestore(text, label(b));
    onClose();
  };

  const pickFolder = async () => {
    try {
      const dir = await chooseBackupFolder();
      if (!dir) return;
      await writeTodayToFolder(projects);
      notify(`Las copias se guardarán también en «${dir.name}\\copias_A3».`, 'success');
      refresh();
    } catch (e) {
      console.error(e);
      notify('No se ha podido usar esa carpeta.', 'error');
    }
  };

  const regrant = async () => {
    const dir = await getBackupFolder();
    if (dir && (await folderPermission(dir, true))) {
      await writeTodayToFolder(projects).catch(() => undefined);
      refresh();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Cerrar copias de seguridad"
      icon={<LifeBuoy className="w-4 h-4" />}
      title="Copias de seguridad"
      description={`Cada día se guarda automáticamente una copia del almacén completo en este equipo (las últimas ${KEEP_DAYS}). Cada persona del equipo guarda las suyas.`}
    >
      <section aria-labelledby="copias-lista" className="mb-5">
        <h3 id="copias-lista" className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-2">
          Copias en este equipo
        </h3>
        {list === null ? (
          <p className="text-sm text-neutral-500">Cargando…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Todavía no hay copias. La primera se guarda en cuanto haya algún A3.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            {list.map((b) => (
              <li
                key={b.date}
                className="px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                data-backup={b.date}
              >
                <div className="text-sm">
                  <span className="font-bold text-neutral-900 dark:text-white">{label(b)}</span>
                  <span className="text-neutral-600 dark:text-neutral-300">
                    {' '}
                    · {b.count} A3 · {Math.max(1, Math.round(b.bytes / 1024))} KB
                  </span>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Actualizada {describeStamp(b.savedAt)} · {b.source}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className={btn}
                    onClick={() => download(b)}
                    aria-label={`Descargar la copia del ${label(b)}`}
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar
                  </button>
                  {confirm === b.date ? (
                    <button type="button" className={buttonClass('danger', 'xs')} onClick={() => restore(b)}>
                      <RotateCcw className="w-3.5 h-3.5" /> Sí, volver a esta copia
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={btn}
                      onClick={() => setConfirm(b.date)}
                      aria-label={`Recuperar la copia del ${label(b)}`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Recuperar
                    </button>
                  )}
                </div>
                {confirm === b.date && (
                  <p className="basis-full text-xs text-neutral-700 dark:text-neutral-300">
                    El almacén volverá a como estaba el {label(b)}. Lo que se haya hecho después se pierde, salvo que
                    descargues antes una copia de hoy.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="copias-carpeta" className="mb-5">
        <h3 id="copias-carpeta" className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-2">
          Copias también en una carpeta
        </h3>
        {!folderSupported() ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Este navegador no permite guardar en carpetas.
          </p>
        ) : folder ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-700 dark:text-neutral-200">
            <span>
              Se guardan en <strong>{folder.name}\copias_A3</strong>
              {!folder.ok && ' (falta permiso desde que se abrió la app)'}
            </span>
            <span className="flex gap-1.5">
              {!folder.ok && (
                <button type="button" className={btn} onClick={regrant}>
                  <FolderCog className="w-3.5 h-3.5" /> Dar permiso
                </button>
              )}
              <button
                type="button"
                className={btn}
                onClick={async () => {
                  await forgetBackupFolder();
                  refresh();
                }}
              >
                Dejar de copiar ahí
              </button>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-700 dark:text-neutral-200">
            <span>
              Recomendado: elige la carpeta compartida del almacén. Así las copias no dependen de este equipo.
            </span>
            <button type="button" className={btn} onClick={pickFolder}>
              <FolderOpen className="w-3.5 h-3.5" /> Elegir carpeta
            </button>
          </div>
        )}
      </section>

      <section aria-labelledby="copias-descarga">
        <h3 id="copias-descarga" className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-2">
          Copia descargada
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-700 dark:text-neutral-200">
          <span>Última: {lastDownload ? describeStamp(lastDownload) : 'nunca'}.</span>
          <button type="button" className={btn} onClick={onDownloadNow}>
            <Download className="w-3.5 h-3.5" /> Descargar copia ahora
          </button>
        </div>
      </section>
    </Modal>
  );
};
