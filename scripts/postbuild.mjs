// Renombra el HTML autocontenido generado por Vite al nombre de distribución.
import { renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
const src = join(dist, 'index.html');
const dest = join(dist, 'Lean-A3.html');
if (!existsSync(src)) {
  console.error('No se encontró dist/index.html');
  process.exit(1);
}
renameSync(src, dest);
console.log(`App lista: ${dest}`);
