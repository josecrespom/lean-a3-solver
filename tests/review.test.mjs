// Circuito de revisión: solicitar → comentar y devolver → resolver y reenviar → aprobar.
import {
  clickButton,
  CONTEXT,
  createReporter,
  openProject,
  pageText,
  settle,
  typeAtEnd,
  waitForText,
} from './helpers.mjs';

const KEY = 'cms_lean_a3_projects_v2';

async function becomeUser(page, name) {
  await page.evaluate((n) => localStorage.setItem('cms_a3_usuario', n), name);
  await page.reload({ waitUntil: 'networkidle0' });
}

const reviewState = (page) => page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY))[0].review?.state, KEY);

async function backToStore(page) {
  await clickButton(page, 'Volver al Almacén'); // da tiempo al autoguardado
}

export async function run(browser, url) {
  const rep = createReporter('revisión');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle0' });

  // 1. Ana (autora) solicita la revisión a Luis
  await becomeUser(page, 'Ana');
  await openProject(page, 'porosidad');
  rep.check('el A3 empieza como borrador', (await pageText(page)).includes('Borrador'));
  await clickButton(page, 'Solicitar revisión');
  await page.type('input[list="a3-revisores"]', 'Luis');
  await clickButton(page, 'Enviar a revisión');
  await backToStore(page);
  rep.check('estado «en revisión» guardado', (await reviewState(page)) === 'en_revision');
  rep.check('la tarjeta muestra «En revisión · Luis»', (await pageText(page)).includes('En revisión · Luis'));

  // 2. Luis ve que tiene un A3 por revisar, comenta el paso 3 y lo devuelve
  await becomeUser(page, 'Luis');
  rep.check('Luis ve «1 por revisar» en la barra', (await pageText(page)).includes('1 por revisar'));
  rep.check(
    'Luis ve el banner «pendiente de tu revisión»',
    (await pageText(page)).includes('Tienes 1 A3 pendiente de tu revisión')
  );
  rep.check('la pestaña del navegador muestra (1)', (await page.title()).startsWith('(1) '), await page.title());
  await openProject(page, 'porosidad');
  rep.check('el editor indica «Pendiente de tu revisión»', (await pageText(page)).includes('Pendiente de tu revisión'));
  const returnDisabled = await page.evaluate(
    () =>
      [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Devolver con comentarios')).disabled
  );
  rep.check('no se puede devolver sin comentarios', returnDisabled);
  await page.click('button[aria-label="Comentar el paso 3"]');
  await settle(page);
  const selected = await page.evaluate(
    () => document.querySelector('select[aria-label="Apartado del comentario"]').value
  );
  rep.check('el contador de la sección preselecciona su paso', selected === '3', selected);
  await page.type('textarea[aria-label="Texto del comentario"]', 'El objetivo no tiene fecha concreta');
  await clickButton(page, 'Añadir comentario');
  rep.check(
    'la sección muestra 1 comentario pendiente',
    Boolean(await page.$('button[aria-label="1 comentarios pendientes en el paso 3"]'))
  );
  const approveDisabled = await page.evaluate(
    () => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Aprobar').disabled
  );
  rep.check('no se puede aprobar con comentarios pendientes', approveDisabled);
  await clickButton(page, 'Devolver con comentarios');
  await backToStore(page);
  rep.check('estado «devuelto» guardado', (await reviewState(page)) === 'devuelto');

  // 3. Ana ve el aviso de A3 devuelto, lo abre desde el banner y resuelve
  await becomeUser(page, 'Ana');
  rep.check(
    'Ana ve el banner «te han devuelto 1 A3»',
    (await pageText(page)).includes('Te han devuelto 1 A3 con comentarios')
  );
  await page.evaluate(() => [...document.querySelectorAll('[role="alert"] button')][0].click());
  await settle(page);
  rep.check('el banner abre el A3 devuelto', Boolean(await page.$('[aria-label="Título del A3"]')));
  rep.check('Ana ve el comentario del revisor', (await pageText(page)).includes('El objetivo no tiene fecha concreta'));
  await clickButton(page, 'Marcar resuelto');
  await clickButton(page, 'Volver a solicitar revisión');
  await clickButton(page, 'Enviar a revisión');
  await backToStore(page);
  const resolved = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY))[0].comments[0], KEY);
  rep.check('el comentario queda resuelto por Ana', resolved?.resolved === true && resolved?.resolvedBy === 'Ana');

  // 4. Luis aprueba
  await becomeUser(page, 'Luis');
  await openProject(page, 'porosidad');
  await clickButton(page, 'Aprobar');
  await backToStore(page);
  const review = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY))[0].review, KEY);
  rep.check('estado «aprobado» por Luis', review?.state === 'aprobado' && review?.decidedBy === 'Luis');
  rep.check(
    'historial completo (solicitada, devuelta, solicitada, aprobada)',
    review?.history?.map((h) => h.action).join() === 'solicitada,devuelta,solicitada,aprobada'
  );
  const printFooter = await page.evaluate(() => document.querySelector('.print-only')?.textContent || '');
  rep.check('la hoja impresa indica quién aprobó', printFooter.includes('Aprobado por Luis'));

  // 5. Cambios después de la aprobación
  await becomeUser(page, 'Ana');
  await openProject(page, 'porosidad');
  rep.check(
    'recién aprobado: sin aviso de cambios',
    !(await pageText(page)).includes('modificado después de aprobarse')
  );
  await typeAtEnd(page, CONTEXT, ' cambio posterior');
  await waitForText(page, 'modificado después de aprobarse');
  rep.check(
    'aviso de cambios después de aprobarse',
    (await pageText(page)).includes('modificado después de aprobarse')
  );

  rep.check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await context.close();
  return rep.failures;
}
