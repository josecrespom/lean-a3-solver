import { useState, useEffect } from 'react';
import { localDate, localStamp } from './utils/dates';
import { useTheme } from './hooks/useTheme';
import { useLocalProjects } from './hooks/useLocalProjects';
import { TRASH_DAYS, knownNamesOf } from './utils/projectOps';
import { A3Project } from './types/lean';
import { initialProjects, emptyProjectTemplate } from './data/defaultProjects';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { A3Editor } from './components/A3Editor';
import { MethodologyModal } from './components/MethodologyModal';
import { A3PrintModal } from './components/A3PrintModal';
import { A3PrintSheet } from './components/A3PrintSheet';
import { ConfirmModal } from './components/ConfirmModal';
import { Toast } from './components/Toast';
import { useToasts } from './hooks/useToasts';
import { useUserIdentity } from './hooks/useUserIdentity';
import { useOpenEditor } from './hooks/useOpenEditor';
import { useProjectActions } from './hooks/useProjectActions';
import { StorageBar, StorageConflictModal } from './components/StorageBar';
import { BackupsModal } from './components/BackupsModal';
import { ErrorBoundary, ErrorProbe } from './components/ErrorBoundary';
import { OpinionsView } from './components/OpinionsView';
import { useAlmacenArchivo } from './storage/useAlmacenArchivo';
import { UserNameModal } from './components/UserNameModal';
import { WelcomeModal } from './components/WelcomeModal';
import { ActionsView } from './components/ActionsView';
import { HistoryModal } from './components/HistoryModal';
import { AttentionBanner } from './components/AttentionBanner';
import { useReviewAlerts } from './utils/useReviewAlerts';
import { collectActions, isOverdue, isOwner } from './utils/actions';

export default function App() {
  const { darkMode, toggleDarkMode } = useTheme();
  const { toasts, addToast, removeToast } = useToasts();
  const [projects, setProjects] = useLocalProjects(() =>
    addToast(
      'El navegador no tiene espacio para la copia local de los A3. Si tienes un almacén en archivo, se sigue guardando ahí; si no, descarga una copia.',
      'error'
    )
  );
  const user = useUserIdentity();
  const { userName, author, askNameOnce } = user;

  const [view, setView] = useState<'dashboard' | 'editor' | 'actions' | 'opinions'>('dashboard');
  // Desde dónde se abrieron las opiniones (se anota en las nuevas)
  const [opinionFrom, setOpinionFrom] = useState('Almacén');
  const [actionsFilter, setActionsFilter] = useState<'open' | 'overdue'>('open');
  const [actionsMine, setActionsMine] = useState(false);
  // Los A3 nuevos se abren en Modo Asistente (paso a paso); los existentes, en la lámina
  const [openGuided, setOpenGuided] = useState(false);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [isBackupsOpen, setIsBackupsOpen] = useState(false);
  const [printModalProject, setPrintModalProject] = useState<A3Project | null>(null);
  const [historyFor, setHistoryFor] = useState<A3Project | null>(null);

  // Almacén en archivo (carpeta local o compartida) además de la caché del navegador
  const almacen = useAlmacenArchivo(projects, setProjects, addToast);

  // A3 visibles (los eliminados quedan en la papelera hasta 30 días)
  const activeProjects = projects.filter((p) => !p.deletedAt);
  const trashedProjects = projects.filter((p) => p.deletedAt);

  const editor = useOpenEditor(projects, almacen.externalChange);
  const { currentProject, setCurrentProject, editorProject } = editor;

  const actions = useProjectActions({
    projects,
    setProjects,
    author,
    notify: addToast,
    currentProject,
    setCurrentProject,
    reloadEditorWith: editor.reloadWith,
    onCurrentTrashed: () => {
      setCurrentProject(null);
      setView('dashboard');
    },
  });

  // Avisar al cerrar la pestaña si quedan cambios por escribir en el archivo
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (almacen.hasUnsyncedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [almacen]);

  const handleCreateNew = () => {
    const newProj: A3Project = {
      ...emptyProjectTemplate,
      id: `a3-${Date.now()}`,
      title: 'Nuevo Problema A3',
      date: localDate(),
      updatedAt: localStamp(),
      createdBy: author(),
      updatedBy: author(),
    };
    setCurrentProject(newProj);
    setOpenGuided(true);
    setView('editor');
    askNameOnce();
    addToast('Nuevo informe A3 creado.', 'info');
  };

  const handleEdit = (project: A3Project) => {
    setCurrentProject(project);
    setOpenGuided(false);
    setView('editor');
    askNameOnce();
  };

  const openActions = (filter: 'open' | 'overdue' = 'open', mine = false) => {
    setActionsFilter(filter);
    setActionsMine(mine);
    setView('actions');
  };

  const overdueRows = collectActions(activeProjects).filter((r) => isOverdue(r.action));
  const overdueCount = overdueRows.length;

  // Nombres conocidos (para proponer revisor) y A3 pendientes de mi revisión
  const knownNames = knownNamesOf(activeProjects);
  // Avisos de revisión: A3 por revisar y A3 devueltos (banner, título y notificaciones)
  const alerts = useReviewAlerts(activeProjects, userName, addToast);
  const pendingMyReview = alerts.toReview.length;
  const myOverdueCount = userName ? overdueRows.filter((r) => isOwner(r.action.owner, userName)).length : 0;

  const handleOpenPrint = (proj?: A3Project) => {
    const target = proj || currentProject || projects[0];
    if (target) {
      setPrintModalProject(target);
    }
  };

  const activeProjectForPrint = printModalProject || currentProject || projects[0] || initialProjects[0];

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col text-neutral-800 dark:text-neutral-100 transition-colors">
      {/* Native Print Output (Activated during window.print()) */}
      <div className="print-only hidden print:block">
        <A3PrintSheet project={activeProjectForPrint} />
      </div>

      {/* Screen Interactive App */}
      <div className="screen-only print:hidden flex-1 flex flex-col">
        {/* Universal Top Bar */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-blue-600 focus:text-white focus:text-sm focus:font-bold"
        >
          Saltar al contenido
        </a>
        <Navbar
          currentView={view}
          onNavigateDashboard={() => setView('dashboard')}
          onNavigateActions={() => openActions('open')}
          overdueCount={overdueCount}
          onNavigateEditor={() => {
            if (currentProject) setView('editor');
          }}
          onCreateNew={handleCreateNew}
          onOpenMethodology={() => setIsMethodologyOpen(true)}
          projectTitle={currentProject?.title}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          userName={userName}
          onEditUserName={user.openUserModal}
          onOpenOpinions={() => {
            if (view !== 'opinions')
              setOpinionFrom(
                view === 'editor' && currentProject
                  ? `A3: ${currentProject.title || 'sin título'}`
                  : view === 'actions'
                    ? 'Acciones'
                    : 'Almacén'
              );
            setView('opinions');
          }}
          newOpinions={almacen.opinions.filter((o) => o.status === 'nueva').length}
          pendingReviews={pendingMyReview}
          notificationsOn={alerts.notificationsOn}
          onEnableNotifications={alerts.enableNotifications}
        />

        <StorageBar
          status={almacen.status}
          fileName={almacen.fileName}
          lastSavedAt={almacen.lastSavedAt}
          errorMsg={almacen.errorMsg}
          lastBackup={almacen.lastBackup}
          changedSinceBackup={almacen.changedSinceBackup}
          onCreateFile={almacen.createFile}
          onOpenFile={almacen.openFile}
          onReconnect={almacen.reconnect}
          onRetry={almacen.retry}
          onDisconnect={almacen.disconnect}
          onExportBackup={almacen.exportBackup}
          onShowBackups={() => setIsBackupsOpen(true)}
          onOverwriteDamaged={almacen.overwriteDamaged}
        />

        {almacen.newerVersion && (
          <div role="alert" className="no-print bg-red-600 text-white border-b border-red-700 dark:bg-red-800">
            <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-2.5 text-sm font-semibold">
              Estás usando una versión antigua de la app (v{__APP_VERSION__}). El almacén «{almacen.fileName}» ya lo ha
              guardado la v{almacen.newerVersion}. Esta copia no guardará nada en él: cierra esta ventana y abre la
              versión más reciente (normalmente, la de la carpeta compartida).
            </div>
          </div>
        )}

        <AttentionBanner
          toReview={alerts.toReview}
          returned={alerts.returned}
          currentId={view === 'editor' ? currentProject?.id : undefined}
          onOpen={handleEdit}
          myOverdue={view === 'actions' && actionsMine ? 0 : myOverdueCount}
          onOpenMyActions={() => openActions('overdue', true)}
        />

        {/* Main View Router */}
        <main id="contenido" tabIndex={-1} className="flex-1 outline-none pb-16 md:pb-0">
          <ErrorBoundary
            key={`${view}-${currentProject?.id ?? ''}`}
            onReset={() => {
              setCurrentProject(null);
              setView('dashboard');
            }}
            resetLabel="Volver al almacén"
          >
            <ErrorProbe />
            {view === 'dashboard' && (
              <Dashboard
                projects={activeProjects}
                onCreate={handleCreateNew}
                onEdit={handleEdit}
                onDelete={actions.requestDelete}
                onDuplicate={actions.duplicate}
                onImport={actions.importList}
                onExportAll={almacen.exportBackup}
                onOpenActions={openActions}
                userName={userName}
                trashed={trashedProjects}
                onRestore={actions.restore}
                onPurge={actions.purge}
                onLoadSample={actions.loadSample}
                onPrint={(p) => handleOpenPrint(p)}
                onError={(msg) => addToast(msg, 'error')}
              />
            )}

            {view === 'opinions' && (
              <OpinionsView
                opinions={almacen.opinions}
                userName={userName}
                where={opinionFrom}
                shared={almacen.status === 'connected'}
                onAdd={(o) => {
                  almacen.addOpinion(o);
                  addToast('Gracias. Tu opinión se ha guardado.', 'success');
                }}
                onUpdate={(id, patch) => almacen.updateOpinion(id, patch, userName || undefined)}
              />
            )}
            {view === 'actions' && (
              <ActionsView
                key={`${actionsFilter}-${actionsMine}`}
                projects={activeProjects}
                initialFilter={actionsFilter}
                userName={userName}
                initialMine={actionsMine}
                onOpenProject={handleEdit}
                onUpdateAction={actions.updateActionItem}
              />
            )}

            {view === 'editor' && editorProject && (
              <A3Editor
                key={`${editorProject.id}-${editor.editorEpoch}`}
                project={editorProject}
                initialMode={openGuided ? 'guided' : 'sheet'}
                externalRevision={editor.editorSync}
                userName={userName}
                knownNames={knownNames}
                onShowHistory={() => setHistoryFor(editorProject)}
                onSave={(updated, isAutoSave) => {
                  if (isAutoSave && editor.isDiscarding()) return;
                  actions.save(updated, isAutoSave);
                }}
                onCancel={() => setView('dashboard')}
                onPrint={() => handleOpenPrint(editorProject)}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Methodology Guide Modal */}
      <MethodologyModal isOpen={isMethodologyOpen} onClose={() => setIsMethodologyOpen(false)} />

      {/* Dedicated A3 Print Preview & Printing Modal */}
      {printModalProject && (
        <A3PrintModal
          isOpen={Boolean(printModalProject)}
          project={printModalProject}
          onClose={() => setPrintModalProject(null)}
        />
      )}

      {/* In-App Delete Confirmation Modal (Replaces blocked window.confirm) */}
      <ConfirmModal
        isOpen={Boolean(actions.projectToDelete)}
        title="Eliminar Informe A3"
        message={`El informe "${actions.projectToDelete?.title || 'este problema'}" se moverá a la papelera. Se podrá restaurar durante ${TRASH_DAYS} días; después se borrará definitivamente.`}
        confirmText="Mover a la papelera"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={actions.confirmDelete}
        onCancel={actions.cancelDelete}
      />

      <WelcomeModal
        isOpen={user.showWelcome}
        initialName={userName}
        fileSupported={almacen.status !== 'unsupported'}
        connectedFileName={almacen.status === 'connected' ? almacen.fileName : ''}
        onSaveName={user.setUserName}
        onCreateFile={almacen.createFile}
        onOpenFile={almacen.openFile}
        onCreateA3={() => {
          user.closeWelcome();
          handleCreateNew();
        }}
        onOpenSample={() => {
          user.closeWelcome();
          const sample = activeProjects.find((p) => p.id === initialProjects[0].id);
          if (sample) handleEdit(sample);
          else actions.loadSample();
        }}
        onClose={user.closeWelcome}
      />

      {user.isUserModalOpen && (
        <UserNameModal
          isOpen
          initialName={userName}
          onSave={(name) => {
            user.setUserName(name);
            user.closeUserModal();
          }}
          onSkip={user.closeUserModal}
        />
      )}

      <HistoryModal
        key={historyFor?.id ?? 'ninguno'}
        project={historyFor}
        onRestore={(d) => {
          actions.restoreVersion(d);
          setHistoryFor(null);
        }}
        onClose={() => setHistoryFor(null)}
      />

      {/* Conflictos entre el archivo del almacén y este navegador */}
      <StorageConflictModal conflict={almacen.conflict} />
      {isBackupsOpen && (
        <BackupsModal
          isOpen
          onClose={() => setIsBackupsOpen(false)}
          projects={projects}
          lastDownload={almacen.lastBackup}
          onDownloadNow={almacen.exportBackup}
          onRestore={almacen.restoreBackup}
          notify={addToast}
        />
      )}

      {/* Non-intrusive Toast Notifications (Replaces blocked window.alert) */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
