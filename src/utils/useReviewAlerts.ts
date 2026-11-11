// Detecta tareas de revisión del usuario (A3 por revisar y A3 devueltos) y
// avisa cuando aparece una nueva: mensaje en la app, notificación de Windows
// (si se ha permitido) y contador en el título de la pestaña.
import { useCallback, useEffect, useRef, useState } from 'react';
import { A3Project } from '../types/lean';

const BASE_TITLE = typeof document !== 'undefined' ? document.title : 'Lean A3';

type Notify = (msg: string, type?: 'success' | 'error' | 'info') => void;

const notificationsAllowed = () => typeof Notification !== 'undefined' && Notification.permission === 'granted';

const keyOf = (p: A3Project, kind: string) => `${kind}:${p.id}:${p.review?.requestedAt || p.review?.decidedAt || ''}`;

export function useReviewAlerts(projects: A3Project[], userName: string, notify: Notify) {
  const toReview = userName
    ? projects.filter((p) => p.review?.state === 'en_revision' && p.review.reviewer === userName)
    : [];
  const returned = userName
    ? projects.filter((p) => p.review?.state === 'devuelto' && p.review.requestedBy === userName)
    : [];

  const [notificationsOn, setNotificationsOn] = useState(notificationsAllowed);

  // Contador en el título de la pestaña
  const total = toReview.length + returned.length;
  useEffect(() => {
    document.title = total > 0 ? `(${total}) ${BASE_TITLE}` : BASE_TITLE;
  }, [total]);

  // Avisar solo de lo NUEVO (no de lo que ya estaba al abrir la app)
  const known = useRef<Set<string> | null>(null);
  const knownUser = useRef(userName);
  useEffect(() => {
    const current = new Map<string, { p: A3Project; kind: 'review' | 'returned' }>();
    toReview.forEach((p) => current.set(keyOf(p, 'review'), { p, kind: 'review' }));
    returned.forEach((p) => current.set(keyOf(p, 'returned'), { p, kind: 'returned' }));

    if (known.current === null || knownUser.current !== userName) {
      // Primera carga o cambio de nombre: se toma como punto de partida, sin avisar
      knownUser.current = userName;
      known.current = new Set(current.keys());
      return;
    }
    for (const [key, { p, kind }] of current) {
      if (known.current.has(key)) continue;
      // Si la acción la he hecho yo mismo en este equipo, no hace falta avisar
      const actor = kind === 'review' ? p.review?.requestedBy : p.review?.decidedBy;
      if (actor && actor === userName) continue;
      const msg =
        kind === 'review'
          ? `${actor || 'Alguien'} te ha pedido revisar «${p.title}»`
          : `${actor || 'El revisor'} te ha devuelto «${p.title}» con comentarios`;
      notify(msg, 'info');
      if (notificationsAllowed() && document.visibilityState !== 'visible') {
        try {
          const n = new Notification('Lean A3', { body: msg, tag: key });
          n.onclick = () => window.focus();
        } catch {
          /* notificaciones no disponibles */
        }
      }
    }
    known.current = new Set(current.keys());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, userName]);

  const enableNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setNotificationsOn(result === 'granted');
    if (result === 'granted') notify('Avisos de Windows activados.', 'success');
    else notify('El navegador no ha permitido los avisos. Puedes activarlos en la configuración del sitio.', 'info');
  }, [notify]);

  return { toReview, returned, notificationsOn, enableNotifications };
}
