import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

interface AutoTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Impide saltos de línea (Intro no añade línea), pero el texto sigue ajustándose al ancho */
  singleLine?: boolean;
  /** Altura mínima en líneas (el campo crece por encima de ella con el texto) */
  minRows?: number;
}

/**
 * Campo de texto que crece en altura con su contenido, para que nunca quede
 * texto oculto o cortado (celdas de tabla, causas de diagramas…).
 */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ singleLine = false, minRows, className = '', value, onChange, onKeyDown, style, ...rest }, ref) => {
    const inner = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);

    const resize = () => {
      const el = inner.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };

    useLayoutEffect(resize, [value]);

    // Recalcular si cambia el ancho disponible (columnas de tabla, ventana…)
    useLayoutEffect(() => {
      const el = inner.current;
      if (!el) return;
      let lastWidth = el.offsetWidth;
      const ro = new ResizeObserver(() => {
        if (el.offsetWidth !== lastWidth) {
          lastWidth = el.offsetWidth;
          resize();
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    return (
      <textarea
        ref={inner}
        rows={1}
        spellCheck
        lang="es"
        value={value}
        onChange={(e) => {
          if (singleLine && e.target.value.includes('\n')) {
            e.target.value = e.target.value.replace(/\s*\n\s*/g, ' ');
          }
          onChange?.(e);
        }}
        onKeyDown={(e) => {
          if (singleLine && e.key === 'Enter') e.preventDefault();
          onKeyDown?.(e);
        }}
        className={`block resize-none overflow-hidden ${className}`}
        style={minRows ? { minHeight: `calc(${minRows} * 1.625em + 0.75rem)`, ...style } : style}
        {...rest}
      />
    );
  }
);
AutoTextarea.displayName = 'AutoTextarea';
