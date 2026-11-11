import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FilePlus2,
  FolderOpen,
  HardDrive,
  LifeBuoy,
  Link2Off,
  RefreshCw,
} from 'lucide-react';
import { AlmacenConflict, AlmacenStatus } from '../storage/useAlmacenArchivo';
import { ConfirmModal } from './ConfirmModal';
import { Modal } from './ui/Modal';
import { buttonClass } from './ui/Button';

interface StorageBarProps {
  status: AlmacenStatus;
  fileName: string;
  lastSavedAt: Date | null;
  errorMsg: string;
  lastBackup: string | null;
  changedSinceBackup: boolean;
  onCreateFile: () => void;
  onOpenFile: () => void;
  onReconnect: () => void;
  onRetry: () => void;
  onDisconnect: () => void;
  onExportBackup: () => void;
  onShowBackups: () => void;
  onOverwriteDamaged: () => void;
}

const btnNeutral = buttonClass('secondary', 'xs');
const btnPrimary = buttonClass('primary', 'xs');

const daysSince = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null;

const describeBackup = (iso: string | null) => {
  const d = daysSince(iso);
  if (d === null) return 'nunca';
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  return `hace ${d} días`;
};

export const StorageBar: React.FC<StorageBarProps> = (props) => {
  const { status } = props;
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  if (status === 'loading') return null;

  let tone =
    'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300';
  let content: React.ReactNode = null;

  const backupsBtn = (
    <button
      type="button"
      className={btnNeutral}
      onClick={props.onShowBackups}
      title="Copias de seguridad automáticas: ver, descargar o recuperar"
      aria-label="Copias"
    >
      <LifeBuoy className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Copias</span>
    </button>
  );

  if (status === 'outdated') {
    tone = 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200';
    content = (
      <>
        <span className="flex items-center gap-1.5 min-w-0" role="alert" data-outdated>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Solo lectura.</strong> {props.errorMsg} Para no borrar datos, esta copia no guarda en «
            {props.fileName}». Tus cambios se quedan en este navegador hasta que abras la versión actual.
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {backupsBtn}
          <button type="button" className={btnNeutral} onClick={props.onExportBackup}>
            <Download className="w-3.5 h-3.5" /> Descargar copia
          </button>
        </span>
      </>
    );
  } else if (status === 'damaged') {
    tone = 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200';
    content = (
      <>
        <span className="flex items-center gap-1.5 min-w-0" role="alert">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            {props.errorMsg} Tus A3 siguen en este navegador. Recupera una copia o guarda en el archivo la versión de
            este navegador.
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={btnPrimary} onClick={props.onShowBackups}>
            <LifeBuoy className="w-3.5 h-3.5" /> Recuperar una copia
          </button>
          <button type="button" className={btnNeutral} onClick={() => setConfirmOverwrite(true)}>
            Guardar la versión de este navegador
          </button>
          <button type="button" className={btnNeutral} onClick={props.onRetry}>
            <RefreshCw className="w-3.5 h-3.5" /> Volver a leer
          </button>
        </span>
      </>
    );
  } else if (status === 'connected' || status === 'conflict') {
    const d = daysSince(props.lastBackup);
    content = (
      <>
        <span className="flex items-center gap-1.5 min-w-0">
          <HardDrive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">
            Almacén: <strong className="text-neutral-900 dark:text-white">{props.fileName}</strong>
          </span>
          {props.lastSavedAt && (
            <span className="hidden sm:flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              guardado a las{' '}
              {props.lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {(d === null || d >= 30) && (
            <span className="hidden md:inline text-neutral-500 dark:text-neutral-400" data-download-reminder>
              Copia descargada: {describeBackup(props.lastBackup)}
            </span>
          )}
          {backupsBtn}
          <button type="button" className={btnNeutral} onClick={props.onOpenFile} title="Abrir otro archivo de almacén">
            <FolderOpen className="w-3.5 h-3.5" /> Cambiar archivo
          </button>
          <button
            type="button"
            className={btnNeutral}
            onClick={props.onDisconnect}
            title="Dejar de guardar en este archivo"
          >
            <Link2Off className="w-3.5 h-3.5" /> Desvincular
          </button>
        </span>
      </>
    );
  } else if (status === 'reconnect') {
    tone = 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200';
    content = (
      <>
        <span className="flex items-center gap-1.5 min-w-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            Pulsa <strong>Reconectar</strong> para seguir guardando en <strong>{props.fileName}</strong>. Mientras
            tanto, los cambios solo se guardan en este navegador.
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={btnPrimary} onClick={props.onReconnect}>
            <RefreshCw className="w-3.5 h-3.5" /> Reconectar
          </button>
          <button type="button" className={btnNeutral} onClick={props.onOpenFile}>
            <FolderOpen className="w-3.5 h-3.5" /> Otro archivo
          </button>
        </span>
      </>
    );
  } else if (status === 'error') {
    tone = 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200';
    content = (
      <>
        <span className="flex items-center gap-1.5 min-w-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{props.errorMsg} Los cambios siguen guardados en este navegador.</span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={btnPrimary} onClick={props.onRetry}>
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </button>
          <button type="button" className={btnNeutral} onClick={props.onOpenFile}>
            <FolderOpen className="w-3.5 h-3.5" /> Elegir archivo
          </button>
          {backupsBtn}
        </span>
      </>
    );
  } else {
    // 'none' o 'unsupported': los datos solo viven en este navegador
    const d = daysSince(props.lastBackup);
    const needsBackup = props.changedSinceBackup && (d === null || d >= 7);
    if (needsBackup) {
      tone =
        'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200';
    }
    content = (
      <>
        <span className="flex items-center gap-1.5 min-w-0">
          {needsBackup ? (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <HardDrive className="w-3.5 h-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
          )}
          <span className="truncate">
            {status === 'none'
              ? 'Tus A3 solo están en este navegador. Guárdalos en un archivo de la carpeta compartida.'
              : `Tus A3 solo están en este navegador. Descarga una copia con frecuencia (última: ${describeBackup(props.lastBackup)}).`}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {status === 'none' ? (
            <>
              <button type="button" className={btnPrimary} onClick={props.onCreateFile}>
                <FilePlus2 className="w-3.5 h-3.5" /> Guardar en un archivo
              </button>
              <button type="button" className={btnNeutral} onClick={props.onOpenFile}>
                <FolderOpen className="w-3.5 h-3.5" /> Abrir almacén
              </button>
            </>
          ) : (
            <button type="button" className={needsBackup ? btnPrimary : btnNeutral} onClick={props.onExportBackup}>
              <Download className="w-3.5 h-3.5" /> Descargar copia
            </button>
          )}
          {backupsBtn}
        </span>
      </>
    );
  }

  return (
    <div className={`no-print border-b ${tone} transition-colors`}>
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs">
        {content}
      </div>
      <ConfirmModal
        isOpen={confirmOverwrite}
        title="¿Sustituir el archivo del almacén?"
        message={`Se sustituirá el contenido de «${props.fileName}» por los A3 de este navegador. Lo que haya ahora en el archivo (que no se puede leer) se perderá.`}
        confirmText="Sustituir el archivo"
        isDestructive={false}
        onCancel={() => setConfirmOverwrite(false)}
        onConfirm={() => {
          setConfirmOverwrite(false);
          props.onOverwriteDamaged();
        }}
      />
    </div>
  );
};

interface ConflictModalProps {
  conflict: AlmacenConflict | null;
}

export const StorageConflictModal: React.FC<ConflictModalProps> = ({ conflict }) => {
  const [busy, setBusy] = useState(false);
  if (!conflict) return null;

  const run = async (fn: () => void | Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => undefined}
      dismissible={false}
      role="alertdialog"
      maxWidth="max-w-lg"
      icon={<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />}
      title={conflict.title}
    >
      <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{conflict.message}</p>
      {conflict.items && conflict.items.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm font-semibold text-neutral-800 dark:text-neutral-100 space-y-0.5">
          {conflict.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex flex-col gap-2">
        {conflict.options.map((o) => (
          <button
            key={o.label}
            type="button"
            disabled={busy}
            onClick={() => run(o.action)}
            className={`text-left px-4 py-2.5 rounded-lg border transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              o.primary
                ? 'bg-neutral-900 hover:bg-neutral-700 border-neutral-900 text-white dark:bg-neutral-600 dark:hover:bg-neutral-500 dark:border-neutral-500'
                : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100'
            }`}
          >
            <span className="block text-sm font-semibold">{o.label}</span>
            {o.description && (
              <span
                className={`block text-xs mt-0.5 ${o.primary ? 'opacity-80' : 'text-neutral-500 dark:text-neutral-400'}`}
              >
                {o.description}
              </span>
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
};
