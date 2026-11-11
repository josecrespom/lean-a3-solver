import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-20 md:bottom-5 right-5 left-5 sm:left-auto z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const config = {
    success: {
      bg: 'bg-neutral-900 text-white border-neutral-700',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    },
    error: {
      bg: 'bg-red-900 text-white border-red-700',
      icon: <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />,
    },
    info: {
      bg: 'bg-neutral-900 text-white border-neutral-700',
      icon: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
    },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border shadow-xl text-xs font-medium animate-in slide-in-from-bottom-3 duration-200 ${config.bg}`}
    >
      <div className="flex items-center gap-2">
        {config.icon}
        <span>{toast.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="opacity-70 hover:opacity-100 p-0.5 rounded transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
