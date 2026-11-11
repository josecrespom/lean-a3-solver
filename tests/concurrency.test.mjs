// Trabajo simultáneo sobre el almacén compartido:
// - escribir sin pisar lo que otra persona guardó entretanto (también mientras se contesta un conflicto)
// - fusión por elementos (acciones distintas del mismo A3)
// - solo lectura cuando el archivo es de una versión más nueva (y se conservan sus datos desconocidos)
// - pantalla de error en lugar de pantalla en blanco
import {
  clickButton,
  CONTEXT,
  createReporter,
  openProject,
  pageText,
  settle,
  typeAtEnd,
  until,
  waitSaved,
} from './helpers.mjs';
import {
  clickInDialog,
  readJson,
  setupAlmacenPage,
  syncNow,
  waitIdle,
  waitText,
  writeRaw,
} from './almacen-helpers.mjs';

const FILE = 'almacen_concurrencia.json';
const SAMPLE = 'cms-a3-sample-01';

const local = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('cms_lean_a3_projects_v2')));
const sampleOf = (list) => list.find((p) => p.id === SAMPLE);

/** Otra persona cambia el A3 de ejemplo en el archivo */
async function otherPersonEdits(page, change) {
  const file = await readJson(page, FILE);
  file.proyectos = file.proyectos.map((p) => (p.id === SAMPLE ? change(structuredClone(p)) : p));
  await writeRaw(page, FILE, JSON.stringify(file));
  return file;
}

async function typeInContext(page, text) {
  await openProject(page, 'porosidad');
  await typeAtEnd(page, CONTEXT, text);
  await waitSaved(page);
  await clickButton(page, 'Volver al Almacén');
  await waitIdle(page);
}

export async function run(browser, url) {
  const rep = createReporter('concurrencia');
  const errors = [];
  const page = await setupAlmacenPage(browser, url, { file: FILE, errors });

  await clickButton(page, 'Guardar en un archivo');
  await waitText(page, new RegExp(`Almacén: ${FILE}`));
  rep.check('almacén conectado', true);

  // ---------------------------------------------------------------------------
  // 2 · Acciones distintas del mismo A3 cambiadas a la vez: sin conflicto
  // ---------------------------------------------------------------------------
  const open = sampleOf(await local(page))
    .actionItems.map((a, i) => (a.status !== 'completed' ? i : -1))
    .filter((i) => i >= 0);
  const [mineIdx, theirIdx] = open;
  await otherPersonEdits(page, (p) => {
    p.actionItems[theirIdx].status = 'completed';
    return p;
  });
  await clickButton(page, 'Acciones');
  const firstAction = sampleOf(await local(page)).actionItems[mineIdx];
  const sel = `select[aria-label="Estado de «${firstAction.action}»"]`;
  const newStatus = firstAction.status === 'in_progress' ? 'pending' : 'in_progress';
  await page.waitForSelector(sel, { timeout: 5000 });
  await page.select(sel, newStatus);
  await waitIdle(page, 400);
  await syncNow(page);
  const noDialog = !(await page.$('[role="alertdialog"]'));
  const fileActs = sampleOf((await readJson(page, FILE)).proyectos).actionItems;
  rep.check('dos personas cambian acciones distintas del mismo A3: no se pregunta nada', noDialog);
  rep.check(
    '…y en el archivo quedan los dos cambios',
    fileActs[mineIdx].status === newStatus && fileActs[theirIdx].status === 'completed',
    fileActs.map((a) => a.status).join()
  );
  await clickButton(page, 'Almacén de Problemas');

  // ---------------------------------------------------------------------------
  // 1 · Conflicto contestado tarde: no se pisa lo que otra persona guardó entretanto
  // ---------------------------------------------------------------------------
  // Bloquear la escritura para que el cambio local quede pendiente
  await page.evaluate(() => {
    const proto = FileSystemFileHandle.prototype;
    window.__origCreateWritable = proto.createWritable;
    proto.createWritable = async function () {
      throw new DOMException('bloqueado para la prueba', 'NoModificationAllowedError');
    };
  });
  await typeInContext(page, ' MIO-1');
  await otherPersonEdits(page, (p) => {
    p.background += ' SUYO-1';
    return p;
  });
  await page.evaluate(() => {
    FileSystemFileHandle.prototype.createWritable = window.__origCreateWritable;
  });
  await clickButton(page, 'Reintentar');
  await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
  const dlg = await page.evaluate(() => document.querySelector('[role="alertdialog"]').textContent);
  rep.check(
    'el mismo texto cambiado por dos personas: se pregunta indicando el apartado',
    /contexto/.test(dlg),
    dlg.slice(0, 200)
  );
  // Una pregunta de conflicto no se puede cerrar sin contestar
  await page.keyboard.press('Escape');
  await settle(page);
  rep.check(
    'el conflicto no se cierra con Escape ni tiene botón de cerrar',
    Boolean(await page.$('[role="alertdialog"]')) && !(await page.$('[role="alertdialog"] button[aria-label="Cerrar"]'))
  );

  // Mientras se decide, otra persona guarda otro cambio
  await otherPersonEdits(page, (p) => {
    p.goals = 'OBJETIVO DE OTRA PERSONA';
    return p;
  });
  await clickInDialog(page, 'Quedarme con mis cambios');
  await until(
    async () =>
      sampleOf((await readJson(page, FILE)).proyectos).goals === 'OBJETIVO DE OTRA PERSONA' &&
      sampleOf((await readJson(page, FILE)).proyectos).background.includes('MIO-1')
  );
  await waitIdle(page);
  const afterLate = sampleOf((await readJson(page, FILE)).proyectos);
  rep.check(
    'contestar tarde no borra lo que otra persona guardó entretanto',
    afterLate.goals === 'OBJETIVO DE OTRA PERSONA',
    afterLate.goals
  );
  rep.check(
    '…y se guarda la versión elegida',
    afterLate.background.includes('MIO-1') && !afterLate.background.includes('SUYO-1')
  );
  rep.check('…sin volver a preguntar por lo ya contestado', !(await page.$('[role="alertdialog"]')));
  rep.check(
    '…y este navegador también tiene el cambio de la otra persona',
    sampleOf(await local(page)).goals === 'OBJETIVO DE OTRA PERSONA'
  );

  // ---------------------------------------------------------------------------
  // 3 · Archivo guardado por una versión más nueva: solo lectura
  // ---------------------------------------------------------------------------
  const future = await readJson(page, FILE);
  future.appVersion = '99.0.0';
  future.campoDelFuturo = { dato: 'no se debe perder' };
  future.proyectos = future.proyectos.map((p) => (p.id === SAMPLE ? { ...p, title: p.title + ' (v99)' } : p));
  await writeRaw(page, FILE, JSON.stringify(future));
  await syncNow(page);
  await waitText(page, /Solo lectura/);
  rep.check('archivo de una versión más nueva: se avisa de que es solo lectura', true);
  rep.check('…y se recogen sus cambios', sampleOf(await local(page)).title.endsWith('(v99)'));
  await typeInContext(page, ' CAMBIO-EN-VERSION-ANTIGUA');
  await syncNow(page);
  const untouched = await readJson(page, FILE);
  rep.check(
    '…y no se escribe nada en el archivo',
    untouched.appVersion === '99.0.0' && !JSON.stringify(untouched).includes('CAMBIO-EN-VERSION-ANTIGUA')
  );
  rep.check(
    '…pero el cambio se queda en este navegador',
    sampleOf(await local(page)).background.includes('CAMBIO-EN-VERSION-ANTIGUA')
  );

  // El archivo vuelve a ser de esta versión (todos actualizados): se guarda lo pendiente
  const current = await page.evaluate(
    () => document.querySelector('nav, header')?.textContent.match(/v(\d+\.\d+\.\d+)/)?.[1]
  );
  untouched.appVersion = current;
  await writeRaw(page, FILE, JSON.stringify(untouched));
  await syncNow(page);
  await syncNow(page);
  const healed = await readJson(page, FILE);
  rep.check(
    'con el archivo ya en esta versión, se guarda lo pendiente',
    JSON.stringify(healed).includes('CAMBIO-EN-VERSION-ANTIGUA') && !(await pageText(page)).includes('Solo lectura')
  );
  rep.check(
    'los datos que esta versión no conoce se conservan al guardar',
    healed.campoDelFuturo?.dato === 'no se debe perder'
  );

  // ---------------------------------------------------------------------------
  // 4 · Un A3 incompleto o con datos raros se repara al cargarlo
  // ---------------------------------------------------------------------------
  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('cms_lean_a3_projects_v2'));
    list.unshift({
      id: 'roto-1',
      title: 'A3 ROTO DE PRUEBA',
      actionItems: 'texto',
      indicator: { measurements: 5 },
      rootCauseIshikawa: 3,
      w5h1: 'x',
    });
    localStorage.setItem('cms_lean_a3_projects_v2', JSON.stringify(list));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await openProject(page, 'A3 ROTO DE PRUEBA');
  // Modo foco (pantalla completa de un paso): ventana con teclado común
  await page.evaluate(() => document.querySelector('button[aria-label^="Expandir el paso 1"]').click());
  await settle(page);
  const zoom = await page.$('[role="dialog"][aria-label^="Paso 1"]');
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  const focusInside = await page.evaluate(() =>
    Boolean(document.activeElement.closest('[role="dialog"][aria-label^="Paso 1"]'))
  );
  await page.keyboard.press('Escape');
  await settle(page);
  rep.check(
    'modo foco: se abre como ventana, Tab no se escapa y Escape la cierra',
    Boolean(zoom) && focusInside && !(await page.$('[role="dialog"][aria-label^="Paso 1"]'))
  );
  const broken = await page.evaluate(() => ({
    boundary: Boolean(document.querySelector('[data-error-boundary]')),
    editor: Boolean(document.querySelector('textarea[aria-label="Contexto y antecedentes"]')),
  }));
  rep.check(
    'un A3 con datos rotos se abre sin fallos (se repara al cargar)',
    !broken.boundary && broken.editor,
    JSON.stringify(broken)
  );
  await clickButton(page, 'Volver al Almacén');

  // ---------------------------------------------------------------------------
  // 6 · Un fallo al pintar no deja la pantalla en blanco
  // ---------------------------------------------------------------------------
  await page.goto(`${url}#forzar-error`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  const crash = await page.evaluate(() => ({
    box: Boolean(document.querySelector('[data-error-boundary]')),
    nav: Boolean(document.querySelector('nav')),
    text: document.body.innerText,
  }));
  rep.check(
    'si algo falla, se muestra un aviso en lugar de la pantalla en blanco',
    crash.box && /Tus A3 no se han perdido/.test(crash.text)
  );
  rep.check('…con el menú de la app todavía disponible', crash.nav);
  await clickButton(page, 'Volver al almacén');
  rep.check(
    '«Volver al almacén» recupera la app',
    !(await page.$('[data-error-boundary]')) && /Almacén de Problemas A3/.test(await pageText(page))
  );

  const unexpected = errors.filter((e) => !/forzar-error/.test(e));
  rep.check('sin errores de JavaScript inesperados', unexpected.length === 0, unexpected.join(' | '));
  await page.close();
  return rep.failures;
}
