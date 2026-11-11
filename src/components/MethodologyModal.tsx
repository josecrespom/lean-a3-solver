import { GLOSSARY } from '../utils/glossary';
import { Modal } from './ui/Modal';
import React from 'react';
import { BookOpen } from 'lucide-react';
import { buttonClass } from './ui/Button';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Cerrar la guía"
      maxWidth="max-w-3xl"
      icon={<BookOpen className="w-5 h-5 text-red-600 dark:text-red-500" />}
      title="Metodología Lean A3"
      footer={
        <button type="button" onClick={onClose} className={buttonClass('dark', 'sm')}>
          Entendido
        </button>
      }
    >
      <div className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            ¿Qué es el Informe A3?
          </h3>
          <p>
            El informe A3 es la herramienta nuclear de gestión y comunicación visual de resolución de problemas bajo el{' '}
            <strong>método Lean A3</strong>. Condensa en una sola hoja de tamaño DIN A3 (420 × 297 mm) todo el ciclo{' '}
            <strong>PDCA (Planificar, Hacer, Verificar, Actuar)</strong>. El objetivo no es llenar un formulario, sino
            desarrollar el pensamiento disciplinado para solucionar problemas desde la causa raíz (Genchi Genbutsu: ir y
            ver en el lugar de los hechos).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-50 dark:bg-neutral-800/80 p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-[11px] uppercase mb-1">
              Lado Izquierdo: PLAN (Comprender la brecha)
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-neutral-600 dark:text-neutral-300">
              <li>
                <strong>1. Contexto:</strong> ¿Por qué importa ahora? Vinculación con objetivos estratégicos.
              </li>
              <li>
                <strong>2. Situación Actual (5W1H):</strong> Hechos observables, cuantificación del defecto y
                estratificación.
              </li>
              <li>
                <strong>3. Condición Meta:</strong> Objetivo numérico cuantificable y fecha de consecución.
              </li>
              <li>
                <strong>4. Causa Raíz:</strong> Aplicación de los 5 Por Qués y/o Diagrama de Ishikawa (6M).
              </li>
            </ul>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/80 p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-[11px] uppercase mb-1">
              Lado Derecho: DO - CHECK - ACT (Resolver y Sostener)
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-neutral-600 dark:text-neutral-300">
              <li>
                <strong>5. Contramedidas (DO):</strong> Plan de acción estructurado atacando las causas raíz directas.
              </li>
              <li>
                <strong>6. Verificación (CHECK):</strong> Comparativa antes vs después mediante indicadores clave.
              </li>
              <li>
                <strong>7. Estandarización y Yokoten (ACT):</strong> Actualización de hojas de trabajo estándar y
                despliegue a otras líneas.
              </li>
            </ul>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            Glosario
          </h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5" data-glossary>
            {GLOSSARY.map((g) => (
              <div key={g.term}>
                <dt className="inline font-bold text-neutral-900 dark:text-neutral-100">{g.term}: </dt>
                <dd className="inline">{g.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-blue-50/70 dark:bg-blue-950/40 p-3.5 rounded-lg border border-blue-200 dark:border-blue-800/80">
          <h4 className="font-bold text-blue-950 dark:text-blue-200 text-[11px] uppercase mb-1">
            Regla de Oro: Causas Raíz en Azul Marino
          </h4>
          <p className="text-blue-900 dark:text-blue-300">
            En esta herramienta interactiva, puedes pulsar el icono de diana (🎯) en cualquier nodo del Árbol de Causas
            o de la Espina de Ishikawa. El nodo pasará automáticamente a color <strong>Azul Marino</strong> y recibirá
            un número secuencial correlativo. Esa causa se integrará directamente en la lista de conclusiones y se
            vinculará con las contramedidas.
          </p>
        </div>
      </div>
    </Modal>
  );
};
