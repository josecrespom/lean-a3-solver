import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Download, ListChecks, Search } from 'lucide-react';
import { A3Project, ActionItem } from '../types/lean';
import { actionsToCsv, collectActions, daysUntil, isOverdue, isOwner, STATUS_LABEL } from '../utils/actions';
import { localDate } from '../utils/dates';
import { buttonClass } from './ui/Button';
import { saveFile } from '../utils/saveFile';

interface ActionsViewProps {
  projects: A3Project[];
  onOpenProject: (p: A3Project) => void;
  onUpdateAction: (projectId: string, actionId: string, patch: Partial<ActionItem>) => void;
  /** Filtro inicial (p. ej. al llegar desde «acciones vencidas» del almacén) */
  initialFilter?: 'open' | 'overdue';
  /** Nombre de quien usa la app (para el filtro «Mis acciones») */
  userName?: string;
  /** Empezar mostrando solo mis acciones */
  initialMine?: boolean;
}

type StatusFilter = 'open' | 'overdue' | 'week' | 'completed' | 'all';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'open', label: 'Pendientes' },
  { id: 'overdue', label: 'Vencidas' },
  { id: 'week', label: 'Vencen en 7 días' },
  { id: 'completed', label: 'Hechas' },
  { id: 'all', label: 'Todas' },
];

function DueLabel({ action }: { action: ActionItem }) {
  const d = daysUntil(action.dueDate);
  const [y, m, day] = (action.dueDate || '').split('-');
  const date = y ? `${day}/${m}/${y}` : 'Sin fecha';
  if (action.status === 'completed' || d === null) {
    return <span className="text-neutral-600 dark:text-neutral-300">{date}</span>;
  }
  const late = d < 0;
  const soon = d >= 0 && d <= 7;
  return (
    <span className="flex flex-col leading-tight">
      <span className={late ? 'font-bold text-red-700 dark:text-red-400' : 'text-neutral-800 dark:text-neutral-200'}>
        {date}
      </span>
      <span
        className={`text-[11px] ${
          late
            ? 'text-red-700 dark:text-red-400 font-semibold'
            : soon
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-neutral-500 dark:text-neutral-400'
        }`}
      >
        {late
          ? `vencida hace ${-d} ${-d === 1 ? 'día' : 'días'}`
          : d === 0
            ? 'vence hoy'
            : `en ${d} ${d === 1 ? 'día' : 'días'}`}
      </span>
    </span>
  );
}

export const ActionsView: React.FC<ActionsViewProps> = ({
  projects,
  onOpenProject,
  onUpdateAction,
  initialFilter = 'open',
  userName = '',
  initialMine = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter);
  const [owner, setOwner] = useState<string>(initialMine && userName ? '__mine__' : 'all');
  const [search, setSearch] = useState('');

  const today = localDate();
  const all = useMemo(() => collectActions(projects), [projects]);
  const owners = useMemo(
    () => Array.from(new Set(all.map((r) => r.action.owner?.trim()).filter(Boolean))).sort() as string[],
    [all]
  );

  const counts = useMemo(() => {
    const open = all.filter((r) => r.action.status !== 'completed');
    return {
      open: open.length,
      overdue: open.filter((r) => isOverdue(r.action, today)).length,
      week: open.filter((r) => {
        const d = daysUntil(r.action.dueDate, today);
        return d !== null && d >= 0 && d <= 7;
      }).length,
      completed: all.length - open.length,
    };
  }, [all, today]);

  const rows = all.filter(({ project, action }) => {
    const d = daysUntil(action.dueDate, today);
    const statusOk =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && action.status === 'completed') ||
      (statusFilter === 'open' && action.status !== 'completed') ||
      (statusFilter === 'overdue' && isOverdue(action, today)) ||
      (statusFilter === 'week' && action.status !== 'completed' && d !== null && d >= 0 && d <= 7);
    const ownerOk =
      owner === 'all' || (owner === '__mine__' ? isOwner(action.owner, userName) : action.owner?.trim() === owner);
    const q = search.trim().toLowerCase();
    const searchOk =
      !q || [action.action, action.owner, project.title, project.department].some((v) => v?.toLowerCase().includes(q));
    return statusOk && ownerOk && searchOk;
  });

  const exportCsv = () => {
    void saveFile(`acciones_A3_${today}.csv`, actionsToCsv(rows), 'text/csv;charset=utf-8');
  };

  const card = (label: string, value: number, icon: React.ReactNode, tone: string, filter: StatusFilter) => (
    <button
      type="button"
      onClick={() => setStatusFilter(filter)}
      className={`text-left p-4 rounded-xl border transition-colors ${
        statusFilter === filter ? 'ring-2 ring-blue-500 ' : ''
      }bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-2xl font-extrabold tabular-nums ${tone}`}>{value}</div>
    </button>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Seguimiento de acciones
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
            Todas las contramedidas de todos los A3, ordenadas por plazo.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={rows.length === 0}
          className={buttonClass('secondary', 'sm', 'self-start md:self-auto')}
          title="Descargar la lista filtrada para abrirla en Excel"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar a Excel (CSV)
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {card(
          'Pendientes',
          counts.open,
          <ListChecks className="w-4 h-4" />,
          'text-neutral-900 dark:text-white',
          'open'
        )}
        {card(
          'Vencidas',
          counts.overdue,
          <AlertTriangle className="w-4 h-4" />,
          counts.overdue ? 'text-red-700 dark:text-red-400' : 'text-neutral-900 dark:text-white',
          'overdue'
        )}
        {card(
          'Vencen en 7 días',
          counts.week,
          <CalendarClock className="w-4 h-4" />,
          counts.week ? 'text-amber-700 dark:text-amber-400' : 'text-neutral-900 dark:text-white',
          'week'
        )}
        {card(
          'Hechas',
          counts.completed,
          <CheckCircle2 className="w-4 h-4" />,
          'text-emerald-700 dark:text-emerald-400',
          'completed'
        )}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar acción, responsable o A3…"
              aria-label="Buscar acciones"
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            aria-label="Filtrar por responsable"
            className="px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          >
            <option value="all">Todos los responsables</option>
            {userName && <option value="__mine__">Mis acciones ({userName})</option>}
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === f.id
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {all.length === 0
              ? 'Todavía no hay acciones en ningún A3. Se añaden en el paso 5 (Contramedidas) de cada A3.'
              : 'Ninguna acción coincide con los filtros.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="px-4 py-2.5 font-semibold w-[38%]">Acción</th>
                  <th className="px-4 py-2.5 font-semibold">Responsable</th>
                  <th className="px-4 py-2.5 font-semibold">Plazo</th>
                  <th className="px-4 py-2.5 font-semibold">Estado</th>
                  <th className="px-4 py-2.5 font-semibold w-[24%]">A3</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ project, action }) => (
                  <tr
                    key={`${project.id}-${action.id}`}
                    className={`align-top border-b border-neutral-100 dark:border-neutral-800 last:border-0 ${
                      isOverdue(action, today) ? 'bg-red-50/60 dark:bg-red-950/20' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 text-neutral-900 dark:text-neutral-100 font-medium">{action.action}</td>
                    <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300">{action.owner || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <DueLabel action={action} />
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={action.status}
                        aria-label={`Estado de «${action.action}»`}
                        onChange={(e) =>
                          onUpdateAction(project.id, action.id, { status: e.target.value as ActionItem['status'] })
                        }
                        className={`text-xs font-bold rounded-md border px-2 py-1 bg-white dark:bg-neutral-800 ${
                          action.status === 'completed'
                            ? 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                            : action.status === 'in_progress'
                              ? 'text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                              : 'text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {(Object.keys(STATUS_LABEL) as ActionItem['status'][]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenProject(project)}
                        className="text-left text-blue-700 dark:text-blue-400 hover:underline font-medium leading-snug"
                        title="Abrir este A3"
                      >
                        {project.title || 'A3 sin título'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
