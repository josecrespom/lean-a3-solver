// Definición única de los 7 pasos del A3 (títulos y textos de ayuda),
// compartida por la lámina, el modo asistente y la revisión.

export interface StepMeta {
  step: number;
  /** Etiqueta corta del selector de pasos */
  label: string;
  /** Título de la sección en la lámina */
  title: string;
  /** Título largo del modo asistente */
  heading: string;
  /** Ayuda breve bajo el título */
  subtitle: string;
  /** Columna de la lámina: izquierda (PLAN) o derecha (DO-CHECK-ACT) */
  column: 'left' | 'right';
}

export const STEPS: StepMeta[] = [
  {
    step: 1,
    label: '1. Contexto',
    title: 'Contexto / Antecedentes',
    heading: 'Paso 1: Contexto y Antecedentes (SQDC)',
    subtitle: '¿Por qué es importante resolver este problema ahora? Vinculación con objetivos estratégicos.',
    column: 'left',
  },
  {
    step: 2,
    label: '2. Situación Actual',
    title: 'Situación Actual',
    heading: 'Paso 2: Situación Actual y 5W1H (Genchi Genbutsu)',
    subtitle: 'Descripción fáctica del problema con datos y hechos observables.',
    column: 'left',
  },
  {
    step: 3,
    label: '3. Objetivo SMART',
    title: 'Objetivo / Condición Meta',
    heading: 'Paso 3: Objetivo / Condición Meta Cuantificable',
    subtitle: 'Meta específica, medible y con plazo fijado (condición a alcanzar).',
    column: 'left',
  },
  {
    step: 4,
    label: '4. Causa Raíz',
    title: 'Análisis de Causa Raíz',
    heading: 'Paso 4: Análisis Causa Raíz (5 Por Qués / Ishikawa 6M)',
    subtitle: 'Desglose sistemático hasta identificar la verdadera causa origen.',
    column: 'left',
  },
  {
    step: 5,
    label: '5. Contramedidas',
    title: 'Contramedidas (Plan de Acción)',
    heading: 'Paso 5: Contramedidas y priorización',
    subtitle: 'Acciones directas para neutralizar cada causa raíz identificada (quién, qué, cuándo).',
    column: 'right',
  },
  {
    step: 6,
    label: '6. Verificación',
    title: 'Verificación de Resultados',
    heading: 'Paso 6: Verificación de Resultados',
    subtitle: 'Confirmación cuantitativa del efecto de las contramedidas frente al objetivo.',
    column: 'right',
  },
  {
    step: 7,
    label: '7. Estandarización',
    title: 'Seguimiento y Estandarización',
    heading: 'Paso 7: Estandarización y Despliegue Horizontal',
    subtitle: 'Sostener la mejora, actualizar el trabajo estándar y extender lo aprendido a otras áreas (Yokoten).',
    column: 'right',
  },
];
