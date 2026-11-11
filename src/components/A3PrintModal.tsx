import { computeA3Fit } from '../utils/printFit';
import { Modal } from './ui/Modal';
import React, { useEffect, useState } from 'react';
import { A3Project } from '../types/lean';
import { A3PrintSheet } from './A3PrintSheet';
import { Printer, Download, ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';
import { buttonClass } from './ui/Button';
import { saveFile } from '../utils/saveFile';

interface A3PrintModalProps {
  isOpen: boolean;
  project: A3Project;
  onClose: () => void;
}

const handleNativePrint = () => {
  // Focus window and trigger browser print dialog
  window.focus();
  setTimeout(() => {
    window.print();
  }, 150);
};

export const A3PrintModal: React.FC<A3PrintModalProps> = ({ isOpen, project, onClose }) => {
  const [previewZoom, setPreviewZoom] = useState<number>(0.75);
  // Reducción necesaria para que la lámina quepa en una hoja A3 al imprimir
  const [fitZoom, setFitZoom] = useState<number>(1);

  useEffect(() => {
    // Se recalcula al abrir y cuando cambia el A3 que se imprime
    if (!isOpen || !project) return;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('#a3-printable-document-node .a3-print-document');
      if (el) setFitZoom(computeA3Fit(el).zoom);
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleDownloadPrintableHtml = () => {
    // Generate self-contained standalone HTML file for guaranteed offline or external printing
    const printElement = document.getElementById('a3-printable-document-node');
    const printInner = printElement?.querySelector('.a3-print-document') || printElement;
    const contentHtml = printInner ? printInner.outerHTML : '';
    // Copia los estilos ya compilados de la app (Tailwind + fuente Manrope embebida)
    // para que el archivo funcione sin conexión a internet.
    const appStyles = Array.from(document.querySelectorAll('style'))
      .map((el) => el.outerHTML)
      .join('\n');

    const standaloneHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>A3 - ${project.title.replace(/"/g, '&quot;')}</title>
  ${appStyles}
  <style>
    @page {
      size: A3 landscape;
      size: 420mm 297mm;
      margin: 8mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 10px;
      font-family: 'Manrope Variable', 'Manrope', system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-bar {
      background: #1e293b;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .print-btn {
      background: #dc2626;
      color: white;
      border: none;
      padding: 8px 18px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }
    .print-btn:hover { background: #b91c1c; }
    @media print {
      body { background: white; padding: 0; }
      .print-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <strong style="font-size: 16px;">Informe A3 Lean · Listo para Imprimir</strong>
      <div style="font-size: 12px; opacity: 0.8;">Selecciona tamaño A3 y orientación Horizontal en las opciones de impresión.</div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ Imprimir Ahora</button>
  </div>
  ${contentHtml}
  <script>
    // Ajustar la lámina a una sola hoja A3 al imprimir
    var computeA3Fit = ${computeA3Fit.toString()};
    window.addEventListener('beforeprint', function () {
      var el = document.querySelector('.a3-print-document');
      if (!el) return;
      var fit = computeA3Fit(el);
      el.style.setProperty('--a3-print-zoom', String(fit.zoom));
      el.style.setProperty('--a3-print-width', fit.width);
    });
    window.addEventListener('afterprint', function () {
      var el = document.querySelector('.a3-print-document');
      if (el) { el.style.removeProperty('--a3-print-zoom'); el.style.removeProperty('--a3-print-width'); }
    });
  </script>
</body>
</html>`;

    void saveFile(
      `A3_${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_imprimible.html`,
      standaloneHtml,
      'text/html;charset=utf-8'
    );
  };

  const zoomBar = (
    <div className="hidden sm:flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 text-xs">
      <span className="text-neutral-600 dark:text-neutral-300 tabular-nums text-[11px] px-1">
        {Math.round(previewZoom * 100)}%
      </span>
      <button
        type="button"
        onClick={() => setPreviewZoom((z) => Math.min(z + 0.1, 1.3))}
        className="p-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
        aria-label="Aumentar zoom de vista previa"
        title="Aumentar zoom de vista previa"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setPreviewZoom(0.75)}
        className="p-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
        aria-label="Restablecer tamaño (75%)"
        title="Restablecer tamaño (75%)"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setPreviewZoom((z) => Math.max(z - 0.1, 0.4))}
        className="p-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
        aria-label="Disminuir zoom de vista previa"
        title="Disminuir zoom de vista previa"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="fullscreen"
      zIndex="z-50"
      closeLabel="Cerrar vista previa"
      icon={<span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded tracking-wider">DIN A3</span>}
      title="Vista Previa e Impresión DIN A3 Horizontal"
      description="Formato estándar 420 × 297 mm · Estructura completa Lean A3"
      actions={
        <>
          {zoomBar}
          <button
            type="button"
            onClick={handleDownloadPrintableHtml}
            className={buttonClass('secondary', 'sm')}
            title="Descargar archivo HTML autónomo para abrir e imprimir en cualquier navegador"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline">Descargar HTML Imprimible</span>
          </button>
          <button
            type="button"
            onClick={handleNativePrint}
            className={buttonClass('brand', 'sm')}
            title="Lanzar diálogo de impresión del navegador"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar PDF</span>
          </button>
        </>
      }
    >
      {/* Recommended Print Settings Callout */}
      <div className="bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-800/80 px-6 py-2 text-xs text-amber-950 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <span className="font-semibold">Recomendaciones para imprimir a la perfección:</span>
          <span className="text-amber-900 dark:text-amber-300">
            1. Destino: <strong>Guardar como PDF</strong> o tu impresora A3 · 2. Orientación:{' '}
            <strong>Horizontal (Landscape)</strong> · 3. Marcar casilla: <strong>"Gráficos de fondo"</strong>.
          </span>
        </div>
        <span className="text-[11px] text-amber-800 dark:text-amber-400 font-medium">
          (Si tu impresora es A4, selecciona la opción "Ajustar al área de impresión")
        </span>
      </div>

      {fitZoom < 1 && (
        <div
          role="status"
          className={`shrink-0 px-6 py-2 text-xs font-medium border-b ${
            fitZoom < 0.75 ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-blue-50 text-blue-950 border-blue-200'
          }`}
        >
          Este A3 no cabe en una hoja: al imprimir se reducirá al {Math.round(fitZoom * 100)}% para que entre completo
          en el DIN A3.
          {fitZoom < 0.75 &&
            ' El texto saldrá pequeño; conviene resumir los pasos más extensos (un A3 debe leerse de un vistazo).'}
        </div>
      )}

      {/* Main Preview Viewport */}
      <div className="flex-1 overflow-auto custom-scrollbar p-6 flex justify-center bg-neutral-800/80 dark:bg-neutral-950">
        <div
          id="a3-printable-document-node"
          className="transition-transform duration-150 ease-out origin-top shrink-0 my-4 shadow-2xl bg-white"
          style={{
            transform: `scale(${previewZoom})`,
            width: '420mm',
            minHeight: '297mm',
          }}
        >
          <A3PrintSheet project={project} />
        </div>
      </div>
    </Modal>
  );
};
