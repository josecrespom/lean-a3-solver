import { A3Project } from '../types/lean';
import { QUALITY_CRITERIA_BY_STEP } from '../data/qualityCriteria';

export interface CompletenessResult {
  percentage: number;
  completedCount: number;
  totalCount: number;
  steps: {
    name: string;
    completed: boolean;
    description: string;
  }[];
}

/**
 * Calculates completeness of an A3 project across 8 core stages:
 * 1. Definición Inicial (Título, Líder, Área)
 * 2. Paso 1: Contexto / Antecedentes
 * 3. Paso 2: Situación Actual (Descripción o 5W1H)
 * 4. Paso 3: Objetivo SMART
 * 5. Paso 4: Análisis Causa Raíz (al menos 1 causa marcada como raíz)
 * 6. Paso 5: Contramedidas (al menos 1 acción con responsable y fecha)
 * 7. Paso 6: Verificación de Resultados
 * 8. Paso 7: Estandarización y Próximos Pasos
 */
export function calculateA3Completeness(project: A3Project): CompletenessResult {
  const hasTitleAndMeta = Boolean(
    project.title.trim() && project.title !== 'Nuevo Problema A3' && project.owner?.trim() && project.department?.trim()
  );

  const hasBackground = Boolean(project.background?.trim() && project.background.length > 15);

  const has5w1h = Boolean(
    project.w5h1?.what?.trim() || project.w5h1?.where?.trim() || project.w5h1?.when?.trim() || project.w5h1?.why?.trim()
  );
  const hasCurrentCondition = Boolean(
    (project.currentCondition?.trim() && project.currentCondition.length > 15) || has5w1h
  );

  const hasGoals = Boolean(project.goals?.trim() && project.goals.length > 15);

  // Check if at least 1 root cause is identified in Tree or Ishikawa
  let hasRootCause = false;
  if (project.rootCauseMode === 'tree' && project.rootCauseTree) {
    const checkTree = (node: any): boolean => {
      if (node.isRootCause) return true;
      if (node.children && node.children.length > 0) {
        return node.children.some(checkTree);
      }
      return false;
    };
    hasRootCause = checkTree(project.rootCauseTree);
  } else if (project.rootCauseIshikawa?.categories) {
    hasRootCause = project.rootCauseIshikawa.categories.some((cat) =>
      cat.causes.some((c) => c.isRootCause || c.subcauses?.some((s) => s.isRootCause))
    );
  }

  // El plan cuenta solo si hay acciones en la tabla con responsable y fecha
  const hasCountermeasures = Boolean(
    project.actionItems?.some((a) => a.action?.trim() && a.owner?.trim() && a.dueDate)
  );

  // El paso 6 cuenta con una verificación escrita o con mediciones reales del indicador
  const hasCheck =
    Boolean(project.check?.trim() && project.check.length > 15) ||
    Boolean(project.indicator?.measurements.some((m) => m.value != null && m.date));

  const hasFollowup = Boolean(project.followUp?.trim() && project.followUp.length > 15);

  const steps = [
    {
      name: 'Identificación y Metadatos',
      completed: hasTitleAndMeta,
      description: 'Título descriptivo, Líder y Área asignados',
    },
    {
      name: '1. Contexto / Antecedentes',
      completed: hasBackground,
      description: 'Razón de negocio e impacto claro',
    },
    {
      name: '2. Situación Actual y 5W1H',
      completed: hasCurrentCondition,
      description: 'Datos y estratificación de hechos',
    },
    {
      name: '3. Objetivo SMART',
      completed: hasGoals,
      description: 'Meta cuantitativa y plazo temporal',
    },
    {
      name: '4. Causa Raíz Identificada',
      completed: hasRootCause,
      description: 'Al menos una causa marcada con diana 🎯',
    },
    {
      name: '5. Plan de Contramedidas (5W2H)',
      completed: hasCountermeasures,
      description: 'Acciones asignadas con responsable y fecha',
    },
    {
      name: '6. Chequeo de Resultados',
      completed: hasCheck,
      description: 'Verificación de indicadores de impacto',
    },
    {
      name: '7. Estandarización',
      completed: hasFollowup,
      description: 'Actualización de pautas y lecciones',
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    percentage,
    completedCount,
    totalCount,
    steps,
  };
}

export interface ValidationResult {
  percentage: number;
  checkedCount: number;
  totalCount: number;
}

/**
 * Validación con los criterios de rigor: cuántos criterios de calidad
 * (checklist "Criterios de calidad" de cada paso) se han confirmado. Un A3 puede
 * estar completo (todos los campos rellenos) y aun así no estar validado.
 */
export function calculateA3Validation(project: A3Project): ValidationResult {
  const ids = Object.values(QUALITY_CRITERIA_BY_STEP).flatMap((step) => step.criteria.map((c) => c.id));
  const checkedCount = ids.filter((id) => project.qualityChecks?.[id]).length;
  const totalCount = ids.length;
  return {
    percentage: totalCount ? Math.round((checkedCount / totalCount) * 100) : 0,
    checkedCount,
    totalCount,
  };
}

export interface A3Progress {
  /** Pasos 1–7 rellenos */
  done: number;
  total: number;
  steps: CompletenessResult['steps'];
  /** Criterios de calidad confirmados (autoevaluación de calidad) */
  checked: number;
  criteria: number;
  /** Fase en la que está: rellenar, autoevaluar o listo */
  phase: 'filling' | 'review' | 'validated';
}

/**
 * Un solo indicador de avance: los pasos rellenos son la medida principal;
 * los criterios de calidad solo aparecen como el siguiente paso cuando ya está todo
 * relleno (así no se leen dos cifras que parecen contradecirse).
 */
export function a3Progress(project: A3Project): A3Progress {
  const c = calculateA3Completeness(project);
  const v = calculateA3Validation(project);
  const steps = c.steps.slice(1);
  const done = steps.filter((s) => s.completed).length;
  const phase = done < steps.length ? 'filling' : v.checkedCount < v.totalCount ? 'review' : 'validated';
  return { done, total: steps.length, steps, checked: v.checkedCount, criteria: v.totalCount, phase };
}
