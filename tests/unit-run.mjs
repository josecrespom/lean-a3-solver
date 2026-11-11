// Solo las pruebas rápidas, sin navegador ni compilación: npm run test:unit
import { run as runMerge } from './merge.test.mjs';
import { run as runUnit } from './unit.test.mjs';

const t0 = Date.now();
const failures = [...(await runMerge()), ...(await runUnit())];
console.log(
  `\n${failures.length ? `${failures.length} prueba(s) fallida(s)` : 'Todo correcto'} en ${Date.now() - t0} ms`
);
failures.forEach((f) => console.log(`- ${f}`));
process.exit(failures.length ? 1 : 0);
