// Móvil (390 × 844): nada se sale por la derecha y se llega a todas las vistas.
import { clickButton, createReporter, openProject, settle } from './helpers.mjs';

/** Ancho de la página frente al de la pantalla (lo que tiene su propio desplazamiento no cuenta) */
const overflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

export async function run(browser, url) {
  const rep = createReporter('móvil');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('cms_a3_usuario', 'Ana');
    localStorage.setItem('cms_a3_bienvenida_vista', '1');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await settle(page);

  rep.check('almacén: nada se sale de la pantalla', (await overflow(page)) <= 0, `${await overflow(page)} px`);
  const nav = await page.$('nav[aria-label="Navegación principal"]');
  rep.check('hay navegación inferior en el móvil', Boolean(nav) && (await nav.isIntersectingViewport()));

  await openProject(page, 'porosidad');
  rep.check('editor: nada se sale de la pantalla', (await overflow(page)) <= 0, `${await overflow(page)} px`);
  const title = await page.$eval('[aria-label="Título del A3"]', (e) => ({ fits: e.scrollWidth <= e.clientWidth + 1 }));
  rep.check('editor: el título se ve entero (pasa a otra línea)', title.fits);
  await clickButton(page, 'Modo Asistente');
  rep.check('asistente: nada se sale de la pantalla', (await overflow(page)) <= 0, `${await overflow(page)} px`);

  // Navegación inferior: Acciones y Guía
  await page.$eval('nav[aria-label="Navegación principal"]', (n) =>
    [...n.querySelectorAll('button')].find((b) => b.textContent.includes('Acciones')).click()
  );
  await settle(page);
  rep.check(
    'desde el móvil se llega a «Acciones»',
    (await page.evaluate(() => document.body.innerText)).includes('Seguimiento de acciones')
  );
  rep.check('acciones: nada se sale de la pantalla', (await overflow(page)) <= 0, `${await overflow(page)} px`);
  await page.$eval('nav[aria-label="Navegación principal"]', (n) =>
    [...n.querySelectorAll('button')].find((b) => b.textContent.includes('Guía')).click()
  );
  await settle(page);
  rep.check('desde el móvil se abre la Guía', Boolean(await page.$('[role="dialog"]')));

  rep.check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await context.close();
  return rep.failures;
}
