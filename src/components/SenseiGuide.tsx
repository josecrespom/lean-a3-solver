import React, { useState } from 'react';
import { Glossed } from './ui/Glossed';
import { Sparkles, ChevronDown, ChevronUp, CheckCircle2, XCircle, Lightbulb, HelpCircle } from 'lucide-react';

export interface StepGuideData {
  title: string;
  subtitle: string;
  goldenRule: string;
  questions: string[];
  goodExample: string;
  badExample: string;
  leanConcept: string;
}

export const SENSEI_GUIDE_CATALOG: Record<string, StepGuideData> = {
  step1: {
    title: '1. Contexto y antecedentes',
    subtitle: '¿Por qué es vital resolver este problema ahora?',
    goldenRule:
      'Genchi Genbutsu: Acude al Gemba (lugar real) y confirma los hechos con tus propios ojos; nunca trabajes con rumores de oficina.',
    questions: [
      '¿Cuál es el problema de negocio o seguridad y por qué se atiende en este momento?',
      '¿Qué impacto tiene en clientes externos o internos, costes, calidad o entregas?',
      '¿Cómo se vincula con los objetivos estratégicos o KPIs de la planta?',
    ],
    goodExample:
      'En los últimos 3 meses, la línea 2 de soldadura registró un 4.5% de rechazo por porosidad, generando 18.200 € en retrabajos y retrasando las entregas al cliente en 14 horas semanales.',
    badExample: 'La soldadura está saliendo muy mal y los clientes se quejan de que las piezas tienen fallos.',
    leanConcept: 'Enfoque en Valor para el Cliente y Pérdidas (Muda)',
  },
  step2: {
    title: '2. Situación actual y hechos (5W1H)',
    subtitle: 'Estratificación con datos concretos, hechos verificables y matriz 5W1H',
    goldenRule: 'Un problema bien desglosado y estratificado numéricamente ya está resuelto al 50%.',
    questions: [
      '¿Qué sucede exactamente (hecho físico medible)?',
      '¿Dónde se localiza (estación, modelo, cordón específico)?',
      '¿Cuándo ocurre (turno, día, secuencia)?',
      '¿Quién detecta la anomalía y quién está implicado?',
      '¿Cuál es la magnitud cuantitativa precisa?',
    ],
    goodExample:
      'El 82% de las porosidades se concentran en el cordón C-04 del chasis delantero durante el turno de noche (T3), tras paradas de más de 20 minutos de la célula robotizada.',
    badExample: 'Hay poros en casi todos los chasis cuando los operarios no limpian bien la máquina.',
    leanConcept: 'Estratificación y Principio de Pareto (80/20)',
  },
  step3: {
    title: '3. Objetivo y condición meta',
    subtitle: 'Definición de meta SMART con valor actual, meta cuantificable y fecha',
    goldenRule:
      'Criterio SMART estricto: Específico, Medible, Alcanzable, Relevante y con Plazo temporal improrrogable.',
    questions: [
      '¿Cuál es el punto de partida (línea base actual comprobada)?',
      '¿Cuál es el valor cuantitativo exacto que se debe alcanzar?',
      '¿En qué fecha límite debe cumplirse la condición meta?',
      '¿Qué condición operativa o de proceso se observará cuando esté logrado?',
    ],
    goodExample:
      'Reducir el índice de rechazo por porosidad del 4.5% actual a menos del 0.2% antes del 30 de noviembre de 2026, sin alterar el tiempo de ciclo de 58 segundos.',
    badExample: 'Intentar eliminar todos los defectos de soldadura lo antes posible y con máxima calidad.',
    leanConcept: 'Condición Meta (Target Condition) vs. Simple Deseo',
  },
  step4: {
    title: '4. Análisis de causa raíz',
    subtitle: 'Descubrir el fallo en el proceso o sistema sin culpar a las personas',
    goldenRule:
      'Nunca aceptes "error humano" como causa raíz. Las personas se equivocan cuando el sistema o estándar lo permite.',
    questions: [
      '¿Cuál es el mecanismo técnico o físico directo del defecto?',
      '¿Por qué el estándar de trabajo no evitó que ocurriese la condición?',
      '¿Por qué el sistema de gestión o control no detectó la anomalía a tiempo?',
      '¿Se ha marcado al menos una causa como causa raíz real con la diana 🎯?',
    ],
    goodExample:
      'Tobera con salpicaduras acumuladas ➔ ciclo de pulverizado antiadherente descalibrado ➔ falta de control automático de presión en dosificador (Causa Raíz de proceso).',
    badExample: 'El soldador del turno nocturno se distrajo y no se dio cuenta de que la máquina no echaba spray.',
    leanConcept: '5 Por Qués, Diagrama de Ishikawa 6M y Poka-Yoke',
  },
  step5: {
    title: '5. Contramedidas y priorización',
    subtitle: 'Atacar las causas raíz identificadas con prioridad en Victorias Rápidas',
    goldenRule:
      'Prioriza contramedidas Poka-Yoke (a prueba de fallos mecánicos/eléctricos) sobre advertencias verbales o más instrucciones en papel.',
    questions: [
      '¿Cada contramedida actúa directamente sobre una causa raíz marcada con diana?',
      '¿Se evaluó en la Matriz 2x2 (Impacto Alto vs. Esfuerzo Bajo)?',
      '¿Tiene un único responsable nominal (con nombre y apellido, no un departamento general)?',
      '¿Tiene una fecha de entrega límite estricta?',
    ],
    goodExample:
      'Integrar presostato digital con enclavamiento al PLC: si el caudal de gas desciende de 18 L/min, el robot detiene el arco e ilumina el Andon (Responsable: Automatización / Plazo: 15 Nov).',
    badExample: 'Pedirle a los operarios que tengan más cuidado al supervisar el gas.',
    leanConcept: 'Matriz 2x2 de Priorización, Poka-Yoke y 5W2H',
  },
  step6: {
    title: '6. Verificación de resultados',
    subtitle: 'Comprobar con datos en el Gemba si la hipótesis se confirmó',
    goldenRule:
      'El ciclo PDCA exige verificar la estabilidad en producción real durante varias semanas, no conformarse con la primera prueba.',
    questions: [
      '¿Se midieron exactamente los mismos parámetros e indicadores del Paso 2?',
      '¿Se alcanzó la condición meta cuantitativa del Paso 3?',
      '¿Se detectó algún efecto colateral imprevisto en líneas adyacentes?',
      '¿El proceso demuestra estabilidad en todos los turnos?',
    ],
    goodExample:
      'Tras 21 días de producción continua, la tasa de defectos bajó del 4.5% al 0.08% (meta: < 0.2%). Cero porosidades registradas en el turno nocturno.',
    badExample: 'Instalamos el presostato y parece que todo va mucho mejor.',
    leanConcept: 'Verificación Científica y Control Estadístico',
  },
  step7: {
    title: '7. Estandarización y Despliegue Horizontal (Yokoten)',
    subtitle: 'Actualizar las normas y compartir el aprendizaje en toda la planta',
    goldenRule:
      'Yokoten: La lección aprendida debe transferirse inmediatamente a otras líneas y productos para evitar la recurrencia sistémica.',
    questions: [
      '¿Se actualizó la Hoja de Trabajo Estándar (SWCS) y la pauta de control visual?',
      '¿Se formó y certificó al 100% de los operadores en el estándar?',
      '¿Qué otras máquinas, células o plantas pueden aplicar esta misma solución (Yokoten)?',
      '¿Qué temas pendientes quedan para el próximo ciclo PDCA?',
    ],
    goodExample:
      'Actualizada instrucción IT-SOL-04 rev.3. Formado el 100% del personal en el Dojo. Comunicado Yokoten enviado a las células robotizadas 1, 3 y 4 de Planta Carrocería.',
    badExample: 'La gente ya aprendió cómo se hace.',
    leanConcept: 'Trabajo Estándar (SWCS) y Yokoten (Despliegue Lateral)',
  },
};

interface SenseiGuideProps {
  stepKey?: string;
  stepNumber?: number;
  defaultOpen?: boolean;
  /** Muestra solo el contenido, sin su propio botón (cuando lo abre otro control) */
  hideToggle?: boolean;
}

export const SenseiGuide: React.FC<SenseiGuideProps> = ({
  stepKey,
  stepNumber,
  defaultOpen = true,
  hideToggle = false,
}) => {
  const [isOpenState, setIsOpen] = useState(defaultOpen);
  const isOpen = hideToggle || isOpenState;
  const effectiveKey = stepKey || (stepNumber ? `step${stepNumber}` : 'step1');
  const guide = SENSEI_GUIDE_CATALOG[effectiveKey];

  if (!guide) return null;

  return (
    <div className="no-print my-2 transition-all">
      {!hideToggle && (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
            isOpen
              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
              : 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-amber-200/90 dark:border-amber-800/60'
          }`}
          title="Abrir preguntas clave y ejemplos prácticos de esta etapa"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Guía Sensei</span>
          {isOpen ? (
            <ChevronUp className="w-3 h-3 ml-0.5 text-amber-700 dark:text-amber-400" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-0.5 text-amber-700 dark:text-amber-400" />
          )}
        </button>
      )}

      {isOpen && (
        <div
          className={`${hideToggle ? '' : 'mt-2.5 '}p-4 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-md text-xs transition-all space-y-3.5 animate-in fade-in-50 duration-200`}
        >
          {/* Header Title & Concept */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-amber-200/70 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="bg-red-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded tracking-wider uppercase">
                Guía Sensei
              </span>
              <span className="font-extrabold text-neutral-900 dark:text-white text-xs">
                <Glossed text={guide.title} />
              </span>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 italic">
              <Glossed text={guide.leanConcept} />
            </span>
          </div>

          {/* Golden Rule */}
          <div className="p-2.5 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/60 rounded-lg flex items-start gap-2 text-amber-950 dark:text-amber-200">
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-black mr-1 uppercase text-[10px] tracking-wider text-amber-800 dark:text-amber-300">
                Regla de oro:
              </span>
              <span className="font-medium leading-relaxed">
                <Glossed text={guide.goldenRule} />
              </span>
            </div>
          </div>

          {/* Guiding Questions */}
          <div>
            <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200 mb-1.5 uppercase text-[10px] tracking-wider">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Preguntas clave para el equipo:</span>
            </div>
            <ul className="space-y-1 pl-4 list-disc text-neutral-700 dark:text-neutral-300">
              {guide.questions.map((q, idx) => (
                <li key={idx} className="leading-relaxed">
                  <Glossed text={q} />
                </li>
              ))}
            </ul>
          </div>

          {/* Do vs Don't Examples Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {/* Good Example */}
            <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg">
              <div className="flex items-center gap-1 text-emerald-800 dark:text-emerald-400 font-bold mb-1 uppercase text-[10px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Así sí:</span>
              </div>
              <p className="text-emerald-950 dark:text-emerald-200 leading-relaxed font-medium">
                «<Glossed text={guide.goodExample} />»
              </p>
            </div>

            {/* Bad Example */}
            <div className="p-2.5 bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg">
              <div className="flex items-center gap-1 text-red-800 dark:text-red-400 font-bold mb-1 uppercase text-[10px]">
                <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>Error típico a evitar:</span>
              </div>
              <p className="text-red-950 dark:text-red-300 leading-relaxed font-medium">
                «<Glossed text={guide.badExample} />»
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
