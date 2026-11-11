// Flujo de revisión de un A3: borrador → en revisión → aprobado / devuelto.
// Todas las funciones son puras: devuelven los campos a guardar en el A3.
import { A3Project, A3Review, ReviewComment, ReviewEvent, ReviewState } from '../types/lean';
import { localStamp } from './dates';

export const REVIEW_LABEL: Record<ReviewState, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  devuelto: 'Devuelto con comentarios',
  aprobado: 'Aprobado',
};

export const reviewOf = (p: A3Project): A3Review => p.review ?? { state: 'borrador' };

export const openComments = (p: A3Project, step?: number): ReviewComment[] =>
  (p.comments || []).filter((c) => !c.resolved && (step === undefined || c.step === step));

/** Huella del contenido del A3 (sin revisión, comentarios ni registro de modificación). */
export function contentHash(p: A3Project): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { review, comments, updatedAt, updatedBy, ...content } = p;
  const text = JSON.stringify(content);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** ¿Se ha modificado el contenido después de aprobarse? */
export const changedAfterApproval = (p: A3Project): boolean => {
  const r = p.review;
  return Boolean(r?.state === 'aprobado' && r.approvedHash && r.approvedHash !== contentHash(p));
};

const withEvent = (r: A3Review, ev: ReviewEvent): ReviewEvent[] => [...(r.history || []), ev];

export function requestReview(p: A3Project, reviewer: string, by?: string, note?: string): A3Review {
  const r = reviewOf(p);
  const at = localStamp();
  return {
    ...r,
    state: 'en_revision',
    reviewer: reviewer.trim(),
    requestedBy: by,
    requestedAt: at,
    decidedBy: undefined,
    decidedAt: undefined,
    history: withEvent(r, { at, by, action: 'solicitada', note: note?.trim() || undefined }),
  };
}

export function decideReview(p: A3Project, decision: 'aprobado' | 'devuelto', by?: string, note?: string): A3Review {
  const r = reviewOf(p);
  const at = localStamp();
  return {
    ...r,
    state: decision,
    decidedBy: by,
    decidedAt: at,
    approvedHash: decision === 'aprobado' ? contentHash(p) : undefined,
    history: withEvent(r, {
      at,
      by,
      action: decision === 'aprobado' ? 'aprobada' : 'devuelta',
      note: note?.trim() || undefined,
    }),
  };
}

export function reopenReview(p: A3Project, by?: string): A3Review {
  const r = reviewOf(p);
  return { ...r, state: 'borrador', history: withEvent(r, { at: localStamp(), by, action: 'reabierta' }) };
}

export function addComment(p: A3Project, step: number, text: string, by?: string): ReviewComment[] {
  const comment: ReviewComment = {
    id: `c-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    step,
    author: by,
    at: localStamp(),
    text: text.trim(),
  };
  return [...(p.comments || []), comment];
}

export function toggleResolved(p: A3Project, id: string, by?: string): ReviewComment[] {
  return (p.comments || []).map((c) =>
    c.id === id ? { ...c, resolved: !c.resolved, resolvedBy: !c.resolved ? by : undefined } : c
  );
}

export const STEP_NAMES: Record<number, string> = {
  0: 'General',
  1: 'Paso 1 · Contexto',
  2: 'Paso 2 · Situación actual',
  3: 'Paso 3 · Objetivo',
  4: 'Paso 4 · Causa raíz',
  5: 'Paso 5 · Contramedidas',
  6: 'Paso 6 · Verificación',
  7: 'Paso 7 · Yokoten',
};
