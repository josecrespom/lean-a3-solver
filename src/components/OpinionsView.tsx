import React, { useState } from 'react';
import { CheckCircle2, Download, MessageSquarePlus, Search, Send } from 'lucide-react';
import { Opinion } from '../types/lean';
import { describeStamp, localDate } from '../utils/dates';
import {
  KIND_LABEL,
  OPINION_STATUSES,
  OPINION_STATUS_LABEL,
  doneByVersion,
  isDue,
  isOpenOpinion,
  opinionsToCsv,
  statusOf,
  statusPatch,
} from '../utils/opinions';
import { APP_VERSION } from '../utils/version';
import { saveFile } from '../utils/saveFile';
import { Badge, BadgeTone } from './ui/Badge';
import { buttonClass } from './ui/Button';
import { fieldClass } from './ui/fields';

interface Props {
  opinions: Opinion[];
  userName: string;
  /** Desde dónde se abrió (se anota en las opiniones nuevas) */
  where: string;
  /** ¿Se guardan en el almacén compartido? */
  shared: boolean;
  onAdd: (o: Pick<Opinion, 'kind' | 'text' | 'author' | 'where'>) => void;
  onUpdate: (id: string, patch: Partial<Opinion>) => void;
}

const KIND_TONE: Record<Opinion['kind'], BadgeTone> = { fallo: 'red', idea: 'blue', duda: 'amber' };
const STATUS_TONE: Record<Opinion['status'], BadgeTone> = {
  nueva: 'amber',
  vista: 'neutral',
  planificada: 'blue',
  hecha: 'green',
  descartada: 'neutral',
};
const KINDS: { value: Opinion['kind']; hint: string }[] = [
  { value: 'fallo', hint: 'Algo no funciona como debería' },
  { value: 'idea', hint: 'Una sugerencia o mejora' },
  { value: 'duda', hint: 'No sabes cómo hacer algo' },
];

type StatusFilter = 'abiertas' | 'todas' | Opinion['status'];

/** Campo de texto que guarda al salir de él (no en cada tecla: cada cambio se escribe en el almacén) */
const CommitField: React.FC<{
  label: string;
  value: string;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  onCommit: (v: string) => void;
}> = ({ label, value, placeholder, className, multiline, onCommit }) => {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  // Llega un valor nuevo de fuera (otra persona): se muestra
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }
  const commit = () => {
    if (draft.trim() !== value) onCommit(draft.trim());
  };
  const props = {
    'aria-label': label,
    value: draft,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
  };
  return multiline ? (
    <textarea {...props} rows={2} className={fieldClass('sm', `w-full resize-y ${className ?? ''}`)} />
  ) : (
    <input
      type="text"
      {...props}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      className={fieldClass('xs', className)}
    />
  );
};

const OpinionCard: React.FC<{ o: Opinion; onUpdate: Props['onUpdate'] }> = ({ o, onUpdate }) => {
  const st = statusOf(o);
  return (
    <li
      data-opinion={o.id}
      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Badge tone={KIND_TONE[o.kind]}>{KIND_LABEL[o.kind] ?? o.kind}</Badge>
        <Badge tone={STATUS_TONE[st]}>
          {OPINION_STATUS_LABEL[st]}
          {st === 'planificada' && o.plannedVersion ? ` para v${o.plannedVersion}` : ''}
          {st === 'hecha' && o.doneVersion ? ` en v${o.doneVersion}` : ''}
        </Badge>
        <span>
          {o.author || 'Anónimo'} · {describeStamp(o.at)}
          {o.where ? ` · ${o.where}` : ''}
        </span>
      </div>
      <p className="text-sm text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">{o.text}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
          Estado
          <select
            value={st}
            onChange={(e) => onUpdate(o.id, statusPatch(o, e.target.value as Opinion['status']))}
            className={fieldClass('xs', 'font-semibold')}
          >
            {OPINION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {OPINION_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        {(st === 'planificada' || st === 'hecha') && (
          <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
            {st === 'planificada' ? 'Para la versión' : 'Hecha en la versión'}
            <CommitField
              label={st === 'planificada' ? 'Versión prevista' : 'Versión en la que se hizo'}
              value={(st === 'planificada' ? o.plannedVersion : o.doneVersion) ?? ''}
              placeholder={APP_VERSION}
              className="w-24 tabular-nums"
              onCommit={(v) => onUpdate(o.id, st === 'planificada' ? { plannedVersion: v } : { doneVersion: v })}
            />
          </span>
        )}
        {isDue(o) && (
          <button
            type="button"
            onClick={() => onUpdate(o.id, statusPatch(o, 'hecha'))}
            className={buttonClass('secondary', 'xs')}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Marcar hecha en v{o.plannedVersion}
          </button>
        )}
      </div>
      <CommitField
        multiline
        label="Respuesta del equipo"
        value={o.response ?? ''}
        placeholder="Respuesta del equipo (opcional): cómo se resolvió, por qué se descarta…"
        onCommit={(v) => onUpdate(o.id, { response: v })}
      />
    </li>
  );
};

/** Opiniones del equipo sobre la app, con seguimiento hasta la versión que las incluye */
export const OpinionsView: React.FC<Props> = ({ opinions, userName, where, shared, onAdd, onUpdate }) => {
  const [kind, setKind] = useState<Opinion['kind']>('idea');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<StatusFilter>('abiertas');
  const [kindFilter, setKindFilter] = useState<'todas' | Opinion['kind']>('todas');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const visible = opinions.filter(
    (o) =>
      (status === 'todas' || (status === 'abiertas' ? isOpenOpinion(o) : statusOf(o) === status)) &&
      (kindFilter === 'todas' || o.kind === kindFilter) &&
      (!q || `${o.text} ${o.author ?? ''} ${o.response ?? ''}`.toLowerCase().includes(q))
  );
  const count = (s: Opinion['status']) => opinions.filter((o) => statusOf(o) === s).length;
  const due = opinions.filter((o) => isDue(o));
  const done = doneByVersion(opinions);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd({ kind, text: text.trim(), author: userName || undefined, where });
    setText('');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-red-600" />
            Opiniones y mejoras
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
            Fallos, mejoras y dudas sobre la app, con su seguimiento hasta la versión que los incluye.
            {shared ? '' : ' Sin almacén compartido, solo se guardan en este navegador.'}
          </p>
        </div>
        {opinions.length > 0 && (
          <button
            type="button"
            onClick={() =>
              void saveFile(`opiniones_A3_${localDate()}.csv`, opinionsToCsv(visible), 'text/csv;charset=utf-8')
            }
            className={buttonClass('secondary', 'sm')}
          >
            <Download className="w-3.5 h-3.5" />
            Exportar a Excel (CSV)
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-5 items-start">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          {/* Nueva opinión */}
          <form
            onSubmit={submit}
            aria-label="Nueva opinión"
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col gap-3"
          >
            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="sr-only">Tipo</legend>
              {KINDS.map((k) => (
                <label
                  key={k.value}
                  title={k.hint}
                  className={`px-3 py-1 rounded-full border text-xs font-semibold cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 ${
                    kind === k.value
                      ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                      : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipo-opinion"
                    value={k.value}
                    checked={kind === k.value}
                    onChange={() => setKind(k.value)}
                    className="sr-only"
                  />
                  {KIND_LABEL[k.value]}
                </label>
              ))}
            </fieldset>
            <textarea
              aria-label="Tu opinión"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              spellCheck
              lang="es"
              placeholder={
                kind === 'fallo'
                  ? 'Qué hiciste, qué esperabas y qué pasó…'
                  : kind === 'duda'
                    ? '¿Qué quieres hacer y dónde te atascas?'
                    : '¿Qué mejorarías y por qué?'
              }
              className={fieldClass('md', 'w-full resize-y')}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>
                Autor: {userName || 'anónimo'} · Escrita desde: {where}
              </span>
              <button type="submit" disabled={!text.trim()} className={buttonClass('primary', 'sm')}>
                <Send className="w-3.5 h-3.5" />
                Enviar
              </button>
            </div>
          </form>

          {due.length > 0 && (
            <p
              role="status"
              className="text-sm rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 px-4 py-2.5"
            >
              {due.length === 1 ? 'Hay 1 opinión planificada' : `Hay ${due.length} opiniones planificadas`} para esta
              versión (v{APP_VERSION}) o una anterior: si ya está incluida, márcala como hecha.
            </p>
          )}
        </aside>

        <div className="flex flex-col gap-4 min-w-0">
          {/* Filtros */}
          <section aria-label="Filtros" className="flex flex-wrap items-center gap-2">
            {(
              [
                ['abiertas', `Pendientes (${opinions.filter(isOpenOpinion).length})`],
                ['nueva', `Nuevas (${count('nueva')})`],
                ['vista', `En estudio (${count('vista')})`],
                ['planificada', `Planificadas (${count('planificada')})`],
                ['hecha', `Hechas (${count('hecha')})`],
                ['descartada', `Descartadas (${count('descartada')})`],
                ['todas', `Todas (${opinions.length})`],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={status === v}
                onClick={() => setStatus(v)}
                className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                  status === v
                    ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                    : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {label}
              </button>
            ))}
            <select
              aria-label="Tipo de opinión"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
              className={fieldClass('xs')}
            >
              <option value="todas">Todos los tipos</option>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {KIND_LABEL[k.value]}
                </option>
              ))}
            </select>
            <label className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2 text-neutral-400" aria-hidden />
              <input
                type="search"
                aria-label="Buscar en las opiniones"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className={fieldClass('xs', 'pl-7 w-44')}
              />
            </label>
          </section>

          {visible.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">No hay opiniones con estos filtros.</p>
          ) : (
            <ul className="flex flex-col gap-3" data-opinions>
              {visible.map((o) => (
                <OpinionCard key={o.id} o={o} onUpdate={onUpdate} />
              ))}
            </ul>
          )}

          {/* Lo que se ha hecho en cada versión */}
          {done.length > 0 && (
            <section aria-labelledby="hechas-por-version" className="flex flex-col gap-3">
              <h2
                id="hechas-por-version"
                className="text-sm font-bold uppercase text-neutral-500 dark:text-neutral-400"
              >
                Hechas por versión
              </h2>
              {done.map((g) => (
                <div
                  key={g.version}
                  data-version={g.version}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4"
                >
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-2">
                    {g.version === 'sin versión' ? 'Sin versión' : `v${g.version}`}
                    {g.version === APP_VERSION ? ' (esta versión)' : ''} · {g.items.length}
                  </h3>
                  <ul className="flex flex-col gap-1.5 text-sm text-neutral-800 dark:text-neutral-200">
                    {g.items.map((o) => (
                      <li key={o.id} className="flex items-start gap-2">
                        <Badge tone={KIND_TONE[o.kind]}>{KIND_LABEL[o.kind] ?? o.kind}</Badge>
                        <span>{o.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
