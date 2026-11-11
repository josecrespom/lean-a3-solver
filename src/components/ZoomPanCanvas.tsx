import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Hand, Scan } from 'lucide-react';

interface ZoomPanCanvasProps {
  children: React.ReactNode;
  className?: string;
  minZoom?: number;
  maxZoom?: number;
  /** Al cambiar este valor (p. ej. árbol ↔ Ishikawa) se vuelve a encuadrar el diagrama */
  fitKey?: string | number;
  /**
   * El lienzo toma la altura del diagrama encuadrado a lo ancho (entre min y max px),
   * en lugar de ocupar todo el hueco disponible: evita un diagrama pequeño rodeado de
   * espacio vacío en columnas estrechas.
   */
  fitHeight?: { min: number; max: number };
}

// Margen alrededor del diagrama, en píxeles de pantalla
const PAD = 24;
// Al encuadrar automáticamente no se baja de este zoom para que el texto siga legible
const MIN_AUTO_FIT = 0.45;
// Hueco reservado para las barras de desplazamiento (Windows: hasta 17 px)
const SCROLLBAR_ROOM = 18;
// Con fitHeight: espacio para el aviso de arriba y los controles de zoom de abajo
const CHROME_ROOM = 80;

interface Size {
  w: number;
  h: number;
}

/**
 * Lienzo con zoom y desplazamiento para diagramas grandes.
 * El zoom cambia el tamaño real del área desplazable (no solo el dibujo), así
 * se puede llegar a cualquier parte del diagrama con cualquier zoom.
 * Mientras el usuario no toque el zoom, el diagrama se mantiene encuadrado
 * (también al ampliar a pantalla completa o al añadir causas).
 */
export const ZoomPanCanvas: React.FC<ZoomPanCanvasProps> = ({
  children,
  className = '',
  minZoom = 0.3,
  maxZoom = 2,
  fitKey,
  fitHeight,
}) => {
  const [zoom, setZoom] = useState(1);
  /** Altura del lienzo con fitHeight (se fija al encuadrar; el zoom manual no la cambia) */
  const [boxHeight, setBoxHeight] = useState<number | null>(null);
  const [content, setContent] = useState<Size>({ w: 0, h: 0 });
  const [viewport, setViewport] = useState<Size>({ w: 0, h: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(true);

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const autoFitRef = useRef(true); // encuadre automático hasta que el usuario haga zoom
  const anchorRef = useRef<{ cx: number; cy: number; px: number; py: number } | null>(null);
  const dragRef = useRef({ active: false, x: 0, y: 0, left: 0, top: 0 });

  // Geometría: tamaño del área desplazable y posición del diagrama dentro
  const scaledW = content.w * zoom;
  const scaledH = content.h * zoom;
  const areaW = Math.max(scaledW + PAD * 2, viewport.w);
  const areaH = Math.max(scaledH + PAD * 2, viewport.h);
  const left = Math.max(PAD, (areaW - scaledW) / 2);
  const top = Math.max(PAD, (areaH - scaledH) / 2);

  // Medir el diagrama (tamaño natural, sin zoom) y el visor
  useEffect(() => {
    const c = contentRef.current;
    const v = viewportRef.current;
    if (!c || !v) return;
    const ro = new ResizeObserver(() => {
      setContent({ w: c.offsetWidth, h: c.offsetHeight });
      setViewport({ w: v.clientWidth, h: v.clientHeight });
    });
    ro.observe(c);
    ro.observe(v);
    return () => ro.disconnect();
  }, []);

  const fitZoom = useCallback(() => {
    if (!content.w || !content.h || !viewport.w || !viewport.h) return null;
    if (fitHeight) {
      // A lo ancho, sin pasar de la altura máxima del lienzo
      const z = Math.min(
        (viewport.w - PAD * 2 - SCROLLBAR_ROOM) / content.w,
        (fitHeight.max - PAD * 2 - SCROLLBAR_ROOM - CHROME_ROOM) / content.h,
        1
      );
      return Math.floor(Math.max(z, MIN_AUTO_FIT, minZoom) * 100) / 100;
    }
    // Se reserva el hueco de las barras de desplazamiento y se redondea HACIA ABAJO:
    // así el diagrama encuadrado nunca provoca barras (que cambiarían el hueco
    // disponible y harían oscilar el encuadre).
    const z = Math.min(
      (viewport.w - PAD * 2 - SCROLLBAR_ROOM) / content.w,
      (viewport.h - PAD * 2 - SCROLLBAR_ROOM) / content.h,
      1
    );
    return Math.floor(Math.max(z, MIN_AUTO_FIT, minZoom) * 100) / 100;
  }, [content, viewport, minZoom, fitHeight]);

  /** Altura del lienzo para un zoom encuadrado (solo con fitHeight) */
  const heightFor = useCallback(
    (z: number) =>
      fitHeight
        ? Math.round(
            Math.min(fitHeight.max, Math.max(fitHeight.min, content.h * z + PAD * 2 + SCROLLBAR_ROOM + CHROME_ROOM))
          )
        : null,
    [fitHeight, content.h]
  );

  // Encuadre automático. Solo se recalcula si el hueco o el diagrama cambian de
  // verdad (más que el grosor de una barra de desplazamiento).
  const lastFitRef = useRef<{ vw: number; vh: number; cw: number; ch: number } | null>(null);
  useEffect(() => {
    if (!autoFitRef.current) return;
    const last = lastFitRef.current;
    if (
      last &&
      last.cw === content.w &&
      last.ch === content.h &&
      Math.abs(last.vw - viewport.w) < SCROLLBAR_ROOM + 8 &&
      (fitHeight || Math.abs(last.vh - viewport.h) < SCROLLBAR_ROOM + 8)
    ) {
      return;
    }
    const z = fitZoom();
    if (z !== null) {
      lastFitRef.current = { vw: viewport.w, vh: fitHeight ? 0 : viewport.h, cw: content.w, ch: content.h };
      setZoom(z);
      setBoxHeight(heightFor(z));
    }
  }, [fitZoom, heightFor, fitHeight, content, viewport]);

  // Al cambiar de diagrama, volver a encuadrar
  useEffect(() => {
    autoFitRef.current = true;
    lastFitRef.current = null;
    const z = fitZoom();
    if (z !== null) {
      setZoom(z);
      setBoxHeight(heightFor(z));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // Tras un cambio de zoom, mantener fijo el punto bajo el ratón o el centro
  useLayoutEffect(() => {
    const v = viewportRef.current;
    const a = anchorRef.current;
    if (!v) return;
    if (a) {
      v.scrollLeft = a.cx * zoom + left - a.px;
      v.scrollTop = a.cy * zoom + top - a.py;
      anchorRef.current = null;
    } else if (autoFitRef.current) {
      v.scrollLeft = (areaW - v.clientWidth) / 2;
      v.scrollTop = (areaH - v.clientHeight) / 2;
    }
  }, [zoom, left, top, areaW, areaH]);

  const zoomTo = useCallback(
    (next: number, pointer?: { x: number; y: number }) => {
      const v = viewportRef.current;
      if (!v) return;
      const z = Math.round(Math.min(Math.max(next, minZoom), maxZoom) * 100) / 100;
      const px = pointer?.x ?? v.clientWidth / 2;
      const py = pointer?.y ?? v.clientHeight / 2;
      anchorRef.current = {
        cx: (v.scrollLeft + px - left) / zoom,
        cy: (v.scrollTop + py - top) / zoom,
        px,
        py,
      };
      autoFitRef.current = false;
      setZoom(z);
    },
    [left, top, zoom, minZoom, maxZoom]
  );

  const handleFit = () => {
    autoFitRef.current = true;
    const z = fitZoom();
    if (z !== null) {
      lastFitRef.current = { vw: viewport.w, vh: fitHeight ? 0 : viewport.h, cw: content.w, ch: content.h };
      setZoom(z);
      setBoxHeight(heightFor(z));
    }
  };

  // Ctrl / Cmd + rueda: zoom centrado en el puntero
  const zoomToRef = useRef(zoomTo);
  zoomToRef.current = zoomTo;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomToRef.current(zoomRef.current * (1 - e.deltaY * 0.0015), {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Arrastrar para desplazarse (sin interferir con campos y botones del diagrama)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Al tocar el diagrama se deja de encuadrar solo, para que no se mueva mientras se edita
    autoFitRef.current = false;
    if (e.button !== 0 && e.button !== 1) return;
    if ((e.target as HTMLElement).closest('input, textarea, button, select, a, [role="button"], .no-drag')) return;
    const v = viewportRef.current;
    if (!v) return;
    dragRef.current = { active: true, x: e.clientX, y: e.clientY, left: v.scrollLeft, top: v.scrollTop };
    setIsDragging(true);
    setShowHint(false);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      const v = viewportRef.current;
      if (!d.active || !v) return;
      e.preventDefault();
      v.scrollLeft = d.left - (e.clientX - d.x);
      v.scrollTop = d.top - (e.clientY - d.y);
    };
    const onUp = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const toolBtn =
    'p-1 rounded text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors';

  return (
    <div
      style={fitHeight ? { height: boxHeight ?? fitHeight.max } : undefined}
      data-fit-height={fitHeight ? 'si' : undefined}
      className={`relative w-full flex flex-col ${fitHeight ? '' : 'h-full min-h-[400px]'} bg-neutral-50/70 dark:bg-neutral-950/80 border border-neutral-200 dark:border-neutral-800 rounded-lg transition-colors ${className}`}
    >
      {showHint && (
        <div className="no-print absolute top-2.5 left-3 flex items-center gap-1.5 bg-white/90 dark:bg-neutral-900/90 px-2.5 py-1 rounded-md border border-neutral-200/80 dark:border-neutral-700 shadow-2xs text-[11px] font-medium text-neutral-600 dark:text-neutral-300 pointer-events-none z-20">
          <Hand className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
          <span>Arrastra para moverte · Ctrl + rueda para hacer zoom</span>
        </div>
      )}

      <div
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onFocusCapture={() => {
          autoFitRef.current = false;
        }}
        className="zoom-pan-viewport @container/lienzo absolute inset-0 overflow-auto custom-scrollbar select-none rounded-lg"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* Área desplazable con el tamaño real del diagrama ampliado o reducido */}
        <div style={{ position: 'relative', width: areaW, height: areaH }}>
          <div
            ref={contentRef}
            className="diagram-canvas-inner w-max"
            style={{
              position: 'absolute',
              left,
              top,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              visibility: content.w ? 'visible' : 'hidden',
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* Controles de zoom */}
      <div className="no-print absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 dark:bg-neutral-900/95 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 shadow-sm z-30">
        <button
          type="button"
          onClick={() => zoomTo(zoom - 0.15)}
          title="Alejar (Ctrl + rueda)"
          aria-label="Alejar"
          className={toolBtn}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => zoomTo(1)}
          title="Ver al 100%"
          className="text-[11px] tabular-nums text-neutral-700 dark:text-neutral-300 font-semibold px-1 min-w-[3.2rem] text-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => zoomTo(zoom + 0.15)}
          title="Acercar (Ctrl + rueda)"
          aria-label="Acercar"
          className={toolBtn}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="h-3 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5" />
        <button
          type="button"
          onClick={handleFit}
          title="Encuadrar el diagrama completo"
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <Scan className="w-3.5 h-3.5" />
          <span>Ajustar</span>
        </button>
      </div>
    </div>
  );
};
