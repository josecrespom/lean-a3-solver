// Protección de datos: copias automáticas, guardado verificado, archivo dañado
// o vacío, A3 desaparecidos y copias en carpeta.
import {
  clickButton,
  CONTEXT,
  createReporter,
  openProject,
  pageText,
  settle,
  typeAtEnd,
  until,
  waitForText,
} from './helpers.mjs';
import {
  clickInDialog,
  readFile as readRaw,
  setupAlmacenPage,
  syncNow,
  waitIdle,
  writeRaw as writeRawFile,
} from './almacen-helpers.mjs';

const FILE = 'almacen_backup_test.json';

const setup = (browser, url, errors) => setupAlmacenPage(browser, url, { file: FILE, errors });
const readFile = (page) => readRaw(page, FILE);
const writeRaw = (page, text) => writeRawFile(page, FILE, text);

async function editSample(page, mark) {
  await openProject(page, 'porosidad');
  await typeAtEnd(page, CONTEXT, mark);
  await clickButton(page, 'Volver al Almacén');
  await waitIdle(page);
}

const listCopies = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('lean-a3-cms-copias', 1);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('copias')) return resolve([]);
          const r = db.transaction('copias').objectStore('copias').getAll();
          r.onsuccess = () => resolve(r.result.map((c) => ({ date: c.date, count: c.count })));
        };
        req.onerror = () => resolve([]);
      })
  );

export async function run(browser, url) {
  const rep = createReporter('copias');
  const errors = [];
  const page = await setup(browser, url, errors);

  await clickButton(page, 'Guardar en un archivo');
  await waitForText(page, `Almacén: ${FILE}`);
  rep.check('almacén conectado', (await pageText(page)).includes(`Almacén: ${FILE}`));

  // 1. Copia automática del día
  await settle(page);
  const copies = await listCopies(page);
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  rep.check(
    'se guarda una copia automática del día',
    copies.length === 1 && copies[0].date === today && copies[0].count >= 1,
    JSON.stringify(copies)
  );

  await clickButton(page, 'Copias');
  const modal = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent || '');
  rep.check(
    'la ventana de copias lista la de hoy',
    modal.includes('Copias de seguridad') && /\d{2}\/\d{2}\/\d{4}/.test(modal),
    modal.slice(0, 160)
  );

  // 2. Copias también en una carpeta
  await clickInDialog(page, 'Elegir carpeta');
  const folderCount = (today) =>
    page.evaluate(async (today) => {
      try {
        const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('carpeta_compartida');
        const sub = await dir.getDirectoryHandle('copias_A3');
        const f = await (await sub.getFileHandle(`almacen_A3_${today}.json`)).getFile();
        return JSON.parse(await f.text()).proyectos.length;
      } catch (e) {
        return String(e);
      }
    }, today);
  let inFolder;
  await until(async () => typeof (inFolder = await folderCount(today)) === 'number');
  rep.check(
    'con carpeta elegida, la copia también se guarda en copias_A3',
    typeof inFolder === 'number' && inFolder >= 1,
    String(inFolder)
  );
  await page.keyboard.press('Escape');
  await settle(page);
  rep.check('Escape cierra la ventana de copias', !(await page.$('[role="dialog"]')));

  // 3. Guardado verificado: el archivo no queda igual que lo escrito
  await page.evaluate(() => {
    const proto = FileSystemWritableFileStream.prototype;
    window.__origWrite = proto.write;
    proto.write = function (data) {
      return window.__origWrite.call(this, typeof data === 'string' ? data.slice(0, 40) : data);
    };
  });
  await editSample(page, ' CAMBIO-1');
  await waitForText(page, 'no ha quedado bien guardado');
  let text = await pageText(page);
  rep.check(
    'si el archivo no queda bien guardado, se avisa',
    text.includes('no ha quedado bien guardado'),
    text.slice(0, 300)
  );
  await page.evaluate(() => {
    FileSystemWritableFileStream.prototype.write = window.__origWrite;
  });
  await clickButton(page, 'Reintentar');
  await until(async () => (await readFile(page)).includes('CAMBIO-1'));
  await waitForText(page, `Almacén: ${FILE}`);
  const afterRetry = JSON.parse(await readFile(page));
  rep.check(
    'al reintentar se guarda bien',
    JSON.stringify(afterRetry).includes('CAMBIO-1') && (await pageText(page)).includes(`Almacén: ${FILE}`)
  );

  // 4. Archivo dañado: no se sobrescribe
  await writeRaw(page, '{ "formato": "lean-a3-cms", "proyectos": [ {"id": "x"');
  await syncNow(page);
  await waitForText(page, 'está dañado o no se puede leer');
  text = await pageText(page);
  rep.check('archivo dañado: se avisa', /está dañado o no se puede leer/.test(text), text.slice(0, 300));
  await editSample(page, ' CAMBIO-2');
  rep.check(
    'archivo dañado: no se sobrescribe aunque haya cambios',
    (await readFile(page)).startsWith('{ "formato": "lean-a3-cms", "proyectos": [ {"id": "x"')
  );
  const localCount = await page.evaluate(() => JSON.parse(localStorage.getItem('cms_lean_a3_projects_v2')).length);

  await clickButton(page, 'Recuperar una copia');
  await clickInDialog(page, 'Recuperar');
  await clickInDialog(page, 'Sí, volver a esta copia');
  await until(async () => (await readFile(page)).startsWith('{\n'));
  await waitForText(page, `Almacén: ${FILE}`);
  const restored = JSON.parse(await readFile(page));
  rep.check(
    'recuperar una copia repara el archivo',
    restored.formato === 'lean-a3-cms' && restored.proyectos.length >= 1
  );
  rep.check(
    'tras recuperar, vuelve a estar conectado',
    (await pageText(page)).includes(`Almacén: ${FILE}`) && !(await pageText(page)).includes('dañado')
  );

  // 5. Archivo vacío (escritura interrumpida): no se interpreta como "todo borrado"
  await writeRaw(page, '');
  await syncNow(page);
  await waitForText(page, 'archivo está vacío');
  text = await pageText(page);
  rep.check('archivo vacío: se trata como dañado', /archivo está vacío/.test(text), text.slice(0, 200));
  const stillLocal = await page.evaluate(() => JSON.parse(localStorage.getItem('cms_lean_a3_projects_v2')).length);
  rep.check('archivo vacío: no se borra nada en el navegador', stillLocal >= 1, `${stillLocal} (antes ${localCount})`);
  await clickButton(page, 'Guardar la versión de este navegador');
  await clickButton(page, 'Sustituir el archivo');
  await until(async () => (await readFile(page)).length > 10);
  rep.check(
    'guardar la versión del navegador repara el archivo',
    JSON.parse(await readFile(page)).proyectos.length === stillLocal
  );

  // 6. Desaparecen de golpe 3 A3 que no estaban en la papelera
  // otra persona añade 3 A3…
  const full = JSON.parse(await readFile(page));
  const before = full.proyectos.length + 3;
  const extra = [1, 2, 3].map((i) => ({ ...full.proyectos[0], id: `otro-${i}`, title: `A3 de otra persona ${i}` }));
  await writeRaw(page, JSON.stringify({ ...full, proyectos: [...extra, ...full.proyectos] }));
  await syncNow(page);
  const localLen = () => page.evaluate(() => JSON.parse(localStorage.getItem('cms_lean_a3_projects_v2')).length);
  await until(async () => (await localLen()) === before);
  rep.check(
    'los A3 de otra persona se incorporan',
    (await page.evaluate(() => JSON.parse(localStorage.getItem('cms_lean_a3_projects_v2')).length)) === before
  );
  // …y luego alguien guarda encima una copia antigua sin ellos
  full.proyectos = full.proyectos.filter((p) => !p.id.startsWith('otro-'));
  await writeRaw(page, JSON.stringify(full));
  await syncNow(page);
  await page.waitForSelector('[role="alertdialog"]', { timeout: 6000 }).catch(() => undefined);
  const dlg = await page.evaluate(() => document.querySelector('[role="alertdialog"]')?.textContent || '');
  rep.check('si faltan 3 A3 sin pasar por la papelera, se pregunta', dlg.includes('Faltan 3 A3'), dlg.slice(0, 120));
  await clickButton(page, 'Conservarlos');
  await until(async () => JSON.parse(await readFile(page)).proyectos.length === before);
  rep.check(
    'conservarlos los vuelve a guardar en el archivo',
    JSON.parse(await readFile(page)).proyectos.length === before
  );

  // 7. Opiniones del equipo: vista propia con seguimiento; se guardan en el almacén compartido y se fusionan
  const openOpinions = () =>
    page.evaluate(() => document.querySelector('button[aria-label^="Opiniones sobre la app"]').click());
  await openOpinions();
  await settle(page);
  rep.check(
    'las opiniones tienen su propia vista',
    (await page.evaluate(() => document.body.innerText)).includes('Opiniones y mejoras')
  );
  await page.evaluate(() =>
    [...document.querySelectorAll('form[aria-label="Nueva opinión"] label')]
      .find((l) => l.textContent.includes('Fallo'))
      .click()
  );
  await page.type('textarea[aria-label="Tu opinión"]', 'El botón X no responde');
  await clickButton(page, 'Enviar');
  await until(async () => JSON.parse(await readFile(page)).opiniones?.length === 1);
  let file = JSON.parse(await readFile(page));
  rep.check(
    'una opinión se guarda en el archivo del almacén',
    file.opiniones?.[0]?.text === 'El botón X no responde' &&
      file.opiniones[0].kind === 'fallo' &&
      file.opiniones[0].author === 'Ana',
    JSON.stringify(file.opiniones)
  );
  file.opiniones.push({
    id: 'op-otra',
    kind: 'idea',
    text: 'Idea de Luis',
    author: 'Luis',
    at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'nueva',
  });
  await writeRaw(page, JSON.stringify(file));
  await syncNow(page);
  const badge = await page.evaluate(() =>
    document.querySelector('button[aria-label^="Opiniones sobre la app"]').getAttribute('aria-label')
  );
  rep.check('las opiniones de otras personas llegan y se cuentan', /2 nuevas/.test(badge), badge);

  // Seguimiento: planificar la mejora de Luis para una versión y después marcarla hecha
  const card = '[data-opinion="op-otra"]';
  await until(async () => Boolean(await page.$(card)));
  await page.select(`${card} select`, 'planificada');
  await settle(page);
  await page.type(`${card} input[aria-label="Versión prevista"]`, '1.0.0');
  await page.keyboard.press('Enter');
  await page.type(`${card} textarea[aria-label="Respuesta del equipo"]`, 'Buena idea, entra en la próxima');
  await page.evaluate(() => document.activeElement.blur());
  const planned = await until(async () => {
    const o = JSON.parse(await readFile(page)).opiniones?.find((x) => x.id === 'op-otra');
    return (
      o?.status === 'planificada' &&
      o.plannedVersion === '1.0.0' &&
      o.response === 'Buena idea, entra en la próxima' &&
      o.updatedBy === 'Ana'
    );
  });
  rep.check(
    'planificar: estado, versión prevista y respuesta llegan al archivo',
    planned,
    JSON.stringify(JSON.parse(await readFile(page)).opiniones?.find((x) => x.id === 'op-otra'))
  );
  const dueText = await page.evaluate(() => document.querySelector('[role="status"]')?.textContent || '');
  rep.check(
    'avisa de las planificadas para esta versión o anteriores',
    /planificada para esta\s+versión/.test(dueText),
    dueText
  );
  await clickButton(page, 'Marcar hecha en v1.0.0');
  const doneOk = await until(async () => {
    const o = JSON.parse(await readFile(page)).opiniones?.find((x) => x.id === 'op-otra');
    return o?.status === 'hecha' && o.doneVersion === '1.0.0';
  });
  rep.check('al marcarla hecha queda anotada la versión en que se hizo', doneOk);
  await clickButton(page, 'Hechas (1)');
  const byVersion = await page.evaluate(() => document.querySelector('[data-version="1.0.0"]')?.textContent || '');
  rep.check('«Hechas por versión» la muestra en su versión', byVersion.includes('Idea de Luis'), byVersion);
  rep.check(
    'las hechas no salen en «Pendientes»',
    (await page.evaluate(
      () => [...document.querySelectorAll('button')].find((b) => b.textContent.startsWith('Pendientes'))?.textContent
    )) === 'Pendientes (1)'
  );

  rep.check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await page.close();
  return rep.failures;
}
