import React from 'react';
import { buttonClass } from './ui/Button';
import { saveFile } from '../utils/saveFile';

interface Props {
  children: React.ReactNode;
  /** Pantalla completa (fallo de toda la app) o recuadro dentro de la página */
  fullPage?: boolean;
  /** Volver a un sitio seguro (por ejemplo, el almacén) */
  onReset?: () => void;
  resetLabel?: string;
}
interface State {
  error: Error | null;
}

const STORAGE_KEY = 'cms_lean_a3_projects_v2';

/** Descarga lo que haya guardado en el navegador, sin depender de React ni del resto de la app */
function downloadLocalCopy() {
  try {
    const text = localStorage.getItem(STORAGE_KEY) || '[]';
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    void saveFile(`A3_copia_de_emergencia_${stamp}.json`, text, 'application/json');
  } catch (e) {
    console.error(e);
  }
}

/**
 * Si algo falla al pintar una pantalla, en lugar de dejar la página en blanco
 * se explica qué ha pasado y se ofrece descargar los A3 y volver a un sitio seguro.
 * Los datos no se pierden: siguen en el navegador y en el archivo del almacén.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error en la interfaz', error, info.componentStack);
  }

  reset = () => {
    if (window.location.hash === '#forzar-error') history.replaceState(null, '', window.location.pathname);
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const btn = buttonClass('secondary', 'md');
    return (
      <div
        role="alert"
        data-error-boundary
        className={
          this.props.fullPage
            ? 'min-h-screen flex items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950'
            : 'max-w-3xl mx-auto my-10 px-4'
        }
      >
        <div className="w-full max-w-xl bg-white dark:bg-neutral-900 border border-red-300 dark:border-red-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            Algo ha fallado al mostrar esta pantalla
          </h2>
          <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
            Tus A3 no se han perdido: siguen guardados en este navegador y, si usas un almacén compartido, en el
            archivo. Puedes descargar una copia por seguridad y volver a intentarlo.
          </p>
          <details className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
            <summary className="cursor-pointer">Detalle técnico (para avisar del fallo)</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{error.message}</pre>
          </details>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={downloadLocalCopy}>
              Descargar copia de los A3
            </button>
            {this.props.onReset && (
              <button type="button" className={btn} onClick={this.reset}>
                {this.props.resetLabel || 'Volver'}
              </button>
            )}
            <button type="button" className={buttonClass('primary', 'md')} onClick={() => window.location.reload()}>
              Recargar la app
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Para comprobar la pantalla de error (pruebas automáticas o soporte): abrir la
 * app con #forzar-error en la dirección provoca un fallo controlado.
 */
export const ErrorProbe: React.FC = () => {
  if (typeof window !== 'undefined' && window.location.hash === '#forzar-error') {
    throw new Error('Fallo de prueba provocado con #forzar-error');
  }
  return null;
};
