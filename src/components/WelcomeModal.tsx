import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { FilePlus2, FolderOpen, HardDrive, Plus, BookOpen, LayoutGrid } from 'lucide-react';
import { buttonClass } from './ui/Button';
import { fieldClass } from './ui/fields';

interface WelcomeModalProps {
  isOpen: boolean;
  initialName: string;
  fileSupported: boolean;
  connectedFileName: string;
  onSaveName: (name: string) => void;
  onCreateFile: () => Promise<void>;
  onOpenFile: () => Promise<void>;
  onCreateA3: () => void;
  onOpenSample: () => void;
  onClose: () => void;
}

const STEP_TITLES = ['Tu nombre', 'Dónde guardar los A3', 'Empezar'];

/** Primeros pasos para quien abre la app por primera vez. */
export const WelcomeModal: React.FC<WelcomeModalProps> = (props) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(props.initialName);
  const [busy, setBusy] = useState(false);
  if (!props.isOpen) return null;

  const option = (icon: React.ReactNode, title: string, desc: string, onClick: () => void, primary = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-start gap-3 disabled:opacity-60 ${
        primary
          ? 'bg-neutral-900 hover:bg-neutral-700 border-neutral-900 text-white dark:bg-neutral-600 dark:hover:bg-neutral-500 dark:border-neutral-500'
          : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
      }`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className={`block text-xs mt-0.5 ${primary ? 'opacity-80' : 'text-neutral-600 dark:text-neutral-300'}`}>
          {desc}
        </span>
      </span>
    </button>
  );

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const steps = (
    <ol className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold" aria-label="Pasos">
      {STEP_TITLES.map((t, i) => (
        <li
          key={t}
          aria-current={i === step ? 'step' : undefined}
          className={`px-2 py-0.5 rounded-full ${
            i === step
              ? 'bg-blue-600 text-white'
              : i < step
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
          }`}
        >
          {i + 1}. {t}
        </li>
      ))}
    </ol>
  );

  return (
    <Modal
      isOpen
      onClose={props.onClose}
      closeLabel="Cerrar la bienvenida"
      maxWidth="max-w-lg"
      zIndex="z-[70]"
      icon={<span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded">A3</span>}
      title="Bienvenido a Lean A3 Solver"
      header={steps}
    >
      {step === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            props.onSaveName(name.trim());
            setStep(1);
          }}
        >
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
            Tu nombre sirve para que el equipo vea quién crea, cambia y revisa cada A3, y para avisarte de lo que tengas
            pendiente.
          </p>
          <input
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre y apellido"
            aria-label="Tu nombre"
            className={fieldClass('md', 'mt-4 w-full')}
          />
          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={!name.trim()} className={buttonClass('primary', 'md')}>
              Continuar
            </button>
          </div>
        </form>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-2.5">
          {props.connectedFileName ? (
            <p className="text-sm text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 shrink-0" />
              Almacén conectado: <strong>{props.connectedFileName}</strong>
            </p>
          ) : props.fileSupported ? (
            <>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-1">
                Para trabajar en equipo, guardad los A3 en un archivo de una carpeta compartida. Si tu equipo ya tiene
                uno, ábrelo.
              </p>
              {option(
                <FolderOpen className="w-5 h-5" />,
                'Abrir el almacén del equipo',
                'Elige el archivo .json que ya usa tu equipo.',
                () =>
                  run(async () => {
                    await props.onOpenFile();
                    setStep(2);
                  }),
                true
              )}
              {option(
                <FilePlus2 className="w-5 h-5" />,
                'Crear un almacén nuevo',
                'Si eres el primero: elige dónde guardar el archivo (mejor en una carpeta compartida).',
                () =>
                  run(async () => {
                    await props.onCreateFile();
                    setStep(2);
                  })
              )}
            </>
          ) : (
            <p className="text-sm text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              Este navegador no permite guardar en archivos. Tus A3 se guardarán en el navegador: usa Chrome o Edge para
              trabajar en equipo, o descarga copias con frecuencia.
            </p>
          )}
          <div className="mt-2 flex justify-between">
            <button type="button" onClick={() => setStep(0)} className={buttonClass('ghost', 'md')}>
              Atrás
            </button>
            <button type="button" onClick={() => setStep(2)} className={buttonClass('secondary', 'md')}>
              {props.connectedFileName || !props.fileSupported ? 'Continuar' : 'Por ahora, solo en este navegador'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-2.5">
          {option(
            <Plus className="w-5 h-5" />,
            'Crear mi primer A3',
            'Se abre en Modo Asistente, paso a paso, con la Guía Sensei en cada paso.',
            props.onCreateA3,
            true
          )}
          {option(
            <BookOpen className="w-5 h-5" />,
            'Ver el A3 de ejemplo',
            'Un A3 completo de referencia para ver cómo se rellena cada paso.',
            props.onOpenSample
          )}
          {option(<LayoutGrid className="w-5 h-5" />, 'Ir al almacén', 'Ver los A3 que ya existen.', props.onClose)}
        </div>
      )}
    </Modal>
  );
};
