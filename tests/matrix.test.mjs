// Matriz de priorización del paso 5: clasificar, añadir, reclasificar y borrar contramedidas.
import { clickButton, createReporter, openProject, settle, until } from './helpers.mjs';

const KEY = 'cms_lean_a3_projects_v2';

const seed = (key) => {
  const list = JSON.parse(localStorage.getItem(key));
  const a3 = {
    ...list[0],
    id: 'a3-matriz',
    title: 'A3 DE MATRIZ',
    actionItems: [{ id: 'sin', action: 'ACCION-SIN-CLASIFICAR', owner: 'Marta', dueDate: '', status: 'pending' }],
  };
  localStorage.setItem(key, JSON.stringify([a3]));
};

const stored = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key))[0].actionItems, KEY);

/** Sección (cuadrante) cuyo título empieza por `title` */
const quadrant = (title) => `section[aria-label^="${title}"]`;

export async function run(browser, url) {
  const rep = createReporter('matriz');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(seed, KEY);
  await page.reload({ waitUntil: 'networkidle0' });
  await openProject(page, 'A3 DE MATRIZ');
  await clickButton(page, 'Completo').catch(() => undefined);
  await clickButton(page, 'Matriz de priorización');

  const text = (sel) => page.$eval(sel, (e) => e.textContent).catch(() => '');
  const body = await page.evaluate(() => document.body.innerText);
  const pending = body.slice(body.search(/Contramedidas sin priorizar/));
  rep.check(
    'la contramedida sin impacto/esfuerzo aparece como «sin priorizar»',
    /^Contramedidas sin priorizar \(\d+\)[\s\S]*ACCION-SIN-CLASIFICAR/.test(pending),
    pending.slice(0, 120)
  );

  // Clasificarla en «Rápidas y eficaces»
  await page.evaluate(() => {
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent.includes('⚡') && b.textContent.includes('Rápidas'))
      ?.click();
  });
  const classified = await until(async () => {
    const a = (await stored(page)).find((x) => x.id === 'sin');
    return a?.impact === 'alto' && a?.effort === 'bajo';
  });
  rep.check('«Mover a» la clasifica como alto impacto / bajo esfuerzo', classified, JSON.stringify(await stored(page)));
  rep.check(
    'la tarjeta aparece en su cuadrante',
    (await text(quadrant('1. Rápidas'))).includes('ACCION-SIN-CLASIFICAR')
  );

  // Añadir una estratégica sin responsable: no se inventa responsable ni causa
  await page.type(`${quadrant('2. Estratégicas')} input[aria-label="Añadir acción estratégica…"]`, 'ACCION-NUEVA');
  await page.keyboard.press('Enter');
  const added = await until(async () => (await stored(page)).some((a) => a.action === 'ACCION-NUEVA'));
  const nueva = (await stored(page)).find((a) => a.action === 'ACCION-NUEVA');
  rep.check(
    'Intro añade la acción al cuadrante',
    added && nueva?.impact === 'alto' && nueva?.effort === 'alto',
    JSON.stringify(nueva)
  );
  rep.check(
    'sin responsable ni causa inventados',
    nueva?.owner === '' && !nueva?.linkedRootCause,
    JSON.stringify(nueva)
  );
  rep.check(
    'el campo se vacía tras añadir',
    (await page.$eval(`${quadrant('2. Estratégicas')} input[type="text"]`, (e) => e.value)) === ''
  );

  // Reclasificar con el desplegable
  await page.select(`${quadrant('2. Estratégicas')} select`, 'bajo-alto');
  const moved = await until(
    async () => (await stored(page)).find((a) => a.action === 'ACCION-NUEVA')?.impact === 'bajo'
  );
  rep.check(
    'reclasificar la mueve a «Descartar»',
    moved && (await text(quadrant('4. Descartar'))).includes('ACCION-NUEVA')
  );

  // Avanzar estado y borrar
  // (clic por programa: la barra fija del editor puede tapar el botón)
  const press = (sel) => page.$eval(sel, (b) => b.click());
  await press(`${quadrant('1. Rápidas')} button[aria-label^="Estado"]`);
  rep.check(
    'el botón de estado la pasa a «en curso»',
    await until(async () => (await stored(page)).find((a) => a.id === 'sin')?.status === 'in_progress')
  );
  await press(`${quadrant('4. Descartar')} button[aria-label="Eliminar contramedida"]`);
  await settle(page);
  rep.check(
    'eliminar la quita de la lista',
    await until(async () => !(await stored(page)).some((a) => a.action === 'ACCION-NUEVA'))
  );

  rep.check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await context.close();
  return rep.failures;
}
