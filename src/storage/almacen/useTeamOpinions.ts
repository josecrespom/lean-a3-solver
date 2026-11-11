// Opiniones del equipo: viajan en el mismo archivo del almacén y se copian en localStorage.
import { useRef, useState } from 'react';
import { Opinion } from '../../types/lean';
import { mergeOpinions } from '../merge';
import { OPINIONS_KEY, json2, lsGet, lsSet } from '../almacenShared';

const load = (): Opinion[] => {
  try {
    const v = JSON.parse(lsGet(OPINIONS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export function useTeamOpinions() {
  const [opinions, setState] = useState<Opinion[]>(load);
  const opinionsRef = useRef(opinions);
  /** Opiniones tal como están en el archivo la última vez que se leyó o escribió */
  const syncedRef = useRef<string>(json2(opinions));
  /** Cambia cuando se añade o actualiza una opinión (para guardarla en el archivo) */
  const [version, setVersion] = useState(0);

  const set = (list: Opinion[]) => {
    opinionsRef.current = list;
    setState(list);
    lsSet(OPINIONS_KEY, JSON.stringify(list));
  };

  /** Incorpora las opiniones del archivo; devuelve si hay que volver a escribir */
  const absorb = (fromFile: Opinion[]) => {
    const merged = mergeOpinions(opinionsRef.current, fromFile);
    if (json2(merged) !== json2(opinionsRef.current)) set(merged);
    syncedRef.current = json2(fromFile);
    return json2(merged) !== json2(fromFile);
  };

  /** Lo que hay ahora es lo que se acaba de escribir en el archivo */
  const markWritten = (list: Opinion[]) => {
    syncedRef.current = json2(list);
  };

  const add = (o: Omit<Opinion, 'id' | 'at' | 'updatedAt' | 'status'>) => {
    const now = new Date().toISOString();
    set([
      {
        ...o,
        id: `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        at: now,
        updatedAt: now,
        status: 'nueva',
      },
      ...opinionsRef.current,
    ]);
    setVersion((v) => v + 1);
  };

  /** Cambia una opinión (estado, versiones, respuesta) y anota quién y cuándo */
  const update = (id: string, patch: Partial<Opinion>, by?: string) => {
    const now = new Date().toISOString();
    set(opinionsRef.current.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: now, updatedBy: by } : o)));
    setVersion((v) => v + 1);
  };

  /** ¿Hay opiniones locales que no están en el archivo? */
  const pending = () => json2(opinionsRef.current) !== syncedRef.current;

  /** ¿Son estas las opiniones que había en el archivo la última vez? */
  const matchesFile = (list: Opinion[]) => json2(list) === syncedRef.current;

  return { opinions, opinionsRef, version, absorb, markWritten, add, update, pending, matchesFile };
}
