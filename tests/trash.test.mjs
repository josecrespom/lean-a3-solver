// Papelera (borrado suave de 30 días) e historial de versiones de un A3.
import {
  clickButton,
  CONTEXT,
  createReporter,
  openProject,
  pageText,
  settle,
  typeAtEnd,
  waitSaved,
} from './helpers.mjs';

const KEY = 'cms_lean_a3_projects_v2';
const stored = (page) => page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)), KEY);

async function deleteSample(page) {
  await page.evaluate(() => document.querySelector('button[title="Eliminar este A3"]').click());
  await settle(page);
  await clickButton(page, 'Mover a la papelera');
}

export async function run(browser, url) {
  const rep = createReporter('papelera e historial');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.setItem('cms_a3_usuario', 'Prueba'));
  await page.reload({ waitUntil: 'networkidle0' });

  // Eliminar → papelera → restaurar
  await deleteSample(page);
  let text = await pageText(page);
  const cardTitles = await page.evaluate(() =>
    [...document.querySelectorAll('main h2, main h3, main h4')].map((h) => h.textContent).join('|')
  );
  rep.check('al eliminar, el A3 desaparece del almacén', !cardTitles.includes('porosidad'), cardTitles);
  rep.check('aparece la papelera con 1 A3', text.includes('Papelera (1)'));
  const deleted = (await stored(page))[0];
  rep.check(
    'el A3 sigue guardado, marcado como eliminado y por quién',
    Boolean(deleted.deletedAt) && deleted.deletedBy === 'Prueba'
  );
  await clickButton(page, 'Papelera (1)');
  rep.check(
    'la papelera indica quién lo eliminó y cuánto queda',
    /Eliminado por Prueba.*se borrará en 30 días/s.test(await pageText(page))
  );
  await clickButton(page, 'Restaurar');
  await page.keyboard.press('Escape');
  await settle(page);
  rep.check('restaurar lo devuelve al almacén', (await pageText(page)).includes('porosidad'));

  // Borrar definitivamente
  await deleteSample(page);
  await clickButton(page, 'Papelera (1)');
  await clickButton(page, 'Borrar definitivamente');
  await clickButton(page, 'Sí, borrar');
  rep.check('borrar definitivamente lo elimina del almacén', (await stored(page)).length === 0);
  await page.keyboard.press('Escape');

  // Borrado automático pasados 30 días
  await page.evaluate((KEY) => {
    const old = new Date(Date.now() - 40 * 86400000);
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${old.getFullYear()}-${pad(old.getMonth() + 1)}-${pad(old.getDate())} 10:00`;
    localStorage.setItem(
      KEY,
      JSON.stringify([
        {
          id: 'viejo',
          title: 'ELIMINADO HACE 40 DIAS',
          deletedAt: stamp,
          actionItems: [],
          rootCauseTree: { id: 'r', text: '', isRootCause: false, children: [] },
          rootCauseIshikawa: { problemHead: '', categories: [] },
          w5h1: {},
          rootCauseMode: 'tree',
          status: 'abierto',
        },
      ])
    );
  }, KEY);
  await page.reload({ waitUntil: 'networkidle0' });
  await settle(page);
  rep.check('lo eliminado hace más de 30 días se borra solo', (await stored(page)).length === 0);

  // Historial: recuperar una versión anterior
  await page.evaluate((KEY) => localStorage.removeItem(KEY), KEY);
  await page.reload({ waitUntil: 'networkidle0' }); // vuelve a cargar el A3 de ejemplo
  await openProject(page, 'porosidad');
  await typeAtEnd(page, CONTEXT, ' TEXTO-QUE-QUIERO-DESHACER');
  await waitSaved(page);
  await clickButton(page, 'Historial');
  text = await pageText(page);
  rep.check(
    'el historial muestra versiones anteriores',
    text.includes('Versiones anteriores') && text.includes('Versión de')
  );
  await page.evaluate(() =>
    [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent.trim() === 'Restaurar').click()
  );
  await settle(page);
  await clickButton(page, 'Sí, restaurar');
  const after = await page.evaluate(
    () => document.querySelector('textarea[aria-label="Contexto y antecedentes"]').value
  );
  rep.check('restaurar una versión deshace el cambio', !after.includes('TEXTO-QUE-QUIERO-DESHACER'));
  await clickButton(page, 'Historial');
  rep.check(
    'la versión sustituida también queda en el historial',
    (await page.evaluate(() => document.querySelectorAll('[role="dialog"] li').length)) >= 2
  );

  rep.check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await context.close();
  return rep.failures;
}
