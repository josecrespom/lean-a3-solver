// Criterios de calidad de cada paso del A3 (datos, sin presentación)
export interface QualityCriterion {
  id: string;
  label: string;
  hint?: string;
}

export const QUALITY_CRITERIA_BY_STEP: Record<number, { title: string; criteria: QualityCriterion[] }> = {
  1: {
    title: 'Criterios de Calidad · Paso 1: Contexto',
    criteria: [
      {
        id: 'q-1-1',
        label: 'Vinculado a pilares SQDC (Seguridad, Calidad, Entrega, Coste)',
        hint: 'Debe justificar la prioridad estratégica del negocio.',
      },
      {
        id: 'q-1-2',
        label: 'Explica claramente el impacto en el cliente final o siguiente puesto',
        hint: 'No debe ser solo un malestar interno.',
      },
    ],
  },
  2: {
    title: 'Criterios de Calidad · Paso 2: Situación Actual',
    criteria: [
      {
        id: 'q-2-1',
        label: 'Basado en hechos y datos del Gemba (Genchi Genbutsu), sin opiniones',
        hint: 'Verificado personalmente en la línea de trabajo.',
      },
      {
        id: 'q-2-2',
        label: 'Definición precisa mediante 5W1H (Qué, Dónde, Cuándo, Quién, Magnitud)',
        hint: 'Cualquier persona del equipo debe entender el defecto exacto.',
      },
      {
        id: 'q-2-3',
        label: 'La brecha respecto al estándar está cuantificada con números y unidades',
        hint: 'Ejemplo: 4.8% frente al 0.5% permitido.',
      },
    ],
  },
  3: {
    title: 'Criterios de Calidad · Paso 3: Objetivo SMART',
    criteria: [
      {
        id: 'q-3-1',
        label: 'Objetivo cuantitativo específico (De X a Y)',
        hint: 'Sin ambigüedades como "mejorar la calidad".',
      },
      { id: 'q-3-2', label: 'Fecha límite de cumplimiento definida', hint: 'Plazo temporal concreto y realista.' },
      {
        id: 'q-3-3',
        label: 'No presupone la solución en la redacción',
        hint: 'Expresa el resultado a lograr, no la herramienta a comprar.',
      },
    ],
  },
  4: {
    title: 'Criterios de Calidad · Paso 4: Causa Raíz',
    criteria: [
      {
        id: 'q-4-1',
        label: 'Apunta a fallos del sistema o proceso, sin culpar a personas',
        hint: 'Si un operador se equivoca, el sistema falló en la prevención.',
      },
      {
        id: 'q-4-2',
        label: 'Cadena de 5 Por Qués lógica y verificable en sentido inverso',
        hint: 'Si ocurre B es por A; y si resolvemos A, desaparece B.',
      },
      {
        id: 'q-4-3',
        label: 'Al menos una Causa Raíz marcada (🎯 Azul Marino) como foco de acción',
        hint: 'Debe haber claridad sobre qué causa se ataca.',
      },
    ],
  },
  5: {
    title: 'Criterios de Calidad · Paso 5: Contramedidas',
    criteria: [
      {
        id: 'q-5-1',
        label: 'Cada acción ataca directamente una causa raíz identificada',
        hint: 'Evita acciones "parche" que solo tratan el síntoma.',
      },
      {
        id: 'q-5-2',
        label: 'Responsable nominal único y fecha límite por cada acción',
        hint: 'Evita asignar a departamentos difusos como "Mantenimiento".',
      },
      {
        id: 'q-5-3',
        label: 'Priorizado por impacto y esfuerzo (primero las rápidas y eficaces)',
        hint: 'Asegura que los recursos se centren en alto impacto.',
      },
    ],
  },
  6: {
    title: 'Criterios de Calidad · Paso 6: Verificación',
    criteria: [
      {
        id: 'q-6-1',
        label: 'Mismo indicador y unidad de medida que en el Paso 2 y 3',
        hint: 'Comparación homogénea Antes vs Después.',
      },
      {
        id: 'q-6-2',
        label: 'Tiempo suficiente de seguimiento para confirmar estabilidad',
        hint: 'No declarar éxito con solo 1 turno sin defectos.',
      },
    ],
  },
  7: {
    title: 'Criterios de Calidad · Paso 7: Estandarización y Yokoten',
    criteria: [
      {
        id: 'q-7-1',
        label: 'Procedimiento o Hoja de Trabajo Estándar (SWCS) actualizada',
        hint: 'Garantiza que el problema no regrese al cambiar de turno.',
      },
      {
        id: 'q-7-2',
        label: 'Despliegue horizontal (Yokoten) planificado a líneas o áreas similares',
        hint: 'Multiplica el beneficio del aprendizaje en toda la planta.',
      },
    ],
  },
};
