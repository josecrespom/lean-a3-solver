import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmación dentro de la app (sustituye a window.confirm, que algunos navegadores bloquean) */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    role="alertdialog"
    maxWidth="max-w-md"
    closeLabel={cancelText}
    icon={
      <span
        className={`p-1.5 rounded-full ${
          isDestructive
            ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
        }`}
      >
        {isDestructive ? <Trash2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      </span>
    }
    title={title}
    footer={
      <>
        <Button onClick={onCancel} data-autofocus>
          {cancelText}
        </Button>
        <Button variant={isDestructive ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmText}
        </Button>
      </>
    }
  >
    <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{message}</div>
  </Modal>
);
