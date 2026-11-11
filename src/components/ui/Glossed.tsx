import React from 'react';
import { GLOSSARY_RE, meaningOf } from '../../utils/glossary';

/**
 * Muestra un texto marcando los términos Lean (Gemba, Poka-Yoke, Yokoten…):
 * subrayado de puntos y su explicación al pasar el ratón o al enfocarlo.
 * Solo el primer uso de cada término en el texto, para no recargarlo.
 */
export const Glossed: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const seen = new Set<string>();
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(GLOSSARY_RE)) {
    const name = m[1];
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const meaning = meaningOf(name);
    if (!meaning) continue;
    out.push(text.slice(last, m.index));
    out.push(
      <abbr
        key={`${key}-${m.index}`}
        title={meaning}
        tabIndex={0}
        className="no-underline border-b border-dotted border-current cursor-help outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
      >
        {name}
      </abbr>
    );
    last = (m.index ?? 0) + name.length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
};
