// Acciones sobre los A3 del almacén (guardar, papelera, duplicar, importar,
// restaurar versiones…) con sus avisos.
import React, { useState } from 'react';
import { A3Project, ActionItem } from '../types/lean';
import { localStamp } from '../utils/dates';
import { normalizeProject } from '../utils/normalize';
import {
  TRASH_DAYS,
  duplicateProject,
  importProjects,
  restoreProject,
  trashProject,
  updateAction,
  upsertProject,
} from '../utils/projectOps';
import { initialProjects } from '../data/defaultProjects';
import { saveVersion } from '../storage/history';
import type { Notify } from './useToasts';

interface Deps {
  projects: A3Project[];
  setProjects: React.Dispatch<React.SetStateAction<A3Project[]>>;
  author: () => string | undefined;
  notify: Notify;
  currentProject: A3Project | null;
  setCurrentProject: (p: A3Project | null) => void;
  reloadEditorWith: (p: A3Project) => void;
  /** El A3 abierto se ha ido a la papelera: volver al almacén */
  onCurrentTrashed: () => void;
}

export function useProjectActions({
  projects,
  setProjects,
  author,
  notify,
  currentProject,
  setCurrentProject,
  reloadEditorWith,
  onCurrentTrashed,
}: Deps) {
  const [projectToDelete, setProjectToDelete] = useState<A3Project | null>(null);

  const save = (edited: A3Project, isAutoSave = false) => {
    const updated: A3Project = {
      ...edited,
      updatedBy: author() ?? edited.updatedBy,
      createdBy: edited.createdBy ?? author(),
    };
    setProjects((prev) => upsertProject(prev, updated));
    setCurrentProject(updated);
    if (!isAutoSave) notify('Informe A3 guardado correctamente.', 'success');
  };

  /** Borrado suave: va a la papelera (se puede restaurar durante TRASH_DAYS días) */
  const confirmDelete = () => {
    if (!projectToDelete) return;
    const { id, title } = projectToDelete;
    setProjects((prev) => trashProject(prev, id, author()));
    if (currentProject?.id === id) onCurrentTrashed();
    setProjectToDelete(null);
    notify(`"${title}" se ha movido a la papelera. Puedes restaurarlo durante ${TRASH_DAYS} días.`, 'info');
  };

  const restore = (id: string) => {
    setProjects((prev) => restoreProject(prev, id, author()));
    notify('A3 restaurado.', 'success');
  };

  const purge = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    notify('A3 eliminado definitivamente.', 'info');
  };

  const duplicate = (project: A3Project) => {
    setProjects((prev) => [duplicateProject(project, author()), ...prev]);
    notify(`Copia de "${project.title}" creada en el almacén.`, 'success');
  };

  const importList = (importedList: A3Project[]) => {
    if (!Array.isArray(importedList) || importedList.length === 0) {
      notify('El archivo no contiene proyectos válidos.', 'error');
      return;
    }
    setProjects((prev) => importProjects(prev, importedList));
    notify(`Se importaron ${importedList.length} proyecto(s) A3 correctamente al almacén.`, 'success');
  };

  const loadSample = () => {
    // El aviso va fuera de setProjects: React puede ejecutar dos veces la función de actualización
    if (projects.some((p) => p.id === initialProjects[0].id)) {
      notify('El ejemplo completo ya está cargado en el almacén.', 'info');
      return;
    }
    setProjects((prev) => (prev.some((p) => p.id === initialProjects[0].id) ? prev : [initialProjects[0], ...prev]));
    notify('Ejemplo completo cargado con éxito.', 'success');
  };

  /** Cambiar una acción desde la vista de seguimiento */
  const updateActionItem = (projectId: string, actionId: string, patch: Partial<ActionItem>) =>
    setProjects((prev) => updateAction(prev, projectId, actionId, patch, author()));

  /** Restaurar una versión del historial (la actual también queda guardada) */
  const restoreVersion = (data: A3Project) => {
    const current = projects.find((p) => p.id === data.id);
    if (current) saveVersion(current);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { deletedAt, deletedBy, ...rest } = data;
    const restored: A3Project = {
      ...(normalizeProject(rest) ?? (rest as A3Project)),
      updatedAt: localStamp(),
      updatedBy: author() ?? data.updatedBy,
    };
    setProjects((prev) => prev.map((p) => (p.id === data.id ? restored : p)));
    if (currentProject?.id === data.id) reloadEditorWith(restored);
    notify('Versión restaurada.', 'success');
  };

  return {
    save,
    projectToDelete,
    requestDelete: setProjectToDelete,
    cancelDelete: () => setProjectToDelete(null),
    confirmDelete,
    restore,
    purge,
    duplicate,
    importList,
    loadSample,
    updateActionItem,
    restoreVersion,
  };
}
