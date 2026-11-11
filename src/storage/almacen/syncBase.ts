// Base de la fusión (lo último que este navegador sabe que había en el archivo).
// Se guarda en IndexedDB; las versiones anteriores la guardaban en localStorage
// y se migra la primera vez.
import { A3Project } from '../../types/lean';
import { loadBase, storeBase } from '../fileStore';
import { BASE_KEY, BASE_LM_KEY, lsGet, lsSet } from '../almacenShared';

export interface SyncBase {
  list: A3Project[];
  json: string;
  lastModified: number;
}

export async function restoreSyncBase(): Promise<SyncBase | null> {
  const legacy = lsGet(BASE_KEY);
  if (legacy) {
    const lastModified = Number(lsGet(BASE_LM_KEY)) || 0;
    lsSet(BASE_KEY, null);
    lsSet(BASE_LM_KEY, null);
    try {
      const list = JSON.parse(legacy) as A3Project[];
      await storeBase(legacy, lastModified);
      return { list, json: legacy, lastModified };
    } catch {
      /* base antigua ilegible: se prueba con la de IndexedDB */
    }
  }
  const b = await loadBase();
  if (!b) return null;
  try {
    return { list: JSON.parse(b.json) as A3Project[], json: b.json, lastModified: b.lm };
  } catch {
    return null; // ilegible: la fusión preguntará por el archivo entero
  }
}
