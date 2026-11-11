import { A3Project } from '../types/lean';

export const initialProjects: A3Project[] = [
  {
    id: 'cms-a3-sample-01',
    title: 'Reducción de defectos de porosidad en soldadura robotizada de chasis',
    owner: 'Responsable de Calidad',
    department: 'Soldadura y Ensamble - Línea Chasis B',
    date: '2026-11-04',
    status: 'en_progreso',
    background:
      'La estación de soldadura láser robotizada R-04 ha presentado un repunte de defectos por porosidad interna en el larguero posterior del chasis (perfil estructural). Esto genera paradas de línea por Jidoka (Andon cord tirado 14 veces/semana) y retrabajos fuera de flujo que elevan el coste unitario en un 6.2% e impactan el Takt Time de 58 segundos.',
    currentCondition:
      'La tasa de defectos por porosidad se sitúa en 4.8% frente al límite de control interno de 0.5%. El análisis de Pareto muestra que el 82% de las porosidades se concentran en la unión angular derecha del larguero. Las inspecciones ultrasónicas no destructivas confirman burbujas de gas atrapadas durante la solidificación.',
    w5h1: {
      what: 'Porosidad y falta de fusión en cordón de soldadura robotizada (unión angular derecha).',
      where: 'Planta de Carrocerías, Nave 2, Célula Robotizada R-04, Estación de Chasis Trasero.',
      when: 'Incremento sostenido desde el cambio de lote de material del 15 de octubre, agudizado en el turno de noche.',
      who: 'Detectado por el sistema de visión óptica post-soldadura y validado por inspectores de aseguramiento de calidad.',
      why: 'Provoca riesgo de microfisuras estructurales bajo pruebas de torsión dinámica, paradas de línea Andon y retrabajo manual.',
      how: 'Afecta a 48 unidades por cada 1,000 chasis producidos (4.8% scrap/retrabajo), con coste acumulado de 18,400 € en el último mes.',
    },
    show5W1H: true,
    goals:
      '1. Reducir la tasa de porosidad en soldadura del 4.8% al < 0.3% para el 15 de diciembre de 2026.\n2. Eliminar completamente las paradas de línea Andon por defectos de unión en la estación R-04 (0 paradas semanales).\n3. Estandarizar el procedimiento de control de flujo de gas de purga en todas las 6 células hermanas.',
    rootCauseMode: 'ishikawa',
    rootCauseTree: {
      id: 'root-tree-1',
      text: 'Porosidades en soldadura de chasis',
      isRootCause: false,
      children: [],
    },
    rootCauseIshikawa: {
      problemHead: 'Porosidad en cordón de soldadura chasis',
      categories: [
        {
          id: 'cat-maquinaria',
          name: 'Maquinaria',
          causes: [
            {
              id: 'cau-m1',
              text: 'Tobera con salpicaduras acumuladas',
              isRootCause: false,
              subcauses: [
                { id: 'sub-m1-1', text: 'Presión insuficiente en spray antiadherente', isRootCause: false },
                { id: 'sub-m1-2', text: 'Boquilla de difusión parcialmente obstruida', isRootCause: false },
              ],
            },
            { id: 'cau-m2', text: 'Ciclo de escariado automático desajustado', isRootCause: true },
            { id: 'cau-m3', text: 'Desgaste en rodillos de arrastre de hilo', isRootCause: false },
          ],
        },
        {
          id: 'cat-metodos',
          name: 'Métodos',
          causes: [
            { id: 'cau-me1', text: 'Ángulo de ataque de antorcha a 68° en vez de 75°', isRootCause: false },
            { id: 'cau-me2', text: 'Falta de protocolo de purga de gas antes de primer arco', isRootCause: true },
          ],
        },
        {
          id: 'cat-materiales',
          name: 'Materiales',
          causes: [
            { id: 'cau-mat1', text: 'Película de lubricante residual en chapa estampada', isRootCause: true },
            { id: 'cau-mat2', text: 'Variación de humedad ambiental en bobina de alambre', isRootCause: false },
          ],
        },
        {
          id: 'cat-mano-obra',
          name: 'Mano de Obra',
          causes: [
            {
              id: 'cau-mo1',
              text: 'Rotación de operadores sin certificación Nivel 2 en turno noche',
              isRootCause: true,
            },
            { id: 'cau-mo2', text: 'Diferente criterio en chequeo visual 1x1' },
          ],
        },
        {
          id: 'cat-medicion',
          name: 'Medición',
          causes: [
            { id: 'cau-med1', text: 'Manómetro analógico de gas sin marcas de rango óptimo' },
            { id: 'cau-med2', text: 'Calibración de caudalímetro cada 6 meses (periodo excesivo)' },
          ],
        },
        {
          id: 'cat-medio-ambiente',
          name: 'Medio Ambiente',
          causes: [
            {
              id: 'cau-env1',
              text: 'Corrientes de aire provocadas por portón abierto de logística',
              isRootCause: true,
            },
            { id: 'cau-env2', text: 'Humedad relativa superior al 70% en días de lluvia' },
          ],
        },
      ],
    },
    rootCauseConclusions:
      'El análisis confirma 5 causas raíz principales correlacionadas: falta de limpieza automática de tobera, purga previa insuficiente de gas, película lubricante residual en chapa, personal no certificado en turno 3 y corrientes de aire por portón logístico abierto.',
    countermeasures:
      'Recursos: presupuesto aprobado para el presostato digital y la cortina de aire. Automatización da soporte para integrar el enclavamiento en el PLC del robot R-04. La formación en Dojo se coordina con RRHH.',
    actionItems: [
      {
        id: 'act-1',
        action: 'Reprogramar ciclo de escariado y pulverizado cada 12 piezas en robot',
        owner: 'Responsable de Calidad',
        dueDate: '2026-11-10',
        status: 'completed',
        linkedRootCause: 'Ciclo de escariado automático desajustado',
        linkedRootCauseId: 'cau-m2',
      },
      {
        id: 'act-2',
        action: 'Instalar cortina de aire y cierre automático en portón logístico',
        owner: 'Mantenimiento Nave 2',
        dueDate: '2026-11-14',
        status: 'in_progress',
        linkedRootCause: 'Corrientes de aire provocadas por portón abierto de logística',
        linkedRootCauseId: 'cau-env1',
      },
      {
        id: 'act-3',
        action: 'Poka-Yoke de caudal digital de gas argón con corte automático de robot',
        owner: 'Equipo de Automatización',
        dueDate: '2026-11-18',
        status: 'in_progress',
        linkedRootCause: 'Falta de protocolo de purga de gas antes de primer arco',
        linkedRootCauseId: 'cau-me2',
      },
      {
        id: 'act-4',
        action: 'Auditoría y cambio preventivo semanal de filtros en lavadora de chapa',
        owner: 'Líder de Estampación',
        dueDate: '2026-11-20',
        status: 'pending',
        linkedRootCause: 'Película de lubricante residual en chapa estampada',
        linkedRootCauseId: 'cau-mat1',
      },
      {
        id: 'act-5',
        action: 'Re-entrenar en Dojo al 100% de operadores del turno noche en el estándar SWCS-W04',
        owner: 'RRHH y Formación',
        dueDate: '2026-11-18',
        status: 'in_progress',
        linkedRootCause: 'Rotación de operadores sin certificación Nivel 2 en turno noche',
        linkedRootCauseId: 'cau-mo1',
      },
    ],
    check:
      'Resultados preliminares tras contramedida 1 (limpieza robotizada):\n- Tasa de porosidad cayó de 4.8% a 1.4% en 5 días de seguimiento continuo.\n- Paradas Andon reducidas de 14 a 3 semanales.\n- Se mantendrá monitoreo durante 3 semanas con gráfico de control X-R para validar el Cpk > 1.33.',
    beforeMetric: '4.8%',
    afterMetric: '1.4%',
    targetMetric: '< 0.3%',
    indicator: {
      name: '% rechazo por porosidad',
      unit: '%',
      direction: 'down',
      baseline: 4.8,
      target: 0.3,
      measurements: [
        { id: 'med-1', date: '2026-10-28', value: 4.6, note: 'Antes de la limpieza robotizada' },
        { id: 'med-2', date: '2026-10-31', value: 3.1, note: 'Limpieza de tobera cada 4 h' },
        { id: 'med-3', date: '2026-11-01', value: 2.2 },
        { id: 'med-4', date: '2026-11-03', value: 1.7 },
        { id: 'med-5', date: '2026-11-04', value: 1.4, note: 'Pendiente: Poka-Yoke de caudal' },
      ],
    },
    followUp:
      'ESTANDARIZACIÓN Y YOKOTEN (Extensión horizontal):\n1. Actualizada la Hoja de Trabajo Estándar (SWCS-W04 Rev. 4) con verificación visual obligatoria de tobera en cada relevo de turno.\n2. Yokoten: Replicar el Poka-Yoke de caudal digital en las 5 células gemelas de las Líneas A y C antes del 20 de diciembre.\n3. Auditoría de confirmación del proceso cada 15 días durante los próximos 3 meses por el comité de Calidad.',
    updatedAt: '2026-11-04 16:30',
  },
];

export const emptyProjectTemplate: A3Project = {
  id: '',
  title: 'Nuevo Problema A3',
  owner: '',
  department: '',
  date: new Date().toISOString().split('T')[0],
  status: 'abierto',
  background: '',
  currentCondition: '',
  w5h1: {
    what: '',
    where: '',
    when: '',
    who: '',
    why: '',
    how: '',
  },
  show5W1H: false,
  goals: '',
  rootCauseMode: 'tree',
  rootCauseTree: {
    id: 'root-node',
    text: 'Problema Principal',
    isRootCause: false,
    children: [],
  },
  rootCauseIshikawa: {
    problemHead: 'Problema a Analizar',
    categories: [
      { id: 'cat-1', name: 'Maquinaria', causes: [] },
      { id: 'cat-2', name: 'Métodos', causes: [] },
      { id: 'cat-3', name: 'Materiales', causes: [] },
      { id: 'cat-4', name: 'Mano de Obra', causes: [] },
      { id: 'cat-5', name: 'Medición', causes: [] },
      { id: 'cat-6', name: 'Medio Ambiente', causes: [] },
    ],
  },
  rootCauseConclusions: '',
  countermeasures: '',
  actionItems: [],
  check: '',
  beforeMetric: '',
  afterMetric: '',
  targetMetric: '',
  followUp: '',
};
