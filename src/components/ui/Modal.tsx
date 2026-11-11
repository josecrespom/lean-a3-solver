import React, { useId } from 'react';
import { useDialog } from './useDialog';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Etiqueta del botón de cerrar para lectores de pantalla */
  closeLabel?: string;
  maxWidth?: string;
  /** alertdialog: no se cierra al pulsar fuera */
  role?: 'dialog' | 'alertdialog';
  footer?: React.ReactNode;
  /** Contenido bajo el título, en la cabecera (p. ej. los pasos de la bienvenida) */
  header?: React.ReactNode;
  /**
   * false: hay que elegir una opción para cerrarla (sin botón X, sin Escape y sin
   * cerrar al pulsar fuera). Para preguntas que no se pueden dejar sin contestar.
   */
  dismissible?: boolean;
  /** card: ventana centrada · fullscreen: ocupa toda la pantalla (vistas previas) */
  size?: 'card' | 'fullscreen';
  /** Botones en la cabecera, junto al de cerrar */
  actions?: React.ReactNode;
  /** Capa (por encima de otras ventanas si hace falta) */
  zIndex?: string;
  children: React.ReactNode;
}

/**
 * Ventana modal común: Escape cierra, el foco entra en la ventana, Tab no se
 * escapa de ella y, al cerrar, el foco vuelve al botón que la abrió.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  closeLabel = 'Cerrar',
  maxWidth = 'max-w-2xl',
  role = 'dialog',
  footer,
  header,
  dismissible = true,
  zIndex = 'z-[60]',
  size = 'card',
  actions,
  children,
}) => {
  const full = size === 'fullscreen';
  const panelRef = useDialog<HTMLDivElement>(isOpen, dismissible ? onClose : undefined);
  const titleId = useId();
  const descId = useId();

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndex} bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center ${full ? '' : 'p-4'}`}
      onClick={role === 'dialog' && dismissible ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full flex flex-col bg-white dark:bg-neutral-900 outline-none ${
          full
            ? 'h-full'
            : `${maxWidth} max-h-[85vh] rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl`
        }`}
      >
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-start justify-between gap-3 shrink-0">
          <div className="flex-1 min-w-[12rem]">
            <h2 id={titleId} className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              {icon}
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                {description}
              </p>
            )}
            {header}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="p-1 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        <div className={full ? 'flex-1 min-h-0 flex flex-col' : 'overflow-y-auto p-5'}>{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
