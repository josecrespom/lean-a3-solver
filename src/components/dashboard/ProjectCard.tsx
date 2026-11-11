import React from 'react';
import { A3Project } from '../../types/lean';
import { AlertTriangle, Building, Calendar, CheckCircle2, Copy, Download, Printer, Trash2, User } from 'lucide-react';
import { a3Progress, type A3Progress } from '../../utils/completeness';
import { describeStamp, formatDate } from '../../utils/dates';
import { indicatorStatus, withUnit } from '../../utils/indicator';
import { isOverdue } from '../../utils/actions';
import { openComments } from '../../utils/review';
import { IndicatorSparkline } from '../IndicatorChart';
import { ReviewBadge } from '../ReviewPanel';
import { Badge, type BadgeTone } from '../ui/Badge';

/** Descarga un A3 suelto como .json (para enviarlo a otra persona) */
const handleExportSingle = (p: A3Project, e: React.MouseEvent) => {
  e.stopPropagation();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify([p], null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `a3_${p.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
};

interface Props {
  p: A3Project;
  onEdit: (project: A3Project) => void;
  onDelete: (project: A3Project) => void;
  onDuplicate: (project: A3Project) => void;
  onPrint: (project: A3Project) => void;
}

/**
 * Tarjeta de un A3 en el almacén. Memorizada: al escribir en el buscador o
 * cambiar un filtro solo se vuelven a pintar las tarjetas que cambian.
 */
const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  abierto: { label: 'Abierto', tone: 'amber' },
  en_progreso: { label: 'En Progreso', tone: 'blue' },
  estandarizado: { label: 'Estandarizado', tone: 'green' },
};

/** Siguiente paso tras rellenar: la autoevaluación con los criterios de calidad */
export const ProgressPhase: React.FC<{ progress: A3Progress }> = ({ progress }) =>
  progress.phase === 'review' ? (
    <span
      className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400"
      title="Todo relleno: falta confirmar los criterios de calidad de cada paso"
      data-progress-phase="review"
    >
      <AlertTriangle className="w-3 h-3" />
      Falta autoevaluar ({progress.checked}/{progress.criteria})
    </span>
  ) : progress.phase === 'validated' ? (
    <span
      className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400"
      data-progress-phase="validated"
    >
      <CheckCircle2 className="w-3 h-3" />
      Validado
    </span>
  ) : null;

export const ProjectCard = React.memo(function ProjectCard({ p, onEdit, onDelete, onDuplicate, onPrint }: Props) {
  const statusConfig = STATUS_BADGE[p.status] || STATUS_BADGE.abierto;

  const progress = a3Progress(p);
  const indSt = indicatorStatus(p.indicator);
  const cardActions = (p.actionItems || []).filter((a) => a.action?.trim());
  const cardOverdue = cardActions.filter((a) => isOverdue(a)).length;
  const cardDone = cardActions.filter((a) => a.status === 'completed').length;

  return (
    <div
      onClick={() => onEdit(p)}
      className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden group hover:border-neutral-300 dark:hover:border-neutral-700"
    >
      <div className="p-5">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>
            <ReviewBadge project={p} />
            {openComments(p).length > 0 && (
              <span
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-400"
                title="Comentarios de revisión pendientes"
              >
                💬 {openComments(p).length}
              </span>
            )}
          </span>
          <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(p.date)}</span>
          </span>
        </div>

        {/* Title */}
        <h3
          title={p.background || p.currentCondition || undefined}
          className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors line-clamp-2 leading-snug"
        >
          {p.title || 'Problema sin título'}
        </h3>

        {/* Department / Owner */}
        <div className="mt-2.5 space-y-0.5 text-xs text-neutral-500 dark:text-neutral-400 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0" title={p.owner || undefined}>
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{p.owner || 'Sin asignar'}</span>
          </div>
          {p.department && (
            <div className="flex items-center gap-1.5 min-w-0" title={p.department}>
              <Building className="w-3 h-3 shrink-0" />
              <span className="truncate">{p.department}</span>
            </div>
          )}
        </div>

        {(p.updatedBy || p.updatedAt) && (
          <div className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            Modificado{p.updatedBy ? ` por ${p.updatedBy}` : ''}
            {p.updatedAt ? ` · ${describeStamp(p.updatedAt)}` : ''}
          </div>
        )}

        {/* Avance por pasos (1–7) */}
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-neutral-500 dark:text-neutral-400">
              Pasos{' '}
              <span className="font-bold text-neutral-800 dark:text-neutral-200 tabular-nums">
                {progress.done}/{progress.total}
              </span>
            </span>
            <ProgressPhase progress={progress} />
          </div>
          <div className="grid grid-cols-7 gap-0.5" data-step-strip>
            {progress.steps.map((st, i) => (
              <span
                key={i}
                title={`${st.name}: ${st.completed ? 'hecho' : 'pendiente'}`}
                data-done={st.completed || undefined}
                className={`h-5 rounded-sm text-[10px] font-bold flex items-center justify-center tabular-nums ${
                  st.completed
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>

        {/* Indicador frente a la meta */}
        {indSt.count > 0 && p.indicator ? (
          <div className="mt-3 flex items-center gap-3" data-card-indicator>
            <IndicatorSparkline indicator={p.indicator} />
            <div className="min-w-0 text-[11px] leading-tight">
              <div className="truncate text-neutral-500 dark:text-neutral-400">{p.indicator.name || 'Indicador'}</div>
              <div className="font-bold text-neutral-900 dark:text-white tabular-nums">
                {withUnit(indSt.last, p.indicator.unit)}
                {p.indicator.target != null && (
                  <span className="font-normal text-neutral-500 dark:text-neutral-400">
                    {' '}
                    → meta {p.indicator.direction === 'down' ? '≤' : '≥'}{' '}
                    {withUnit(p.indicator.target, p.indicator.unit)}
                  </span>
                )}
              </div>
              {indSt.met !== undefined && (
                <div className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
                  {indSt.met ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                  )}
                  {indSt.met ? 'Cumple la meta' : 'Aún no cumple'}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-400">Sin mediciones del indicador.</p>
        )}

        {/* Acciones */}
        {cardActions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-700 dark:text-neutral-300">
            {cardOverdue > 0 && (
              <span className="flex items-center gap-1 font-bold" data-card-overdue>
                <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                {cardOverdue} {cardOverdue === 1 ? 'acción vencida' : 'acciones vencidas'}
              </span>
            )}
            <span>
              {cardDone}/{cardActions.length} acciones hechas
            </span>
          </div>
        )}
      </div>

      {/* Acciones de la tarjeta: con texto; borrar, aparte */}
      <div className="bg-neutral-50 dark:bg-neutral-900/80 px-3 py-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-0.5">
          {(
            [
              ['Imprimir', Printer, 'Vista Previa e Imprimir DIN A3', () => onPrint(p)],
              ['Clonar', Copy, 'Duplicar o clonar este A3 como plantilla', () => onDuplicate(p)],
              ['Descargar', Download, 'Descargar archivo JSON', (e: React.MouseEvent) => handleExportSingle(p, e)],
            ] as const
          ).map(([label, Icon, title, fn]) => (
            <button
              key={label}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fn(e);
              }}
              title={title}
              className="px-2 py-1 font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-neutral-800 rounded transition-colors flex items-center gap-1"
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(p);
          }}
          title="Eliminar este A3"
          aria-label="Eliminar este A3"
          className="p-1.5 text-neutral-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});
