import React from 'react';
import { A3Project, TreeNode } from '../types/lean';
import { Target } from 'lucide-react';
import { IndicatorChart } from './IndicatorChart';
import { PrintableIshikawa } from './print/PrintableIshikawa';
import { PrintableTree } from './print/PrintableTree';
import { PrintStepHeader } from './print/PrintStepHeader';
import { formatDate } from '../utils/dates';
import { indicatorStatus, metricSummary, validMeasurements, withUnit } from '../utils/indicator';
import { causeLabel } from '../utils/actionSync';
import { rootCausesOf } from '../utils/rootCauses';

interface A3PrintSheetProps {
  project: A3Project;
}

export const A3PrintSheet: React.FC<A3PrintSheetProps> = ({ project }) => {
  const metrics = metricSummary(project);
  const causes = rootCausesOf(project);
  const indSt = indicatorStatus(project.indicator);
  const printStatus =
    indSt.met === true
      ? `✓ Meta alcanzada${indSt.streak > 1 ? ` (${indSt.streak} mediciones seguidas)` : ''}`
      : indSt.met === false
        ? `Pendiente: faltan ${withUnit(indSt.gap, project.indicator?.unit)}`
        : '';
  // Extract identified root causes
  const getRootCauses = (): { id: string; text: string }[] => {
    const list: { id: string; text: string }[] = [];
    if (project.rootCauseMode === 'tree') {
      const traverse = (node: TreeNode) => {
        if (node.isRootCause) {
          list.push({ id: node.id, text: node.text.trim() || '(Causa sin definir)' });
        }
        if (node.children) node.children.forEach(traverse);
      };
      traverse(project.rootCauseTree);
    } else {
      (project.rootCauseIshikawa.categories || []).forEach((cat) => {
        (cat.causes || []).forEach((c) => {
          if (c.isRootCause) {
            list.push({ id: c.id, text: `[${cat.name}] ${c.text.trim() || '(Causa sin definir)'}` });
          }
          (c.subcauses || []).forEach((sub) => {
            if (sub.isRootCause) {
              list.push({
                id: sub.id,
                text: `[${cat.name}] ${c.text.trim() ? `${c.text.trim()} ➔ ` : ''}${sub.text.trim() || '(Subcausa sin definir)'}`,
              });
            }
          });
        });
      });
    }
    return list;
  };

  const rootCauses = getRootCauses();

  return (
    <div className="a3-print-document font-sans text-neutral-900 bg-white">
      {/* Outer Border with A3 Framing */}
      <div className="border-[2.5px] border-neutral-900 rounded-lg p-5 flex flex-col justify-between min-h-[275mm] box-border">
        {/* ================= HEADER ================= */}
        <div className="border-b-4 border-neutral-900 pb-2.5 mb-3 flex flex-col gap-2">
          {/* Top Brand Bar & Full-Width Title */}
          <div className="w-full">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-0.5">
              <span className="bg-red-600 text-white px-2 py-0.5 rounded font-black tracking-wider">A3</span>
              <span>INFORME A3 DE RESOLUCIÓN PRÁCTICA DE PROBLEMAS (PPS)</span>
              <span>·</span>
              <span className="text-neutral-500">MÉTODO A3 / PDCA</span>
            </div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight uppercase leading-snug w-full">
              {project.title || 'INFORME DE PROBLEMA A3'}
            </h1>
          </div>

          {/* Metadata Row: Líder, Área, Fecha, Estado debajo del Título */}
          <div className="flex items-center gap-3 text-[11px] font-medium pt-1 border-t border-neutral-200">
            <div className="border border-neutral-300 rounded px-2.5 py-0.5 bg-neutral-50">
              <span className="text-neutral-500 font-bold mr-1">Líder:</span>
              <span className="font-extrabold text-neutral-900">{project.owner || '—'}</span>
            </div>
            <div className="border border-neutral-300 rounded px-2.5 py-0.5 bg-neutral-50">
              <span className="text-neutral-500 font-bold mr-1">Área:</span>
              <span className="font-extrabold text-neutral-900">{project.department || '—'}</span>
            </div>
            <div className="border border-neutral-300 rounded px-2.5 py-0.5 bg-neutral-50">
              <span className="text-neutral-500 font-bold mr-1">Fecha:</span>
              <span className="font-extrabold text-neutral-900 tabular-nums">{formatDate(project.date)}</span>
            </div>
            <div className="border border-neutral-300 rounded px-2.5 py-0.5 bg-neutral-50">
              <span className="text-neutral-500 font-bold mr-1">Estado:</span>
              <span className="font-black uppercase text-red-700">{project.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* ================= 2-COLUMN MAIN CONTENT GRID ================= */}
        <div className="grid grid-cols-2 gap-4 flex-1">
          {/* =========================================
              COLUMNA IZQUIERDA: PLAN (PASOS 1, 2, 3, 4)
             ========================================= */}
          <div className="flex flex-col gap-3">
            {/* PASO 1: CONTEXTO / ANTECEDENTES */}
            <div className="border border-neutral-400 rounded-md overflow-hidden flex flex-col">
              <PrintStepHeader step={1} hint="¿Por qué importa ahora?" />
              <div className="p-2 text-[11px] leading-relaxed text-neutral-800 whitespace-pre-wrap">
                {project.background || 'Sin contexto especificado.'}
              </div>
            </div>

            {/* PASO 2: SITUACIÓN ACTUAL */}
            <div className="border border-neutral-400 rounded-md overflow-hidden flex flex-col">
              <PrintStepHeader step={2} hint="Hechos y datos" />
              <div className="p-2 flex flex-col gap-2">
                {/* 5W1H Matrix Table */}
                {(project.w5h1.what || project.w5h1.where) && (
                  <div className="grid grid-cols-2 gap-1.5 bg-neutral-50 p-1.5 rounded border border-neutral-200 text-[10px]">
                    <div>
                      <strong className="text-neutral-900">Qué (What):</strong> {project.w5h1.what || '—'}
                    </div>
                    <div>
                      <strong className="text-neutral-900">Dónde (Where):</strong> {project.w5h1.where || '—'}
                    </div>
                    <div>
                      <strong className="text-neutral-900">Cuándo (When):</strong> {project.w5h1.when || '—'}
                    </div>
                    <div>
                      <strong className="text-neutral-900">Quién (Who):</strong> {project.w5h1.who || '—'}
                    </div>
                    <div className="col-span-2">
                      <strong className="text-neutral-900">Impacto (Why):</strong> {project.w5h1.why || '—'}
                    </div>
                    <div className="col-span-2">
                      <strong className="text-neutral-900">Magnitud (How much):</strong> {project.w5h1.how || '—'}
                    </div>
                  </div>
                )}
                <div className="text-[11px] leading-relaxed text-neutral-800 whitespace-pre-wrap">
                  {project.currentCondition || 'Sin descripción detallada.'}
                </div>
              </div>
            </div>

            {/* PASO 3: OBJETIVO / CONDICIÓN META */}
            <div className="border border-neutral-400 rounded-md overflow-hidden flex flex-col">
              <PrintStepHeader step={3} hint="Meta SMART" />
              <div className="p-2 text-[11px] font-semibold leading-relaxed text-neutral-900 bg-neutral-50/50 whitespace-pre-wrap">
                {project.goals || 'Sin objetivo establecido.'}
              </div>
            </div>

            {/* PASO 4: ANÁLISIS DE CAUSA RAÍZ */}
            <div className="border border-neutral-400 rounded-md overflow-hidden flex flex-col flex-1">
              <PrintStepHeader
                step={4}
                extra={project.rootCauseMode === 'tree' ? 'Árbol 5 Por Qués' : 'Ishikawa 6M'}
                hint="Diagrama"
              />

              {/* Printable Diagram Box with Auto-fit */}
              <div className="p-2 flex-1 flex flex-col justify-between overflow-hidden bg-neutral-50/30">
                {/* Diagram Vector Representation for Print */}
                <div className="w-full flex items-center justify-center overflow-hidden my-1">
                  <div className="origin-top scale-[0.72] transform-gpu">
                    {project.rootCauseMode === 'tree' ? (
                      <PrintableTree node={project.rootCauseTree} rootCauses={rootCauses} />
                    ) : (
                      <PrintableIshikawa ishikawa={project.rootCauseIshikawa} rootCauses={rootCauses} />
                    )}
                  </div>
                </div>

                {/* Identified Root Causes Box (Navy Blue) */}
                <div className="mt-2 pt-2 border-t-2 border-dashed border-neutral-300">
                  <div className="text-[10px] font-black text-[#0f274a] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3 text-red-600" />
                    <span>Causas Raíz Identificadas:</span>
                  </div>
                  {rootCauses.length === 0 ? (
                    <div className="text-[10px] text-neutral-500 italic">Ninguna causa marcada como raíz.</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {rootCauses.map((rc, idx) => (
                        <div
                          key={rc.id}
                          className="flex items-center gap-1.5 bg-[#0f274a] text-white px-2 py-0.5 rounded text-[10px] font-semibold"
                        >
                          <span className="w-3.5 h-3.5 bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-black shrink-0">
                            {idx + 1}
                          </span>
                          <span>{rc.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {project.rootCauseConclusions && (
                    <div className="mt-1 text-[10px] text-neutral-700 italic border-t border-neutral-200 pt-1">
                      <strong>Conclusión:</strong> {project.rootCauseConclusions}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================
              COLUMNA DERECHA: DO - CHECK - ACT (PASOS 5, 6, 7)
             ========================================= */}
          <div className="flex flex-col gap-3">
            {/* PASO 5: CONTRAMEDIDAS (PLAN DE ACCIÓN) */}
            <div className="border border-neutral-400 rounded-md overflow-hidden flex flex-col">
              <PrintStepHeader step={5} hint="Hacer (Do)" />
              <div className="p-2 flex flex-col gap-2">
                {/* Table of Action Items */}
                {project.actionItems && project.actionItems.length > 0 && (
                  <table className="w-full text-left border-collapse border border-neutral-300 text-[10px]">
                    <thead>
                      <tr className="bg-neutral-100 font-bold text-neutral-800">
                        <th className="p-1 border border-neutral-300 w-2/5">Acción</th>
                        <th className="p-1 border border-neutral-300 w-1/4">Causa Atacada</th>
                        <th className="p-1 border border-neutral-300 w-1/6">Responsable</th>
                        <th className="p-1 border border-neutral-300 w-14">Plazo</th>
                        <th className="p-1 border border-neutral-300 w-14 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.actionItems.map((act) => (
                        <tr key={act.id}>
                          <td className="p-1 border border-neutral-300 font-medium">{act.action}</td>
                          <td className="p-1 border border-neutral-300 text-neutral-800 text-[9.5px] font-semibold">
                            {causeLabel(act, causes) || <span className="text-neutral-400 font-normal italic">—</span>}
                          </td>
                          <td className="p-1 border border-neutral-300">{act.owner}</td>
                          <td className="p-1 border border-neutral-300 tabular-nums text-[9px]">
                            {formatDate(act.dueDate)}
                          </td>
                          <td className="p-1 border border-neutral-300 text-center font-bold">
                            {act.status === 'completed' && '✅ Hecho'}
                            {act.status === 'in_progress' && '⚙️ En curso'}
                            {act.status === 'pending' && '⏳ Pendiente'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {project.countermeasures?.trim() && (
                  <div className="text-[11px] leading-relaxed text-neutral-800 whitespace-pre-wrap">
                    <span className="font-bold">Notas: </span>
                    {project.countermeasures}
                  </div>
                )}
              </div>
            </div>

            {/* PASO 6: VERIFICACIÓN DE RESULTADOS */}
            <div className="border border-neutral-400 rounded-md overflow-hidden flex flex-col">
              <PrintStepHeader step={6} hint="Verificar (Check)" />
              <div className="p-2 flex flex-col gap-2">
                {/* Metric Strip */}
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-neutral-50 rounded border border-neutral-200 text-center text-[10px]">
                  <div>
                    <span className="font-bold text-neutral-500 block">Antes (Base)</span>
                    <span className="text-sm font-black text-red-600 tabular-nums">{metrics.before || '—'}</span>
                  </div>
                  <div className="border-x border-neutral-200">
                    <span className="font-bold text-neutral-500 block">Meta</span>
                    <span className="text-sm font-black text-blue-700 tabular-nums">{metrics.target || '—'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-500 block">Resultado</span>
                    <span className="text-sm font-black text-emerald-700 tabular-nums">{metrics.after || '—'}</span>
                  </div>
                </div>

                {project.indicator && validMeasurements(project.indicator).length > 0 && (
                  <div data-print-indicator>
                    <div className="text-[10px] font-bold text-neutral-700 mb-0.5">
                      {project.indicator.name || 'Indicador'}
                      {printStatus && <span className="font-normal text-neutral-600"> · {printStatus}</span>}
                    </div>
                    <IndicatorChart indicator={project.indicator} printMode height={130} />
                  </div>
                )}

                <div className="text-[11px] leading-relaxed text-neutral-800 whitespace-pre-wrap">
                  {project.check || 'Sin datos de verificación.'}
                </div>
              </div>
            </div>

            {/* PASO 7: SEGUIMIENTO Y ESTANDARIZACIÓN (YOKOTEN) */}
            <div className="border border-neutral-400 rounded-md overflow-hidden flex flex-col flex-1">
              <PrintStepHeader step={7} hint="Asegurar y replicar (Act)" />
              <div className="p-2 text-[11px] leading-relaxed text-neutral-800 whitespace-pre-wrap flex-1">
                {project.followUp || 'Sin acciones de estandarización.'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Seal & Verification */}
        <div className="mt-2 pt-2 border-t border-neutral-300 flex items-center justify-between text-[9px] text-neutral-500 tabular-nums">
          <span>Formato A3 · Ciclo PDCA Completo</span>
          <span>Impreso en papel DIN A3 Horizontal (420 × 297 mm)</span>
          <span>
            {project.review?.state === 'aprobado' && project.review.decidedBy
              ? `Aprobado por ${project.review.decidedBy} · ${(project.review.decidedAt || '').slice(0, 10).split('-').reverse().join('/')}`
              : 'Aprobación: _____________________'}
          </span>
        </div>
      </div>
    </div>
  );
};
