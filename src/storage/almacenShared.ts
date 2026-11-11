// Tipos, claves de localStorage y ayudas comunes del almacén en archivo.
import { A3Project, Opinion } from '../types/lean';

export type AlmacenStatus =
  | 'loading'
  | 'unsupported' // navegador sin acceso a archivos (Firefox, Safari)
  | 'none' // sin archivo vinculado: datos solo en este navegador
  | 'reconnect' // archivo vinculado, falta permiso tras reabrir la app
  | 'connected'
  | 'conflict'
  | 'damaged' // el archivo no se puede leer: no se toca hasta que el usuario decida
  | 'outdated' // el archivo es de una versión más nueva de la app: solo lectura
  | 'error';

export interface ConflictOption {
  label: string;
  description?: string;
  primary?: boolean;
  action: () => void | Promise<void>;
}

export interface AlmacenConflict {
  title: string;
  message: string;
  items?: string[];
  options: ConflictOption[];
}

// Antiguas claves de la base de la fusión en localStorage (ahora va en IndexedDB)
export const BASE_KEY = 'cms_a3_base_sincronizada';
export const BASE_LM_KEY = 'cms_a3_base_fecha_archivo';
export const LAST_BACKUP_KEY = 'cms_a3_ultima_copia';
export const OPINIONS_KEY = 'cms_a3_opiniones';
export const CHANGED_SINCE_BACKUP_KEY = 'cms_a3_cambios_desde_copia';

export const lsGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
export const lsSet = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* almacenamiento no disponible o lleno: la fusión preguntará por el archivo entero */
  }
};

export const json = (p: A3Project[]) => JSON.stringify(p);

/** Nombre de cada apartado del A3 para explicar un conflicto */
export const FIELD_LABEL: Record<string, string> = {
  title: 'título',
  owner: 'líder',
  department: 'área',
  date: 'fecha',
  status: 'estado',
  background: 'contexto',
  currentCondition: 'situación actual',
  w5h1: '5W1H',
  goals: 'objetivo',
  rootCauseMode: 'método de causa raíz',
  rootCauseTree: 'árbol de 5 por qués',
  rootCauseIshikawa: 'Ishikawa',
  rootCauseConclusions: 'conclusiones del análisis',
  show5W1H: 'mostrar 5W1H',
  countermeasures: 'notas del plan',
  actionItems: 'contramedidas',
  check: 'verificación',
  beforeMetric: 'métrica antes',
  targetMetric: 'métrica meta',
  afterMetric: 'métrica actual',
  indicator: 'indicador',
  followUp: 'estandarización',
  qualityChecks: 'criterios de calidad',
  review: 'revisión',
};
export const describeFields = (fields: string[]) => fields.map((f) => FIELD_LABEL[f] || f).join(', ');
export const json2 = (o: Opinion[]) => JSON.stringify(o);
