// Avisos breves en pantalla (sustituyen a window.alert).
import { useCallback, useState } from 'react';
import type { ToastMessage } from '../components/Toast';

export type Notify = (message: string, type?: 'success' | 'error' | 'info') => void;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast: Notify = useCallback((message, type = 'success') => {
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);
  const removeToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, addToast, removeToast };
}
