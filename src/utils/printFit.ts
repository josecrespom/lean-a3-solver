// Ajuste de la lámina A3 a una sola hoja al imprimir ("ajustar a una página").
// Si el contenido no cabe en un DIN A3 apaisado, se reduce lo justo y se
// ensancha la lámina para que siga ocupando todo el ancho del papel.

/**
 * Calcula el zoom necesario para que `el` quepa en una hoja A3 apaisada
 * (420 × 297 mm con márgenes de 6 mm). `el` debe estar maquetado (visible o
 * fuera de pantalla). Es autocontenida para poder incrustarse en el HTML
 * imprimible descargable.
 */
export function computeA3Fit(el: HTMLElement): { zoom: number; width: string } {
  const MM = 96 / 25.4;
  const PAGE_W = (420 - 12) * MM;
  const PAGE_H = (297 - 12) * MM;
  const style = el.style as CSSStyleDeclaration & { zoom: string };
  const html = document.documentElement;
  const prev = { font: html.style.fontSize, width: style.width, zoom: style.zoom };

  html.style.fontSize = '11px'; // tamaño base que usa la hoja impresa
  style.zoom = '1';
  let z = 1;
  for (let i = 0; i < 6; i++) {
    style.width = `${PAGE_W / z}px`;
    const h = el.offsetHeight; // altura de maquetación (no le afectan los transform)
    const next = Math.min(1, PAGE_H / h);
    if (Math.abs(next - z) < 0.003) {
      z = next;
      break;
    }
    z = next;
  }
  html.style.fontSize = prev.font;
  style.width = prev.width;
  style.zoom = prev.zoom;

  z = z < 1 ? Math.floor(z * 0.985 * 1000) / 1000 : 1; // pequeño margen de seguridad
  return { zoom: z, width: z < 1 ? `${PAGE_W / z}px` : '100%' };
}

/** Aplica el ajuste a la lámina oculta que usa la app al imprimir. */
export function fitAppPrintSheet() {
  const el = document.querySelector<HTMLElement>('.print-only .a3-print-document');
  const host = el?.closest<HTMLElement>('.print-only');
  if (!el || !host) return;
  const prevCss = host.style.cssText;
  // Maquetar fuera de pantalla para poder medir
  host.style.cssText += ';display:block;position:absolute;left:-100000px;top:0;';
  const { zoom, width } = computeA3Fit(el);
  host.style.cssText = prevCss;
  el.style.setProperty('--a3-print-zoom', String(zoom));
  el.style.setProperty('--a3-print-width', width);
}

export function resetAppPrintSheet() {
  const el = document.querySelector<HTMLElement>('.print-only .a3-print-document');
  el?.style.removeProperty('--a3-print-zoom');
  el?.style.removeProperty('--a3-print-width');
}

export function installPrintFit() {
  window.addEventListener('beforeprint', fitAppPrintSheet);
  window.addEventListener('afterprint', resetAppPrintSheet);
}
