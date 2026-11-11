// Términos Lean que aparecen en la app, explicados en castellano llano.
// Se muestran al pasar el ratón (abbr) y en la Guía Metodológica.
export const GLOSSARY: { term: string; aliases?: string[]; meaning: string }[] = [
  { term: 'PDCA', meaning: 'Planificar, Hacer, Verificar, Actuar: el ciclo de mejora que sigue el A3.' },
  {
    term: 'SQDC',
    meaning: 'Seguridad, Calidad, Entrega y Coste (Safety, Quality, Delivery, Cost): los pilares para priorizar.',
  },
  { term: 'SMART', meaning: 'Objetivo concreto, medible, alcanzable, relevante y con fecha.' },
  {
    term: 'Pareto',
    meaning: 'Ordenar las causas de mayor a menor peso: pocas causas suelen explicar la mayoría del problema.',
  },
  {
    term: 'Gemba',
    aliases: ['Genba'],
    meaning: 'El lugar real donde ocurre el problema (la línea, el puesto, la máquina).',
  },
  {
    term: 'Genchi Genbutsu',
    meaning: 'Ir a ver en persona el lugar y los hechos, en lugar de opinar desde la oficina.',
  },
  { term: '5W1H', meaning: 'Qué, dónde, cuándo, quién, cuál y cómo: preguntas para describir el problema con hechos.' },
  { term: '5W2H', meaning: 'Qué, por qué, dónde, cuándo, quién, cómo y cuánto: preguntas para concretar una acción.' },
  {
    term: '5 Por Qués',
    aliases: ['5 Porqués', '5 por qués'],
    meaning: 'Preguntar «¿por qué?» varias veces seguidas hasta llegar a la causa de fondo.',
  },
  { term: 'Ishikawa', meaning: 'Diagrama de espina de pescado: agrupa las causas posibles por categorías (las 6M).' },
  { term: '6M', meaning: 'Mano de obra, Máquina, Método, Material, Medición y Medio ambiente: categorías de causas.' },
  {
    term: 'Poka-Yoke',
    aliases: ['Poka Yoke', 'poka-yoke'],
    meaning: 'Dispositivo o método «a prueba de errores» que impide que el fallo ocurra o lo detecta al momento.',
  },
  {
    term: 'Yokoten',
    meaning: 'Extender lo aprendido y la solución a otras líneas, áreas o plantas con el mismo riesgo.',
  },
  { term: 'Andon', meaning: 'Señal (luz, aviso) para pedir ayuda o parar cuando aparece un problema.' },
  { term: 'Jidoka', meaning: 'Detener el proceso automáticamente al detectar un defecto para no seguir fabricándolo.' },
  {
    term: 'Takt',
    aliases: ['Takt time'],
    meaning: 'Ritmo al que hay que producir para atender la demanda del cliente.',
  },
  { term: 'Muda', meaning: 'Desperdicio: cualquier actividad que consume recursos sin aportar valor.' },
  { term: 'Kaizen', meaning: 'Mejora continua, en pasos pequeños y con la participación de todos.' },
  { term: 'OEE', meaning: 'Eficiencia global del equipo: disponibilidad × rendimiento × calidad.' },
  { term: 'Sensei', meaning: 'Maestro o mentor con experiencia que guía al equipo con preguntas.' },
  { term: 'Lean', meaning: 'Forma de trabajar centrada en aportar valor al cliente y eliminar desperdicios.' },
  { term: 'Quick Win', aliases: ['Quick Wins'], meaning: 'Acción rápida y eficaz: mucho impacto con poco esfuerzo.' },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const entries = GLOSSARY.flatMap((g) => [g.term, ...(g.aliases ?? [])].map((name) => ({ name, meaning: g.meaning })));
// Primero los nombres largos ("Genchi Genbutsu" antes que "Gemba")
entries.sort((a, b) => b.name.length - a.name.length);

export const GLOSSARY_RE = new RegExp(
  `(?<![\\p{L}\\d])(${entries.map((e) => escape(e.name)).join('|')})(?![\\p{L}\\d])`,
  'gu'
);

export const meaningOf = (name: string): string | undefined =>
  entries.find((e) => e.name.toLowerCase() === name.toLowerCase())?.meaning;
