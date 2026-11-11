import React, { useDeferredValue, useState } from 'react';
import { A3Project } from '../types/lean';
import { ProjectCard } from './dashboard/ProjectCard';
import { parseAlmacen } from '../storage/fileStore';
import { localDate } from '../utils/dates';
import { collectActions, daysUntil, isOverdue } from '../utils/actions';
import { TrashModal } from './TrashModal';
import { Plus, Search, FileText, Trash2, User, Building, Sparkles, X, Import, Upload } from 'lucide-react';
import { buttonClass } from './ui/Button';

/** A3 no estandarizado sin cambios en más de 30 días */
const isStale = (p: A3Project) => {
  if (p.status === 'estandarizado') return false;
  const d = daysUntil(p.updatedAt?.slice(0, 10), localDate());
  return d !== null && d < -30;
};

/* Estilos de la barra de filtros */
const chip = (active: boolean) =>
  `px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
    active
      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
  }`;
const count = (n: number, tone = 'text-neutral-500 dark:text-neutral-400') => (
  <span className={`tabular-nums font-bold ${tone}`}>{n}</span>
);
const toggle = (active: boolean) =>
  `px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
    active
      ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-600 dark:border-neutral-500'
      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500'
  }`;
const selectBox =
  'flex items-center gap-1 bg-white dark:bg-neutral-900 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700';

interface DashboardProps {
  projects: A3Project[];
  onCreate: () => void;
  onEdit: (project: A3Project) => void;
  onDelete: (project: A3Project) => void;
  onDuplicate: (project: A3Project) => void;
  onImport: (imported: A3Project[]) => void;
  onExportAll: () => void;
  onOpenActions?: (filter: 'open' | 'overdue') => void;
  userName?: string;
  trashed?: A3Project[];
  onRestore?: (id: string) => void;
  onPurge?: (id: string) => void;
  onLoadSample: () => void;
  onPrint: (project: A3Project) => void;
  onError?: (msg: string) => void;
  onOpenZipDownload?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  onCreate,
  onEdit,
  onDelete,
  onDuplicate,
  onImport,
  onExportAll,
  onOpenActions,
  userName = '',
  trashed = [],
  onRestore,
  onPurge,
  onLoadSample,
  onPrint,
  onError,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Con muchos A3, la lista se filtra sin bloquear lo que se escribe en el buscador
  const deferredSearch = useDeferredValue(searchTerm);
  const q = deferredSearch.toLowerCase();
  const [statusFilter, setStatusFilter] = useState<'all' | 'abierto' | 'en_progreso' | 'estandarizado'>('all');
  // Filtro rápido: solo A3 en revisión
  const [reviewOnly, setReviewOnly] = useState(false);
  // Filtro rápido: solo A3 sin actualizar en más de 30 días
  const [staleOnly, setStaleOnly] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  // Extract unique departments and owners for quick dropdown filters
  const uniqueDepartments = Array.from(
    new Set(projects.map((p) => p.department?.trim()).filter(Boolean))
  ).sort() as string[];

  const uniqueOwners = Array.from(new Set(projects.map((p) => p.owner?.trim()).filter(Boolean))).sort() as string[];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        onImport(parseAlmacen(event.target?.result as string));
      } catch {
        if (onError) {
          onError('El archivo seleccionado no tiene un formato JSON válido.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(q) ||
      (p.owner || '').toLowerCase().includes(q) ||
      (p.department || '').toLowerCase().includes(q) ||
      (p.background || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || p.department?.trim() === departmentFilter;
    const matchesOwner = ownerFilter === 'all' || p.owner?.trim() === ownerFilter;
    const matchesReview = !reviewOnly || p.review?.state === 'en_revision';
    const matchesStale = !staleOnly || isStale(p);
    return matchesSearch && matchesStatus && matchesDepartment && matchesOwner && matchesReview && matchesStale;
  });

  const hasActiveFilters =
    searchTerm !== '' ||
    statusFilter !== 'all' ||
    departmentFilter !== 'all' ||
    ownerFilter !== 'all' ||
    reviewOnly ||
    staleOnly;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setOwnerFilter('all');
    setReviewOnly(false);
    setStaleOnly(false);
  };

  const today = localDate();
  const actions = collectActions(projects);
  const overdue = actions.filter((r) => isOverdue(r.action, today)).length;
  const openActions = actions.filter((r) => r.action.status !== 'completed').length;
  const inReview = projects.filter((p) => p.review?.state === 'en_revision');
  const mineInReview = userName ? inReview.filter((p) => p.review?.reviewer === userName).length : 0;
  const staleCount = projects.filter(isStale).length;
  const byStatus = (st: A3Project['status']) => projects.filter((p) => p.status === st).length;

  // Filtros de estado con su recuento (hacen a la vez de indicadores)
  const statusChips: [typeof statusFilter, string, number][] = [
    ['all', 'Todos', projects.length],
    ['abierto', 'Abiertos', byStatus('abierto')],
    ['en_progreso', 'En progreso', byStatus('en_progreso')],
    ['estandarizado', 'Estandarizados', byStatus('estandarizado')],
  ];
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5">
      {/* Cabecera compacta: título y acciones */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            <span className="text-red-700 dark:text-red-400 font-bold">A3</span> · Resolución práctica de problemas
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Almacén de Problemas A3
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label
            title="Cargar A3 desde un archivo .json (exportado antes con esta app)"
            className={buttonClass('secondary', 'sm', 'cursor-pointer focus-within:ring-2 focus-within:ring-blue-500')}
          >
            <Import className="w-3.5 h-3.5" />
            <span>Importar A3</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="sr-only" />
          </label>
          <button
            type="button"
            onClick={onExportAll}
            title="Guardar todos los A3 en un archivo .json (copia o para pasarlos a otra persona)"
            className={buttonClass('secondary', 'sm')}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Exportar todo</span>
          </button>
          {trashed.length > 0 && (
            <button
              type="button"
              onClick={() => setIsTrashOpen(true)}
              className={buttonClass('secondary', 'sm')}
              title="A3 eliminados que aún se pueden restaurar"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Papelera ({trashed.length})</span>
            </button>
          )}
          <button type="button" onClick={onCreate} className={buttonClass('brand', 'sm')}>
            <Plus className="w-4 h-4" />
            <span>Nuevo Problema A3</span>
          </button>
        </div>
      </div>

      {/* Una sola barra: búsqueda, estados con recuento, avisos y filtros */}
      {projects.length > 0 && (
        <div
          className="mb-5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-2.5 flex flex-wrap items-center gap-2"
          aria-label="Filtros e indicadores del almacén"
        >
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título, líder o proceso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-lg focus:bg-white dark:focus:bg-neutral-800 focus:border-neutral-400 dark:focus:border-neutral-500 outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-0.5 p-0.5 bg-neutral-100 dark:bg-neutral-800/90 rounded-lg overflow-x-auto max-w-full">
            {statusChips.map(([value, label, n]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                aria-pressed={statusFilter === value}
                className={chip(statusFilter === value)}
              >
                {label} {count(n)}
              </button>
            ))}
          </div>

          {(inReview.length > 0 || reviewOnly) && (
            <button
              type="button"
              onClick={() => setReviewOnly((v) => !v)}
              aria-pressed={reviewOnly}
              className={toggle(reviewOnly)}
              title="Mostrar solo los A3 en revisión"
            >
              En revisión {count(inReview.length, reviewOnly ? '' : undefined)}
              {mineInReview > 0 && (
                <span className={reviewOnly ? '' : 'text-blue-700 dark:text-blue-400'}>· {mineInReview} para ti</span>
              )}
            </button>
          )}
          {(staleCount > 0 || staleOnly) && (
            <button
              type="button"
              onClick={() => setStaleOnly((v) => !v)}
              aria-pressed={staleOnly}
              className={toggle(staleOnly)}
              title="A3 no estandarizados sin cambios en más de 30 días"
            >
              Sin actualizar &gt; 30 días {count(staleCount, staleOnly ? '' : 'text-amber-700 dark:text-amber-400')}
            </button>
          )}
          {openActions > 0 && (
            <button
              type="button"
              onClick={() => onOpenActions?.(overdue ? 'overdue' : 'open')}
              className={toggle(false)}
              title="Ver el seguimiento de acciones"
            >
              {overdue > 0 ? (
                <>
                  Acciones vencidas {count(overdue, 'text-red-700 dark:text-red-400')}
                  <span className="font-normal text-neutral-500 dark:text-neutral-400">
                    de {openActions} pendientes
                  </span>
                </>
              ) : (
                <>Acciones pendientes {count(openActions)}</>
              )}
            </button>
          )}

          {uniqueDepartments.length > 1 && (
            <div className={selectBox}>
              <Building className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
              <select
                aria-label="Filtrar por área"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-transparent outline-none font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer text-xs max-w-[180px]"
              >
                <option value="all">Todas las áreas</option>
                {uniqueDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}
          {uniqueOwners.length > 1 && (
            <div className={selectBox}>
              <User className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
              <select
                aria-label="Filtrar por líder"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="bg-transparent outline-none font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer text-xs max-w-[180px]"
              >
                <option value="all">Todos los líderes</option>
                {uniqueOwners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-neutral-500 dark:text-neutral-400 text-[11px] tabular-nums">
                Mostrando {filteredProjects.length} de {projects.length} A3
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="px-2 py-0.5 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Limpiar filtros</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid of A3 Problems */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 p-12 text-center transition-colors">
          <FileText className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">No se encontraron problemas</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
            {searchTerm
              ? 'No hay ningún proyecto A3 que coincida con los criterios de búsqueda.'
              : 'Aún no has registrado ningún problema en este navegador.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button type="button" onClick={onCreate} className={buttonClass('brand', 'md')}>
              <Plus className="w-3.5 h-3.5" />
              <span>Crear nuevo informe A3</span>
            </button>
            <button type="button" onClick={onLoadSample} className={buttonClass('secondary', 'md')}>
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Cargar ejemplo completo</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.id}
              p={p}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onPrint={onPrint}
            />
          ))}
        </div>
      )}
      <TrashModal
        isOpen={isTrashOpen}
        items={trashed}
        days={30}
        onRestore={(id) => onRestore?.(id)}
        onPurge={(id) => onPurge?.(id)}
        onClose={() => setIsTrashOpen(false)}
      />
    </div>
  );
};
