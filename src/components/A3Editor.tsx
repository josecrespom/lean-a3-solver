import React, { useState } from 'react';
import { EditorToolbar } from './editor/EditorToolbar';
import { rootCausesOf } from '../utils/rootCauses';
import { A3Project } from '../types/lean';
import { ZoomableSection } from './ZoomableSection';
import { A3PrintModal } from './A3PrintModal';
import { A3PrintSheet } from './A3PrintSheet';
import { SenseiGuide } from './SenseiGuide';
import { StepFields } from './editor/StepFields';
import { A3Header } from './editor/A3Header';
import { STEPS } from './editor/steps';
import { useEditorDraft } from './editor/useEditorDraft';
import { GuidedMode } from './editor/GuidedMode';
import { StepHelpers } from './editor/StepHelpers';
import { ReviewPanel, ReviewSummary, reviewStartsOpen } from './ReviewPanel';
import { openComments } from '../utils/review';
import { QualityChecklist } from './QualityChecklist';

interface A3EditorProps {
  project: A3Project;
  onSave: (updated: A3Project, isAutoSave?: boolean) => void;
  onCancel: () => void;
  onPrint?: () => void;
  initialMode?: 'sheet' | 'guided';
  /** Se incrementa cuando el A3 abierto recibe cambios de otras personas (fusión en caliente) */
  externalRevision?: number;
  /** Nombre de quien usa la app y nombres conocidos (para elegir revisor) */
  userName?: string;
  knownNames?: string[];
  /** Abrir las versiones anteriores de este A3 */
  onShowHistory?: () => void;
}

export const A3Editor: React.FC<A3EditorProps> = ({
  project,
  onSave,
  onCancel,
  initialMode = 'sheet',
  externalRevision = 0,
  userName = '',
  knownNames = [],
  onShowHistory,
}) => {
  const { data, saveStatus, lastSavedTime, update, handleChange } = useEditorDraft(project, onSave, externalRevision);
  const [show5W1H, setShow5W1H] = useState<boolean>(project.show5W1H ?? false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const [showCompletenessBreakdown, setShowCompletenessBreakdown] = useState<boolean>(false);

  // View Mode: Full Sheet vs Guided Assistant Wizard
  const [editorMode, setEditorMode] = useState<'sheet' | 'guided'>(initialMode);
  const [guidedStep, setGuidedStep] = useState<number>(1);

  // Step 5 Tab: 5W2H Table vs 2x2 Prioritization Matrix
  const [step5Tab, setStep5Tab] = useState<'5w2h' | 'matrix'>('5w2h');

  // Interactive Guides and Quality Checklist expansions
  const [activeGuides, setActiveGuides] = useState<Record<number, boolean>>({});
  const [activeChecklists, setActiveChecklists] = useState<Record<number, boolean>>({});
  // Paso sobre el que comentar al pulsar el contador de comentarios de una sección
  const [commentFocus, setCommentFocus] = useState<number | null>(null);
  // Panel de revisión: su resumen va en la barra del editor y el panel, debajo
  const [reviewOpen, setReviewOpen] = useState(() => reviewStartsOpen(project));
  const [reviewRequesting, setReviewRequesting] = useState(false);
  const expandReview = React.useCallback(() => setReviewOpen(true), []);
  const clearCommentFocus = React.useCallback(() => setCommentFocus(null), []);

  const toggleGuide = (step: number) => {
    setActiveGuides((prev) => ({ ...prev, [step]: !prev[step] }));
  };

  const toggleChecklist = (step: number) => {
    setActiveChecklists((prev) => ({ ...prev, [step]: !prev[step] }));
  };

  const handleToggleQualityCheck = (criterionId: string) =>
    update((prev) => ({ qualityChecks: { ...prev.qualityChecks, [criterionId]: !prev.qualityChecks?.[criterionId] } }));

  const rootCauses = rootCausesOf(data);

  const handleSynthesize5W1H = (synthesized: string) => {
    handleChange(
      'currentCondition',
      data.currentCondition ? `${data.currentCondition}\n\n${synthesized}` : synthesized
    );
  };

  const handleOpenPrintModal = () => {
    setIsPrintModalOpen(true);
  };

  // Propiedades comunes de los campos de cada paso (lámina y asistente)
  const stepFieldProps = {
    data,
    onChange: handleChange,
    rootCauses,
    show5W1H,
    onToggle5W1H: () => setShow5W1H((v) => !v),
    onSynthesize5W1H: handleSynthesize5W1H,
    step5Tab,
    onStep5Tab: setStep5Tab,
  };

  return (
    <>
      {/* =========================================================================
          PRINT-ONLY DOCUMENT: Rendered strictly when window.print() is executed
         ========================================================================= */}
      <div className="print-only hidden print:block">
        <A3PrintSheet project={data} />
      </div>

      {/* =========================================================================
          SCREEN-ONLY INTERACTIVE EDITOR: Hidden when printing
         ========================================================================= */}
      <div className="screen-only print:hidden max-w-[1700px] mx-auto p-4 sm:p-6 pb-16">
        <EditorToolbar
          data={data}
          project={project}
          saveStatus={saveStatus}
          lastSavedTime={lastSavedTime}
          editorMode={editorMode}
          onModeChange={setEditorMode}
          showBreakdown={showCompletenessBreakdown}
          onToggleBreakdown={() => setShowCompletenessBreakdown((prev) => !prev)}
          onPrint={handleOpenPrintModal}
          onShowHistory={onShowHistory}
          onBack={onCancel}
          review={
            <ReviewSummary
              data={data}
              userName={userName}
              expanded={reviewOpen}
              onToggle={() => setReviewOpen((v) => !v)}
              onRequest={() => {
                setReviewOpen(true);
                setReviewRequesting(true);
              }}
            />
          }
        />

        <ReviewPanel
          data={data}
          userName={userName}
          knownNames={knownNames}
          onChangeReview={(r) => handleChange('review', r)}
          onChangeComments={(c) => handleChange('comments', c)}
          focusStep={commentFocus}
          onFocusHandled={clearCommentFocus}
          expanded={reviewOpen}
          onExpand={expandReview}
          requesting={reviewRequesting}
          onRequesting={setReviewRequesting}
        />

        {editorMode === 'guided' ? (
          <GuidedMode
            data={data}
            step={guidedStep}
            onStep={setGuidedStep}
            onExit={() => setEditorMode('sheet')}
            fieldProps={stepFieldProps}
            onToggleQualityCheck={handleToggleQualityCheck}
            userName={userName}
          />
        ) : (
          /* A3 SHEET CONTAINER */
          <div className="a3-sheet-container bg-white dark:bg-neutral-900 border-2 border-neutral-800 dark:border-neutral-700 shadow-xl rounded-xl p-6 md:p-8 flex flex-col gap-5 text-neutral-900 dark:text-neutral-100 transition-colors">
            <A3Header data={data} onChange={handleChange} />

            {/* 2-COLUMN A3 MAIN GRID: izquierda PLAN (pasos 1-4), derecha DO-CHECK-ACT (5-7) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {(['left', 'right'] as const).map((column) => (
                <div key={column} className="flex flex-col gap-4">
                  {STEPS.filter((st) => st.column === column).map((st) => (
                    <ZoomableSection
                      key={st.step}
                      stepNumber={String(st.step)}
                      title={st.title}
                      subtitle={
                        st.step === 5 && rootCauses.length > 0
                          ? `Acciones directas para neutralizar las ${rootCauses.length} causa(s) raíz identificadas en el paso 4.`
                          : st.subtitle
                      }
                      className={st.step === 4 || st.step === 7 ? 'flex-1' : ''}
                      extraHeaderActions={
                        <div className="flex items-center gap-1.5">
                          <StepHelpers
                            step={st.step}
                            guideOpen={Boolean(activeGuides[st.step])}
                            checklistOpen={Boolean(activeChecklists[st.step])}
                            openComments={openComments(data, st.step).length}
                            onToggleGuide={() => toggleGuide(st.step)}
                            onToggleChecklist={() => toggleChecklist(st.step)}
                            onComment={() => setCommentFocus(st.step)}
                          />
                          {st.step === 5 && rootCauses.length > 0 && (
                            <span
                              className="no-print text-[10px] font-bold bg-neutral-700 text-white px-1.5 py-0.5 rounded"
                              title={`${rootCauses.length} causa(s) raíz a resolver`}
                            >
                              {rootCauses.length} causas
                            </span>
                          )}
                        </div>
                      }
                    >
                      {activeGuides[st.step] && (
                        <div className="mb-3">
                          <SenseiGuide stepNumber={st.step} hideToggle />
                        </div>
                      )}
                      {activeChecklists[st.step] && (
                        <div className="mb-3">
                          <QualityChecklist
                            stepNumber={st.step}
                            qualityChecks={data.qualityChecks}
                            onToggleCheck={handleToggleQualityCheck}
                          />
                        </div>
                      )}
                      <StepFields step={st.step} variant="sheet" {...stepFieldProps} />
                    </ZoomableSection>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Print Preview Modal */}
      <A3PrintModal isOpen={isPrintModalOpen} project={data} onClose={() => setIsPrintModalOpen(false)} />
    </>
  );
};
