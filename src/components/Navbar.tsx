import React from 'react';
import { BookOpen, FileText, Layers, ListChecks, MessageSquarePlus, Sun, Moon, UserRound } from 'lucide-react';
import { NotificationToggle } from './AttentionBanner';

interface NavbarProps {
  currentView: 'dashboard' | 'editor' | 'actions' | 'opinions';
  onNavigateActions?: () => void;
  overdueCount?: number;
  onNavigateDashboard: () => void;
  onNavigateEditor: () => void;
  onCreateNew: () => void;
  onOpenMethodology: () => void;
  projectTitle?: string;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  userName?: string;
  onEditUserName?: () => void;
  pendingReviews?: number;
  notificationsOn?: boolean;
  onEnableNotifications?: () => void;
  onOpenOpinions?: () => void;
  newOpinions?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigateDashboard,
  onNavigateActions,
  overdueCount = 0,
  onNavigateEditor,
  onOpenMethodology,
  projectTitle,
  darkMode = false,
  onToggleDarkMode,
  userName,
  onEditUserName,
  onOpenOpinions,
  newOpinions = 0,
  pendingReviews = 0,
  notificationsOn = false,
  onEnableNotifications,
}) => {
  return (
    <header className="no-print bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40 transition-colors">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3 md:gap-8">
        {/* Zone 1: Wordmark Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onNavigateDashboard}
            aria-label="Ir al Almacén de Problemas"
            className="flex items-center gap-2 cursor-pointer group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span
              className="bg-red-600 text-white font-extrabold text-xs px-2 py-0.5 rounded tracking-wider shadow-xs"
              title="Lean A3"
            >
              A3
            </span>
            <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors whitespace-nowrap">
              Lean A3 Solver
            </span>
            <span
              className="hidden sm:inline text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 tabular-nums"
              title="Versión de la aplicación"
            >
              v{__APP_VERSION__}
            </span>
          </button>
        </div>

        {/* Zone 2: Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <button
            type="button"
            onClick={onNavigateDashboard}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 py-1 ${
              currentView === 'dashboard'
                ? 'text-neutral-900 dark:text-white font-bold border-b-2 border-red-600'
                : 'hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Almacén de Problemas</span>
          </button>

          {onNavigateActions && (
            <button
              type="button"
              onClick={onNavigateActions}
              className={`whitespace-nowrap transition-colors flex items-center gap-1.5 py-1 ${
                currentView === 'actions'
                  ? 'text-neutral-900 dark:text-white font-bold border-b-2 border-red-600'
                  : 'hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>Acciones</span>
              {overdueCount > 0 && (
                <span
                  className="ml-0.5 min-w-[1.25rem] px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold text-center leading-none"
                  title={`${overdueCount} acciones vencidas`}
                >
                  {overdueCount}
                </span>
              )}
            </button>
          )}

          {projectTitle && (
            <button
              type="button"
              onClick={onNavigateEditor}
              className={`whitespace-nowrap transition-colors flex items-center gap-1.5 py-1 truncate max-w-[280px] ${
                currentView === 'editor'
                  ? 'text-neutral-900 dark:text-white font-bold border-b-2 border-red-600'
                  : 'hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <span>A3 en edición</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenMethodology}
            className="whitespace-nowrap hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 py-1"
          >
            <BookOpen className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <span>Guía Metodológica A3</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions & Dark Mode Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Persona que usa la app (autoría de los cambios) */}
          {onEditUserName && (
            <button
              type="button"
              onClick={onEditUserName}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors max-w-[180px]"
              title={userName ? 'Cambiar tu nombre' : 'Indica tu nombre para registrar quién modifica cada A3'}
              aria-label={userName ? `Tu nombre: ${userName} (cambiar)` : 'Indicar mi nombre'}
            >
              <UserRound className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
              <span className="hidden sm:inline truncate">{userName || 'Indicar mi nombre'}</span>
            </button>
          )}
          {onOpenOpinions && (
            <button
              type="button"
              onClick={onOpenOpinions}
              aria-current={currentView === 'opinions' ? 'page' : undefined}
              className={`relative flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors ${
                currentView === 'opinions' ? 'bg-neutral-100 dark:bg-neutral-800' : ''
              }`}
              title="Opiniones y mejoras: avisar de un fallo, proponer una mejora o plantear una duda, y ver su seguimiento"
              aria-label={newOpinions ? `Opiniones sobre la app (${newOpinions} nuevas)` : 'Opiniones sobre la app'}
            >
              <MessageSquarePlus className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span className="hidden lg:inline">Opiniones</span>
              {newOpinions > 0 && (
                <span className="min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {newOpinions}
                </span>
              )}
            </button>
          )}
          {onEnableNotifications && <NotificationToggle enabled={notificationsOn} onEnable={onEnableNotifications} />}
          {pendingReviews > 0 && (
            <button
              type="button"
              onClick={onNavigateDashboard}
              className="px-2 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold whitespace-nowrap"
              title="A3 pendientes de tu revisión"
            >
              {pendingReviews} por revisar
            </button>
          )}
          {/* Dark Mode Switch Button */}
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-amber-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-transparent dark:border-neutral-700/60 shadow-2xs"
              title={darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              aria-label="Alternar modo oscuro"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Móvil: navegación inferior (el menú superior no cabe) */}
      <nav
        aria-label="Navegación principal"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-t border-neutral-200 dark:border-neutral-800 grid grid-flow-col auto-cols-fr pb-[env(safe-area-inset-bottom)]"
      >
        {(
          [
            ['dashboard', 'Almacén', Layers, onNavigateDashboard, 0],
            ...(onNavigateActions
              ? ([['actions', 'Acciones', ListChecks, onNavigateActions, overdueCount]] as const)
              : []),
            ...(projectTitle ? ([['editor', 'A3', FileText, onNavigateEditor, 0]] as const) : []),
            ...(onOpenOpinions
              ? ([['opinions', 'Opiniones', MessageSquarePlus, onOpenOpinions, newOpinions]] as const)
              : []),
            ['guide', 'Guía', BookOpen, onOpenMethodology, 0],
          ] as const
        ).map(([key, label, Icon, go, badge]) => (
          <button
            key={key}
            type="button"
            onClick={go}
            aria-current={currentView === key ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
              currentView === key ? 'text-red-700 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
            {badge > 0 && (
              <span className="absolute top-1 left-1/2 ml-2 min-w-[1.1rem] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-4 text-center">
                {badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </header>
  );
};
