export interface W5H1 {
  what: string; // Qué sucedió
  where: string; // Dónde ocurrió (área, línea, estación)
  when: string; // Cuándo se detectó (fecha, turno, hora)
  who: string; // Quién lo detectó o a quién afecta
  why: string; // Por qué es un problema / impacto en cliente
  how: string; // Cómo se detectó y qué magnitud tiene (piezas/coste)
}

export interface TreeNode {
  id: string;
  text: string;
  isRootCause?: boolean;
  children: TreeNode[];
}

export interface IshikawaCause {
  id: string;
  text: string;
  isRootCause?: boolean;
  subcauses?: IshikawaCause[];
}

export interface IshikawaCategory {
  id: string;
  name: string;
  causes: IshikawaCause[];
}

export interface IshikawaData {
  problemHead: string;
  categories: IshikawaCategory[];
}

export interface ActionItem {
  id: string;
  action: string;
  owner: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  linkedRootCause?: string;
  linkedRootCauseId?: string;
  impact?: 'alto' | 'bajo';
  effort?: 'alto' | 'bajo';
}

export interface A3Project {
  id: string;
  title: string;
  owner: string;
  department: string;
  date: string;
  status: 'abierto' | 'en_progreso' | 'estandarizado';

  // 1. Contexto / Antecedentes
  background: string;

  // 2. Situación Actual
  currentCondition: string;
  w5h1: W5H1;
  show5W1H?: boolean;

  // 3. Objetivo / Condición Meta
  goals: string;

  // 4. Análisis de Causa Raíz
  rootCauseMode: 'tree' | 'ishikawa';
  rootCauseTree: TreeNode;
  rootCauseIshikawa: IshikawaData;
  rootCauseConclusions?: string;

  // 5. Contramedidas (Plan de Acción)
  countermeasures: string;
  actionItems?: ActionItem[];

  // 6. Verificación de Resultados
  check: string;
  beforeMetric?: string;
  afterMetric?: string;
  targetMetric?: string;
  /** Seguimiento numérico del indicador (mediciones frente a la meta) */
  indicator?: A3Indicator;

  // 7. Seguimiento y Estandarización (Yokoten)
  followUp: string;

  qualityChecks?: Record<string, boolean>;
  updatedAt?: string;
  /** Quién creó el A3 y quién lo modificó por última vez */
  createdBy?: string;
  updatedBy?: string;

  /** Papelera: si tiene fecha, el A3 está eliminado (se borra del todo a los 30 días) */
  deletedAt?: string;
  deletedBy?: string;

  /** Revisión del A3 por un responsable / sensei */
  review?: A3Review;
  comments?: ReviewComment[];
}

export type ReviewState = 'borrador' | 'en_revision' | 'devuelto' | 'aprobado';

export interface ReviewEvent {
  at: string;
  by?: string;
  action: 'solicitada' | 'devuelta' | 'aprobada' | 'reabierta';
  note?: string;
}

export interface A3Review {
  state: ReviewState;
  reviewer?: string;
  requestedBy?: string;
  requestedAt?: string;
  decidedBy?: string;
  decidedAt?: string;
  /** Huella del contenido aprobado (para detectar cambios posteriores) */
  approvedHash?: string;
  history?: ReviewEvent[];
}

export interface ReviewComment {
  id: string;
  /** 0 = comentario general; 1-7 = paso del A3 */
  step: number;
  author?: string;
  at: string;
  text: string;
  resolved?: boolean;
  resolvedBy?: string;
}

export interface IndicatorMeasurement {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** null mientras se está escribiendo la fila */
  value: number | null;
  note?: string;
}

export interface A3Indicator {
  name: string;
  unit?: string;
  /** 'down': mejor cuanto más bajo (defectos, tiempos); 'up': mejor cuanto más alto (OEE, rendimiento) */
  direction: 'down' | 'up';
  baseline?: number;
  target?: number;
  measurements: IndicatorMeasurement[];
}

/** Opinión del equipo sobre la app (fallo, idea o duda), guardada en el almacén compartido */
export interface Opinion {
  id: string;
  kind: 'fallo' | 'idea' | 'duda';
  text: string;
  author?: string;
  at: string;
  /** Dónde estaba la persona al escribirla (vista o A3) */
  where?: string;
  /** nueva → vista (en estudio) → planificada → hecha | descartada */
  status: 'nueva' | 'vista' | 'planificada' | 'hecha' | 'descartada';
  /** Versión de la app en la que se piensa incluir (planificada) */
  plannedVersion?: string;
  /** Versión de la app en la que quedó hecha */
  doneVersion?: string;
  /** Respuesta del equipo (por qué se descarta, cómo se resolvió…) */
  response?: string;
  updatedAt: string;
  updatedBy?: string;
}
