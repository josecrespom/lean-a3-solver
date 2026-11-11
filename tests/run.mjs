// Ejecuta todas las pruebas sobre dist/Lean-A3.html (generar antes con npm run build).
import { launch, serveDist } from './helpers.mjs';
import { run as runApp } from './app.test.mjs';
import { run as runStyles } from './styles.test.mjs';
import { run as runDiagram } from './diagram.test.mjs';
import { run as runPrint } from './print.test.mjs';
import { run as runActions } from './actions.test.mjs';
import { run as runMerge } from './merge.test.mjs';
import { run as runUnit } from './unit.test.mjs';
import { run as runReview } from './review.test.mjs';
import { run as runTrash } from './trash.test.mjs';
import { run as runIndicator } from './indicator.test.mjs';
import { run as runBackup } from './backup.test.mjs';
import { run as runPerf } from './perf.test.mjs';
import { run as runConcurrency } from './concurrency.test.mjs';
import { run as runMatrix } from './matrix.test.mjs';
import { run as runArtifact } from './artifact.test.mjs';
import { run as runMobile } from './mobile.test.mjs';

// Si se pide (CPU_LENTA=4), cada página se ejecuta con la CPU ralentizada x4 para
// comprobar que las pruebas no dependen de esperas fijas.
const slowdown = Number(process.env.CPU_LENTA || 0);

const server = await serveDist();
const browser = await launch();
if (slowdown > 1) {
  browser.on('targetcreated', async (t) => {
    const p = await t.page().catch(() => null);
    if (p) await p.emulateCPUThrottling(slowdown).catch(() => undefined);
  });
}

const groups = [
  ['Fusión del almacén compartido', () => runMerge()],
  ['Lógica (pruebas unitarias)', () => runUnit()],
  ['Funcionamiento', () => runApp(browser, server.url)],
  ['Diagramas y tabla de acciones', () => runDiagram(browser, server.url)],
  ['Seguimiento de acciones', () => runActions(browser, server.url)],
  ['Matriz de priorización', () => runMatrix(browser, server.url)],
  ['Revisión', () => runReview(browser, server.url)],
  ['Papelera e historial', () => runTrash(browser, server.url)],
  ['Copias y protección de datos', () => runBackup(browser, server.url)],
  ['Trabajo simultáneo y errores', () => runConcurrency(browser, server.url)],
  ['Rendimiento con 200 A3', () => runPerf(browser, server.url)],
  ['Seguimiento del indicador', () => runIndicator(browser, server.url)],
  ['Impresión DIN A3', () => runPrint(browser, server.url)],
  ['Publicada como artefacto', () => runArtifact(browser, server.url)],
  ['Móvil', () => runMobile(browser, server.url)],
  ['Estilos (modo claro y oscuro)', () => runStyles(browser, server.url)],
];

// Un grupo que se interrumpe con un error cuenta como fallo, pero el resto se sigue ejecutando
const only = process.env.SOLO ? new RegExp(process.env.SOLO, 'i') : null;
const failures = [];
try {
  for (const [name, fn] of groups) {
    if (only && !only.test(name)) continue;
    console.log(name);
    const t0 = Date.now();
    try {
      failures.push(...(await fn()));
    } catch (e) {
      console.log(`  ✘ el grupo se ha interrumpido: ${e.message.split('\n')[0]}`);
      failures.push(`${name}: se ha interrumpido (${e.message.split('\n')[0]})`);
    }
    console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} prueba(s) fallida(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nTodas las pruebas han pasado.');
