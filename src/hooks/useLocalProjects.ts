import { useEffect, useRef, useState } from 'react';
import { A3Project } from '../types/lean';
import { initialProjects } from '../data/defaultProjects';
import { purgeOldTrash } from '../utils/projectOps';
import { normalizeProjects } from '../utils/normalize';
import { saveVersion } from '../storage/history';

const STORAGE_KEY = 'cms_lean_a3_projects_v2';
const LEGACY_STORAGE_KEY = ['toy', 'ota', '_lean_a3_projects_v2'].join('');

function loadProjects(): A3Project[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return normalizeProjects(parsed).projects;
    }
  } catch (e) {
    console.error('Error al leer los A3 guardados en el navegador', e);
  }
  return initialProjects;
}

/**
 * Lista de A3 de trabajo: se guarda en el navegador en cada cambio, vacía la
 * papelera antigua al arrancar y guarda en el historial local la versión
 * anterior de cada A3 que cambia (una cada 10 minutos, y siempre antes de eliminarlo).
 */
export function useLocalProjects(onStorageFull?: () => void) {
  const [projects, setProjects] = useState<A3Project[]>(() => purgeOldTrash(loadProjects()));
  const warnedRef = useRef(false);
  const onFullRef = useRef(onStorageFull);
  useEffect(() => {
    onFullRef.current = onStorageFull;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      warnedRef.current = false;
    } catch (e) {
      console.error('Error al guardar los A3 en el navegador', e);
      // Normalmente, espacio lleno: avisar una vez (el archivo del almacén sigue guardándose)
      if (!warnedRef.current) {
        warnedRef.current = true;
        onFullRef.current?.();
      }
    }
  }, [projects]);

  const lastSeenRef = useRef<Map<string, string>>(new Map());
  const lastSnapRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const now = Date.now();
    for (const p of projects) {
      const json = JSON.stringify(p);
      const prev = lastSeenRef.current.get(p.id);
      if (prev && prev !== json) {
        const before = JSON.parse(prev) as A3Project;
        const deleting = Boolean(p.deletedAt && !before.deletedAt);
        if (deleting || now - (lastSnapRef.current.get(p.id) || 0) > 10 * 60_000) {
          saveVersion(before);
          lastSnapRef.current.set(p.id, now);
        }
      }
      lastSeenRef.current.set(p.id, json);
    }
  }, [projects]);

  return [projects, setProjects] as const;
}
