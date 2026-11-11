import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, MessageSquare, RotateCcw, Send, Undo2, UserCheck } from 'lucide-react';
import { A3Project, A3Review, ReviewComment } from '../types/lean';
import { describeStamp } from '../utils/dates';
import {
  REVIEW_LABEL,
  STEP_NAMES,
  addComment,
  changedAfterApproval,
  decideReview,
  openComments,
  reopenReview,
  requestReview,
  reviewOf,
  toggleResolved,
} from '../utils/review';
import { badgeClass, type BadgeTone } from './ui/Badge';
import { buttonClass } from './ui/Button';

const STATE_TONE: Record<A3Review['state'], BadgeTone> = {
  borrador: 'neutral',
  en_revision: 'blue',
  devuelto: 'amber',
  aprobado: 'green',
};

export const ReviewBadge: React.FC<{ project: A3Project }> = ({ project }) => {
  const r = reviewOf(project);
  if (r.state === 'borrador') return null;
  return (
    <span className={badgeClass(STATE_TONE[r.state])}>
      {r.state === 'aprobado' ? '✓ ' : ''}
      {REVIEW_LABEL[r.state]}
      {r.state === 'en_revision' && r.reviewer ? ` · ${r.reviewer}` : ''}
    </span>
  );
};

interface CommentListProps {
  comments: ReviewComment[];
  showStep?: boolean;
  onToggle: (id: string) => void;
}

export const CommentList: React.FC<CommentListProps> = ({ comments, showStep = true, onToggle }) => (
  <ul className="flex flex-col gap-2">
    {comments.map((c) => (
      <li
        key={c.id}
        className={`p-2.5 rounded-lg border text-xs ${
          c.resolved
            ? 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
            : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-neutral-900 dark:text-neutral-100'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-0.5">
              {showStep && (
                <span className="font-bold text-neutral-700 dark:text-neutral-300">
                  {STEP_NAMES[c.step] ?? 'General'} ·{' '}
                </span>
              )}
              {c.author || 'Sin nombre'} · {describeStamp(c.at)}
            </div>
            <p className={`whitespace-pre-wrap leading-relaxed ${c.resolved ? 'line-through' : ''}`}>{c.text}</p>
            {c.resolved && c.resolvedBy && <div className="text-[11px] mt-0.5">Resuelto por {c.resolvedBy}</div>}
          </div>
          <button
            type="button"
            onClick={() => onToggle(c.id)}
            className="shrink-0 px-2 py-0.5 rounded-md border text-[11px] font-semibold bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
          >
            {c.resolved ? 'Reabrir' : 'Marcar resuelto'}
          </button>
        </div>
      </li>
    ))}
  </ul>
);

/** Resumen de la revisión dentro de la barra del editor (abre el panel completo) */
export const ReviewSummary: React.FC<{
  data: A3Project;
  userName: string;
  expanded: boolean;
  onToggle: () => void;
  onRequest: () => void;
}> = ({ data, userName, expanded, onToggle, onRequest }) => {
  const review = reviewOf(data);
  const open = openComments(data);
  const isReviewer = Boolean(userName && review.reviewer && userName === review.reviewer);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="panel-revision"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-left text-xs px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 min-w-0"
      >
        <UserCheck className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
        <span className="text-neutral-500 dark:text-neutral-400">Revisión</span>
        <span className={badgeClass(STATE_TONE[review.state])}>{REVIEW_LABEL[review.state]}</span>
        {open.length > 0 && (
          <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {open.length}
            <span className="sr-only"> comentario(s) pendiente(s)</span>
          </span>
        )}
        {isReviewer && review.state === 'en_revision' && (
          <span className="font-bold text-blue-700 dark:text-blue-400">Pendiente de tu revisión</span>
        )}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {!expanded && (review.state === 'borrador' || review.state === 'devuelto') && (
        <button type="button" onClick={onRequest} className={buttonClass('primary', 'xs')}>
          <Send className="w-3.5 h-3.5" />
          {review.state === 'devuelto' ? 'Volver a solicitar' : 'Solicitar revisión'}
        </button>
      )}
    </div>
  );
};

/** ¿El panel de revisión empieza abierto? (si hay revisión en marcha o comentarios pendientes) */
export const reviewStartsOpen = (data: A3Project) =>
  reviewOf(data).state !== 'borrador' || openComments(data).length > 0;

interface ReviewPanelProps {
  data: A3Project;
  /** Panel abierto (lo controla el editor; el resumen está en su barra) */
  expanded: boolean;
  onExpand: () => void;
  /** Formulario de «Solicitar revisión» abierto */
  requesting: boolean;
  onRequesting: (v: boolean) => void;
  userName: string;
  knownNames: string[];
  onChangeReview: (r: A3Review) => void;
  onChangeComments: (c: ReviewComment[]) => void;
  /** Paso preseleccionado para comentar (al pulsar el contador de una sección) */
  focusStep: number | null;
  onFocusHandled: () => void;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  data,
  userName,
  knownNames,
  onChangeReview,
  onChangeComments,
  focusStep,
  onFocusHandled,
  expanded,
  onExpand,
  requesting,
  onRequesting: setRequesting,
}) => {
  const review = reviewOf(data);
  const by = userName || undefined;
  const open = openComments(data);
  const resolved = (data.comments || []).filter((c) => c.resolved);

  const [showResolved, setShowResolved] = useState(false);
  const [reviewer, setReviewer] = useState(review.reviewer || '');
  const [note, setNote] = useState('');
  const [commentStep, setCommentStep] = useState(0);
  const [commentText, setCommentText] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Al pedir comentar un paso: abrir el panel en ese paso (ajuste de estado al
  // cambiar la prop, durante el render) y después llevar el foco al cuadro de texto
  const [handledStep, setHandledStep] = useState<number | null>(null);
  if (focusStep !== null && focusStep !== handledStep) {
    setHandledStep(focusStep);
    setCommentStep(focusStep);
  }
  useEffect(() => {
    if (focusStep === null) return;
    onExpand();
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      textRef.current?.focus();
    });
    onFocusHandled();
  }, [focusStep, onFocusHandled, onExpand]);

  const submitComment = () => {
    if (!commentText.trim()) return;
    onChangeComments(addComment(data, commentStep, commentText, by));
    setCommentText('');
  };

  const lastEvent = review.history?.[review.history.length - 1];
  const btn =
    'px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50';

  if (!expanded) return null;
  return (
    <div
      ref={panelRef}
      id="panel-revision"
      className="no-print mb-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs scroll-mt-32"
      aria-label="Revisión del A3"
    >
      <div className="p-4 flex flex-col gap-4">
        {changedAfterApproval(data) && (
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
            Este A3 se ha modificado después de aprobarse. Si los cambios son relevantes, conviene reabrirlo y volver a
            pedir revisión.
          </p>
        )}

        {lastEvent && (
          <p className="text-xs text-neutral-600 dark:text-neutral-300">
            Último movimiento: revisión {lastEvent.action}
            {lastEvent.by ? ` por ${lastEvent.by}` : ''} · {describeStamp(lastEvent.at)}
            {lastEvent.note ? ` — «${lastEvent.note}»` : ''}
          </p>
        )}

        {/* Acciones según el estado */}
        <div className="flex flex-wrap items-end gap-2">
          {(review.state === 'borrador' || review.state === 'devuelto') && !requesting && (
            <button
              type="button"
              onClick={() => setRequesting(true)}
              className={`${btn} text-white bg-neutral-900 hover:bg-neutral-700 dark:bg-neutral-600 dark:hover:bg-neutral-500`}
            >
              <Send className="w-3.5 h-3.5" />
              {review.state === 'devuelto' ? 'Volver a solicitar revisión' : 'Solicitar revisión'}
            </button>
          )}
          {requesting && (
            <form
              className="flex flex-wrap items-end gap-2 w-full"
              onSubmit={(e) => {
                e.preventDefault();
                if (!reviewer.trim()) return;
                onChangeReview(requestReview(data, reviewer, by, note));
                setRequesting(false);
                setNote('');
              }}
            >
              <label className="flex flex-col text-xs font-semibold text-neutral-700 dark:text-neutral-300 gap-1">
                ¿Quién lo revisa?
                <input
                  list="a3-revisores"
                  autoFocus
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  placeholder="Nombre del revisor"
                  className="w-56 px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
                <datalist id="a3-revisores">
                  {knownNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col text-xs font-semibold text-neutral-700 dark:text-neutral-300 gap-1 flex-1 min-w-[200px]">
                Mensaje (opcional)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="p. ej. «He corregido el objetivo según lo hablado»"
                  className="px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </label>
              <button
                type="submit"
                disabled={!reviewer.trim()}
                className={`${btn} text-white bg-neutral-900 hover:bg-neutral-700 dark:bg-neutral-600 dark:hover:bg-neutral-500`}
              >
                Enviar a revisión
              </button>
              <button
                type="button"
                onClick={() => setRequesting(false)}
                className={`${btn} text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800`}
              >
                Cancelar
              </button>
            </form>
          )}

          {review.state === 'en_revision' && (
            <>
              <button
                type="button"
                onClick={() => onChangeReview(decideReview(data, 'aprobado', by))}
                disabled={open.length > 0}
                title={open.length > 0 ? 'Hay comentarios pendientes: resuélvelos o devuelve el A3' : 'Aprobar el A3'}
                className={`${btn} text-white bg-emerald-600 hover:bg-emerald-700`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aprobar
              </button>
              <button
                type="button"
                onClick={() => onChangeReview(decideReview(data, 'devuelto', by))}
                disabled={open.length === 0}
                title={
                  open.length === 0
                    ? 'Añade al menos un comentario para devolverlo'
                    : 'Devolver al autor con los comentarios'
                }
                className={`${btn} text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800`}
              >
                <Undo2 className="w-3.5 h-3.5" />
                Devolver con comentarios
              </button>
              <button
                type="button"
                onClick={() => onChangeReview(reopenReview(data, by))}
                className={`${btn} text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800`}
              >
                Cancelar solicitud
              </button>
            </>
          )}

          {review.state === 'aprobado' && (
            <button
              type="button"
              onClick={() => onChangeReview(reopenReview(data, by))}
              className={`${btn} text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reabrir
            </button>
          )}
        </div>

        {/* Nuevo comentario */}
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitComment();
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Nuevo comentario sobre</span>
            <select
              value={commentStep}
              onChange={(e) => setCommentStep(Number(e.target.value))}
              aria-label="Apartado del comentario"
              className="px-2 py-1 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            >
              {Object.entries(STEP_NAMES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <textarea
            ref={textRef}
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submitComment();
              }
            }}
            aria-label="Texto del comentario"
            spellCheck
            lang="es"
            placeholder="Escribe el comentario (Ctrl+Intro para añadirlo)…"
            className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div>
            <button
              type="submit"
              disabled={!commentText.trim()}
              className={`${btn} text-white bg-neutral-800 hover:bg-neutral-900 dark:bg-neutral-700 dark:hover:bg-neutral-600`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Añadir comentario
            </button>
          </div>
        </form>

        {open.length > 0 && (
          <CommentList comments={open} onToggle={(id) => onChangeComments(toggleResolved(data, id, by))} />
        )}
        {resolved.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowResolved((v) => !v)}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
            >
              {showResolved ? 'Ocultar' : 'Ver'} {resolved.length} comentario(s) resuelto(s)
            </button>
            {showResolved && (
              <div className="mt-2">
                <CommentList comments={resolved} onToggle={(id) => onChangeComments(toggleResolved(data, id, by))} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
