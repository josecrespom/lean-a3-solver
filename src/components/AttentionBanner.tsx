import React from 'react';
import { AlarmClock, Bell, MessageSquareWarning, UserCheck } from 'lucide-react';
import { A3Project } from '../types/lean';
import { openComments } from '../utils/review';

interface AttentionBannerProps {
  /** A3 en revisión asignados a mí */
  toReview: A3Project[];
  /** Mis A3 devueltos con comentarios */
  returned: A3Project[];
  /** A3 abierto ahora en el editor (no se repite en el aviso) */
  currentId?: string;
  onOpen: (p: A3Project) => void;
  /** Número de acciones vencidas cuyo responsable soy yo */
  myOverdue?: number;
  onOpenMyActions?: () => void;
}

/** Aviso destacado de tareas de revisión pendientes, visible en todas las pantallas. */
export const AttentionBanner: React.FC<AttentionBannerProps> = ({
  toReview,
  returned,
  currentId,
  onOpen,
  myOverdue = 0,
  onOpenMyActions,
}) => {
  const review = toReview.filter((p) => p.id !== currentId);
  const back = returned.filter((p) => p.id !== currentId);
  if (review.length === 0 && back.length === 0 && myOverdue === 0) return null;

  const row = (
    items: A3Project[],
    tone: 'blue' | 'amber',
    icon: React.ReactNode,
    text: string,
    detail: (p: A3Project) => string
  ) => (
    <div
      role="alert"
      className={`no-print border-b ${
        tone === 'blue'
          ? 'bg-blue-600 border-blue-700 text-white dark:bg-blue-800 dark:border-blue-900'
          : 'bg-amber-400 border-amber-500 text-amber-950 dark:bg-amber-700 dark:border-amber-800 dark:text-amber-50'
      }`}
    >
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="flex items-center gap-2 font-bold">
          <span className="relative flex">
            {icon}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </span>
          {text}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {items.slice(0, 3).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors max-w-[320px] truncate ${
                tone === 'blue'
                  ? 'bg-white text-blue-800 hover:bg-blue-50 dark:bg-blue-950 dark:text-blue-100 dark:hover:bg-blue-900'
                  : 'bg-amber-950 text-amber-50 hover:bg-amber-900'
              }`}
              title={detail(p)}
            >
              {p.title || 'A3 sin título'} →
            </button>
          ))}
          {items.length > 3 && <span className="text-xs font-semibold">y {items.length - 3} más</span>}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {myOverdue > 0 && (
        <div
          role="alert"
          className="no-print border-b bg-red-600 border-red-700 text-white dark:bg-red-800 dark:border-red-900"
        >
          <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="flex items-center gap-2 font-bold">
              <AlarmClock className="w-5 h-5" />
              {myOverdue === 1 ? 'Tienes 1 acción vencida' : `Tienes ${myOverdue} acciones vencidas`}
            </span>
            {onOpenMyActions && (
              <button
                type="button"
                onClick={onOpenMyActions}
                className="px-3 py-1 rounded-md text-xs font-bold bg-white text-red-800 hover:bg-red-50 dark:bg-red-950 dark:text-red-100 dark:hover:bg-red-900"
              >
                Ver mis acciones →
              </button>
            )}
          </div>
        </div>
      )}
      {review.length > 0 &&
        row(
          review,
          'blue',
          <UserCheck className="w-5 h-5" />,
          review.length === 1
            ? 'Tienes 1 A3 pendiente de tu revisión'
            : `Tienes ${review.length} A3 pendientes de tu revisión`,
          (p) => `Solicitado por ${p.review?.requestedBy || 'alguien'}`
        )}
      {back.length > 0 &&
        row(
          back,
          'amber',
          <MessageSquareWarning className="w-5 h-5" />,
          back.length === 1
            ? 'Te han devuelto 1 A3 con comentarios'
            : `Te han devuelto ${back.length} A3 con comentarios`,
          (p) => `${openComments(p).length} comentario(s) de ${p.review?.decidedBy || 'el revisor'}`
        )}
    </>
  );
};

/** Botón para activar las notificaciones de Windows (requiere un clic del usuario). */
export const NotificationToggle: React.FC<{ enabled: boolean; onEnable: () => void }> = ({ enabled, onEnable }) => {
  if (typeof Notification === 'undefined' || enabled) return null;
  return (
    <button
      type="button"
      onClick={onEnable}
      className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      title="Activar avisos de Windows cuando te pidan una revisión o te devuelvan un A3"
      aria-label="Activar avisos de Windows"
    >
      <Bell className="w-4 h-4" />
    </button>
  );
};
