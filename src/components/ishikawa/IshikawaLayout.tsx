import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { IshikawaCategory } from '../../types/lean';

export type RibPosition = 'top' | 'bottom';

/** Medidas de cada variante: editor (pantalla) o lámina impresa */
const SIZES = {
  editor: {
    // Lienzo estrecho (columna de la lámina, asistente): versión compacta para que se lea
    row: 'justify-center gap-8 min-h-[220px] px-8 @max-[1000px]/lienzo:gap-3 @max-[1000px]/lienzo:px-2 @max-[1000px]/lienzo:min-h-[160px]',
    spine: 'h-3 min-w-[760px] @max-[1000px]/lienzo:min-w-[500px] bg-neutral-800 dark:bg-neutral-700 shadow-xs',
    triangle: 'border-t-[28px] border-b-[28px] border-l-[36px] border-l-neutral-800 dark:border-l-neutral-700',
    head: 'ml-3',
  },
  print: {
    // En la lámina las espinas se reparten a lo ancho del recuadro
    row: 'justify-around gap-6 min-h-[90px] px-4',
    spine: 'h-2 min-w-[520px] bg-neutral-900 shadow-2xs',
    triangle: 'border-t-[18px] border-b-[18px] border-l-[24px] border-l-neutral-900',
    head: 'ml-2',
  },
} as const;

interface Props {
  categories: IshikawaCategory[];
  variant: keyof typeof SIZES;
  /** Contenido de cada espina (encabezado y causas); `position` dice si va arriba o abajo */
  renderColumn: (category: IshikawaCategory, position: RibPosition) => React.ReactNode;
  /** Cabeza del pez (el problema) */
  head: React.ReactNode;
}

/**
 * Geometría de la espina de pescado, común al editor y a la lámina impresa.
 * Las filas superior e inferior tienen la misma altura (rejilla 1fr/auto/1fr):
 * la espina queda siempre en el centro vertical, alineada con el triángulo y
 * la cabeza aunque una categoría tenga muchas más causas que las demás.
 */
export const IshikawaLayout: React.FC<Props> = ({ categories, variant, renderColumn, head }) => {
  const size = SIZES[variant];
  const half = Math.ceil(categories.length / 2);
  const top = categories.slice(0, half);
  const bottom = categories.slice(half);
  return (
    <div className="relative flex items-center justify-center" data-ishikawa-layout={variant}>
      <div className="grid grid-rows-[1fr_auto_1fr] justify-items-center">
        <div className={`flex items-end w-full ${size.row}`}>
          {top.map((cat) => (
            <React.Fragment key={cat.id}>{renderColumn(cat, 'top')}</React.Fragment>
          ))}
        </div>
        <div
          data-ishikawa="espina"
          className={`relative w-full rounded-full flex items-center justify-end z-10 ${size.spine}`}
        >
          {variant === 'editor' && (
            <div className="absolute inset-0 flex items-center justify-around opacity-30 pointer-events-none">
              {[0, 1, 2, 3].map((i) => (
                <ArrowRight key={i} className="w-4 h-4 text-white" />
              ))}
            </div>
          )}
        </div>
        <div className={`flex items-start w-full ${size.row}`}>
          {bottom.map((cat) => (
            <React.Fragment key={cat.id}>{renderColumn(cat, 'bottom')}</React.Fragment>
          ))}
        </div>
      </div>
      <div
        data-ishikawa="triangulo"
        className={`w-0 h-0 border-t-transparent border-b-transparent shrink-0 -ml-1 z-10 ${size.triangle}`}
      />
      <div data-ishikawa="cabeza" className={`relative shrink-0 z-20 ${size.head}`}>
        {head}
      </div>
    </div>
  );
};
