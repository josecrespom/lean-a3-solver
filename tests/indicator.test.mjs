// Paso 6: seguimiento del indicador (mediciones, gráfico frente a la meta, impresión).
import { clickButton, createReporter, openProject, settle, waitSaved } from './helpers.mjs';

const KEY = 'cms_lean_a3_projects_v2';
const stored = (page) => page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY))[0], KEY);

/** Solo elementos visibles en pantalla (la lámina de impresión oculta también contiene el gráfico) */
const visible = (page, sel) =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll(sel)].filter(
        (e) => e.getBoundingClientRect().width > 0 && e.closest('[data-print-indicator]') === null
      ).length,
    sel
  );
const statusText = (page) =>
  page.evaluate(() => [...document.querySelectorAll('[data-indicator-status]')].map((e) => e.textContent).join('|'));
const stripText = (page) =>
  page.evaluate(() => [...document.querySelectorAll('output')].map((o) => o.textContent).join('|'));

async function typeInto(page, selector, text) {
  const el = await page.$(selector);
  await el.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await el.type(text);
  await settle(page);
}

export async function run(browser, url) {
  const rep = createReporter('indicador');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.setItem('cms_a3_usuario', 'Prueba'));
  await page.reload({ waitUntil: 'networkidle0' });
  // Tarjeta del almacén: tira de 7 pasos y mini-línea del indicador
  const card = await page.evaluate(() => ({
    steps: document.querySelectorAll('[data-step-strip] > span').length,
    done: document.querySelectorAll('[data-step-strip] > [data-done]').length,
    spark: Boolean(document.querySelector('[data-card-indicator] [data-sparkline]')),
    text: document.querySelector('[data-card-indicator]')?.textContent || '',
  }));
  rep.check(
    'la tarjeta muestra los 7 pasos y cuántos están hechos',
    card.steps === 7 && card.done === 7,
    JSON.stringify(card)
  );
  rep.check(
    'la tarjeta muestra el indicador frente a la meta',
    card.spark && /1,4%.*meta ≤ 0,3%.*Aún no cumple/.test(card.text),
    card.text
  );
  await openProject(page, 'porosidad');

  rep.check('el ejemplo muestra el gráfico del indicador', (await visible(page, '[data-indicator-chart] svg')) === 1);
  rep.check('el gráfico dibuja las 5 mediciones', (await visible(page, '[data-indicator-chart] [data-point]')) === 5);
  rep.check(
    'el gráfico tiene la meta y la línea base rotuladas',
    (await page.evaluate(() => document.querySelector('[data-indicator-chart] svg').textContent)).match(
      /Meta 0,3%.*Base 4,8%|Base 4,8%.*Meta 0,3%/s
    ) !== null
  );
  rep.check(
    'antes/meta/actual salen del indicador',
    (await stripText(page)) === '4,8%|≤ 0,3%|1,4%',
    await stripText(page)
  );
  rep.check(
    'indica cuánto falta para la meta',
    /no se alcanza la meta · faltan 1,1%/.test(await statusText(page)),
    await statusText(page)
  );
  rep.check(
    'indica la mejora frente a la base',
    /Mejora frente a la base: 70,83%/.test(await statusText(page)),
    await statusText(page)
  );

  // Tooltip al pasar por un punto
  await page.evaluate(() => document.querySelector('[data-indicator-chart]').scrollIntoView({ block: 'center' }));
  await settle(page);
  const rects = await page.$$('[data-indicator-chart] rect');
  await rects[0].hover();
  await settle(page);
  const tip = await page.evaluate(
    () => document.querySelector('[data-indicator-chart] [role="tooltip"]')?.textContent || ''
  );
  rep.check(
    'el tooltip muestra fecha, valor, si cumple y el comentario',
    /28\/10\/2026.*4,6%.*No cumple.*Antes de la limpieza/s.test(tip),
    tip
  );
  await page.mouse.move(5, 5);

  // Nueva medición con coma decimal
  await clickButton(page, 'Añadir medición');
  await typeInto(page, 'input[aria-label="Valor de la medición 6"]', '0,2');
  rep.check(
    'la nueva medición entra en el gráfico',
    (await visible(page, '[data-indicator-chart] [data-point]')) === 6
  );
  rep.check(
    'al cumplir la meta lo indica',
    /Meta alcanzada en la última medición/.test(await statusText(page)),
    await statusText(page)
  );
  await waitSaved(page);
  const saved = await stored(page);
  const lastM = saved.indicator.measurements.at(-1);
  rep.check(
    'la medición se guarda como número con la fecha de hoy',
    lastM.value === 0.2 && /^\d{4}-\d{2}-\d{2}$/.test(lastM.date),
    JSON.stringify(lastM)
  );

  // Valor no numérico: no se guarda y se marca
  await typeInto(page, 'input[aria-label="Valor de la medición 6"]', '0,2x');
  const invalid = await page.evaluate(() =>
    document.querySelector('input[aria-label="Valor de la medición 6"]').getAttribute('aria-invalid')
  );
  rep.check('un valor no numérico se marca como erróneo', invalid === 'true');
  await typeInto(page, 'input[aria-label="Valor de la medición 6"]', '0,2');

  // Lámina de impresión
  const printHas = await page.evaluate(() => {
    const p = document.querySelector('[data-print-indicator]');
    return p ? { pts: p.querySelectorAll('[data-point]').length, txt: p.textContent } : null;
  });
  rep.check(
    'la lámina impresa incluye el gráfico y el estado',
    printHas?.pts === 6 && /Meta alcanzada/.test(printHas.txt),
    JSON.stringify(printHas)
  );

  // Quitar y volver a crear desde los textos libres
  await clickButton(page, 'Quitar seguimiento');
  rep.check(
    'pide confirmación dentro de la app antes de borrar mediciones',
    Boolean(await page.$('[role="alertdialog"]'))
  );
  await clickButton(page, 'Quitar y borrar mediciones');
  rep.check(
    'al quitar el seguimiento vuelven los campos de texto',
    (await visible(page, '[data-indicator-chart]')) === 0 && (await stripText(page)) === ''
  );
  await clickButton(page, 'Registrar mediciones con gráfico');
  await waitSaved(page);
  const re = (await stored(page)).indicator;
  rep.check(
    'se crea a partir de los textos (4.8%, < 0.3%, 1.4%)',
    re &&
      re.baseline === 4.8 &&
      re.target === 0.3 &&
      re.unit === '%' &&
      re.direction === 'down' &&
      re.measurements.length === 1 &&
      re.measurements[0].value === 1.4,
    JSON.stringify(re)
  );

  rep.check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await context.close();
  return rep.failures;
}
