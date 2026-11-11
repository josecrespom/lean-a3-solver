// Pruebas de funcionamiento: almacén en archivo, autoguardado, conflictos entre
// personas, reconexión y comportamiento del editor.
// Los selectores de archivo nativos se sustituyen por archivos del almacenamiento
// interno de Chrome (OPFS), que se comportan igual que un archivo real.
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
  waitSaved,
} from './helpers.mjs';

const FILE = 'almacen_A3.json';

async function newMockedPage(context, errors) {
  const page = await context.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.evaluateOnNewDocument((FILE) => {
    const handle = async () => (await navigator.storage.getDirectory()).getFileHandle(FILE, { create: true });
    window.showSaveFilePicker = async () => handle();
    window.showOpenFilePicker = async () => [await handle()];
    if (localStorage.getItem('__test_permiso') === 'prompt') {
      FileSystemHandle.prototype.queryPermission = async () => 'prompt';
      FileSystemHandle.prototype.requestPermission = async () => 'granted';
    }
  }, FILE);
  return page;
}

async function preparePage(browser, url) {
  // Perfil normal (no incógnito): es el que usa la gente y el único donde Chrome
  // permite recuperar el acceso a un archivo guardado tras reabrir la app.
  const context = browser.defaultBrowserContext();
  const errors = [];
  const page = await newMockedPage(context, errors);
  await page.goto(url, { waitUntil: 'networkidle0' });
  // Estado limpio
  await page.evaluate(async (FILE) => {
    localStorage.clear();
    await new Promise((r) => {
      const req = indexedDB.deleteDatabase('lean-a3-cms');
      req.onsuccess = req.onerror = req.onblocked = () => r();
    });
    const dir = await navigator.storage.getDirectory();
    await dir.removeEntry(FILE).catch(() => {});
  }, FILE);
  await page.reload({ waitUntil: 'networkidle0' });
  return { page, errors, context };
}

const readFile = (page) =>
  page.evaluate(async (FILE) => {
    const h = await (await navigator.storage.getDirectory()).getFileHandle(FILE);
    return (await h.getFile()).text();
  }, FILE);

const SAMPLE_ID = 'cms-a3-sample-01';

/**
 * Simula que otra persona guarda en el archivo: `change` recibe la lista de
 * proyectos del archivo y la modifica (se ejecuta dentro del navegador).
 */
const externalEdit = (page, change, arg) =>
  page.evaluate(
    async (FILE, changeSrc, arg) => {
      const h = await (await navigator.storage.getDirectory()).getFileHandle(FILE);
      const data = JSON.parse(await (await h.getFile()).text());
      new Function('list', 'arg', `(${changeSrc})(list, arg)`)(data.proyectos, arg);
      // La fecha de modificación tiene que cambiar (resolución de 1 s en algunos sistemas)
      const before = (await h.getFile()).lastModified;
      for (let i = 0; i < 30; i++) {
        const w = await h.createWritable();
        await w.write(JSON.stringify(data));
        await w.close();
        if ((await h.getFile()).lastModified !== before) break;
        await new Promise((r) => setTimeout(r, 100));
      }
    },
    FILE,
    change.toString(),
    arg
  );

const setTitle = (list, [id, title]) => {
  list.find((p) => p.id === id).title = title;
};

const setField = (list, [id, field, value]) => {
  list.find((p) => p.id === id)[field] = value;
};

const addProject = (list, [id, title]) => {
  list.unshift({ ...list[list.length - 1], id, title });
};

const typeInFirstTextarea = (page, text) => typeAtEnd(page, CONTEXT, text);

export async function run(browser, url) {
  const rep = createReporter('app');
  const prepared = await preparePage(browser, url);
  const { errors, context } = prepared;
  let page = prepared.page;

  // --- Bienvenida: nombre, almacén y empezar ---
  let text = await pageText(page);
  rep.check('bienvenida: aparece la primera vez', text.includes('Bienvenido a Lean A3 Solver'));
  rep.check(
    'sin archivo: aviso de que los datos están solo en el navegador',
    text.includes('solo están en este navegador')
  );
  await page.type('[role="dialog"] input[aria-label="Tu nombre"]', 'Ana Prueba');
  await clickButton(page, 'Continuar');
  await clickButton(page, 'Crear un almacén nuevo');
  await until(async () => (await readFile(page)).includes('lean-a3-cms'));
  const created = JSON.parse(await readFile(page));
  rep.check(
    'bienvenida: crea el almacén con su formato',
    created.formato === 'lean-a3-cms' && created.proyectos.length >= 1
  );
  rep.check(
    'el archivo registra la versión de la app que lo guarda',
    /^\d+\.\d+\.\d+$/.test(created.appVersion || ''),
    String(created.appVersion)
  );
  rep.check('bienvenida: tercer paso para empezar', (await pageText(page)).includes('Crear mi primer A3'));
  await clickButton(page, 'Ir al almacén');
  text = await pageText(page);
  rep.check('barra muestra el archivo conectado', text.includes(`Almacén: ${FILE}`));
  rep.check('el nombre aparece en la barra superior', text.includes('Ana Prueba'));
  rep.check('la bienvenida no vuelve a salir', !text.includes('Bienvenido a Lean A3 Solver'));

  // --- Abrir y mirar un A3 no lo modifica (ni marca a quien lo mira como autor) ---
  const beforeOpen = await readFile(page);
  await openProject(page, 'porosidad');
  await new Promise((r) => setTimeout(r, 1500)); // más que el autoguardado (1 s)
  await clickButton(page, 'Volver al Almacén');
  await settle(page);
  const afterOpen = await readFile(page);
  rep.check(
    'abrir un A3 sin tocar nada no cambia el archivo',
    afterOpen === beforeOpen,
    afterOpen === beforeOpen ? '' : 'el archivo ha cambiado'
  );
  rep.check(
    'la tarjeta no lo marca como modificado por quien lo abrió',
    !(await pageText(page)).includes('Modificado por Ana Prueba')
  );

  // --- Autoguardado al salir del editor ---
  await openProject(page, 'porosidad');
  await typeInFirstTextarea(page, ' MARCA-AUTOSAVE');
  await clickButton(page, 'Volver al Almacén');
  await until(async () => (await readFile(page)).includes('MARCA-AUTOSAVE'));
  rep.check('autoguardado al salir del editor llega al archivo', (await readFile(page)).includes('MARCA-AUTOSAVE'));
  rep.check('el archivo registra quién modificó el A3', (await readFile(page)).includes('"updatedBy": "Ana Prueba"'));
  rep.check('la tarjeta muestra quién lo modificó', (await pageText(page)).includes('Modificado por Ana Prueba'));

  // --- Ctrl+S ---
  await openProject(page, 'porosidad');
  await typeInFirstTextarea(page, ' MARCA-CTRLS');
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await until(async () => (await readFile(page)).includes('MARCA-CTRLS'), { timeout: 3000 });
  rep.check('Ctrl+S guarda al momento', (await readFile(page)).includes('MARCA-CTRLS'));
  // Escribir justo después de Ctrl+S también se guarda (antes se quedaba sin guardar)
  await typeInFirstTextarea(page, ' TRAS-CTRLS');
  rep.check(
    'lo escrito justo después de Ctrl+S también se guarda',
    await until(async () => (await readFile(page)).includes('TRAS-CTRLS'))
  );

  // --- Otra persona cambia el MISMO apartado que yo: se pregunta solo por ese A3 ---
  await externalEdit(page, setField, [SAMPLE_ID, 'background', 'TEXTO-DE-OTRA-PERSONA']);
  await typeInFirstTextarea(page, ' MI-CAMBIO');
  await waitForText(page, 'Otra persona ha cambiado lo mismo que tú');
  text = await pageText(page);
  rep.check(
    'mismo apartado: se pregunta antes de sobrescribir',
    text.includes('Otra persona ha cambiado lo mismo que tú en un A3')
  );
  await clickButton(page, 'Usar los cambios de la otra persona');
  // Elegir vuelve a leer el archivo antes de aplicar: esperar a que el editor se recargue
  const editorBg = () =>
    page.evaluate(() => document.querySelector('textarea[aria-label="Contexto y antecedentes"]').value);
  await until(async () => (await editorBg()) === 'TEXTO-DE-OTRA-PERSONA');
  const bgInEditor = await editorBg();
  rep.check(
    'mismo apartado: el editor pasa a la versión de la otra persona',
    bgInEditor === 'TEXTO-DE-OTRA-PERSONA',
    bgInEditor
  );
  await typeInFirstTextarea(page, ' DESPUES-DE-ELEGIR');
  await until(async () => (await readFile(page)).includes('DESPUES-DE-ELEGIR'));
  const afterConflict = await readFile(page);
  rep.check(
    'mismo apartado: se conserva el cambio ajeno y se guardan las ediciones posteriores',
    afterConflict.includes('TEXTO-DE-OTRA-PERSONA DESPUES-DE-ELEGIR') && !afterConflict.includes('MI-CAMBIO')
  );

  // --- Otra persona cambia OTRO apartado del mismo A3: se fusiona sin preguntar ---
  await externalEdit(page, setTitle, [SAMPLE_ID, 'TITULO-DE-OTRA-PERSONA']);
  await typeInFirstTextarea(page, ' SIGO-ESCRIBIENDO');
  await until(async () => (await readFile(page)).includes('SIGO-ESCRIBIENDO'));
  await settle(page);
  text = await pageText(page);
  rep.check(
    'apartados distintos del mismo A3: no se pregunta nada',
    !text.includes('lo mismo que tú') && !text.includes('versiones distintas')
  );
  const titleNow = await page.evaluate(() => document.querySelector('[aria-label="Título del A3"]').value);
  rep.check(
    'apartados distintos: el editor muestra el título de la otra persona',
    titleNow === 'TITULO-DE-OTRA-PERSONA',
    titleNow
  );
  rep.check(
    'apartados distintos: no se pierde lo que estaba escribiendo',
    (
      await page.evaluate(() => document.querySelector('textarea[aria-label="Contexto y antecedentes"]').value)
    ).includes('SIGO-ESCRIBIENDO')
  );
  const fieldMerge = await readFile(page);
  rep.check(
    'apartados distintos: el archivo tiene los dos cambios',
    fieldMerge.includes('TITULO-DE-OTRA-PERSONA') && fieldMerge.includes('SIGO-ESCRIBIENDO')
  );

  // --- Otra persona crea/cambia OTRO A3 mientras edito: se fusiona sin preguntar ---
  await externalEdit(page, addProject, ['a3-otra-persona', 'A3-DE-OTRA-PERSONA']);
  await typeInFirstTextarea(page, ' EDIT-PROPIO');
  await until(async () => (await readFile(page)).includes('EDIT-PROPIO'));
  await settle(page);
  text = await pageText(page);
  rep.check(
    'A3 distintos: no se pregunta nada',
    !text.includes('lo mismo que tú') && !text.includes('versiones distintas')
  );
  const merged = await readFile(page);
  rep.check(
    'A3 distintos: el archivo tiene mi cambio y el A3 de la otra persona',
    merged.includes('EDIT-PROPIO') && merged.includes('A3-DE-OTRA-PERSONA')
  );
  rep.check(
    'A3 distintos: el editor no se ha recargado (sigo en mi A3)',
    (
      await page.evaluate(() => document.querySelector('textarea[aria-label="Contexto y antecedentes"]').value)
    ).includes('EDIT-PROPIO')
  );
  await clickButton(page, 'Volver al Almacén');
  rep.check(
    'A3 distintos: el A3 de la otra persona aparece en el almacén',
    (await pageText(page)).includes('A3-DE-OTRA-PERSONA')
  );

  // --- Cambios ajenos al volver a la ventana ---
  await externalEdit(page, setTitle, ['a3-otra-persona', 'TITULO-RECARGA-FOCO']);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await waitForText(page, 'TITULO-RECARGA-FOCO');
  rep.check(
    'al volver a la ventana se cargan cambios de otros',
    (await pageText(page)).includes('TITULO-RECARGA-FOCO')
  );

  // --- Otra persona me pide una revisión a través del archivo: aviso inmediato ---
  await externalEdit(
    page,
    (list, [id]) => {
      const p = list.find((x) => x.id === id);
      p.review = { state: 'en_revision', reviewer: 'Ana Prueba', requestedBy: 'Luis', requestedAt: '2026-01-01 10:00' };
    },
    ['a3-otra-persona']
  );
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await waitForText(page, 'Tienes 1 A3 pendiente de tu revisión');
  await waitForText(page, 'Luis te ha pedido revisar', 3000);
  text = await pageText(page);
  rep.check('petición de revisión recibida: aviso en el momento', text.includes('Luis te ha pedido revisar'));
  rep.check('petición de revisión recibida: banner destacado', text.includes('Tienes 1 A3 pendiente de tu revisión'));

  // --- Reapertura: reconectar con cambios propios y ajenos hechos entretanto ---
  // (se reabre la app en una pestaña nueva, como haría el usuario)
  await page.evaluate(() => localStorage.setItem('__test_permiso', 'prompt'));
  await page.close();
  page = await newMockedPage(context, errors);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await waitForText(page, 'Reconectar');
  rep.check('al reabrir se ofrece Reconectar', (await pageText(page)).includes('Reconectar'));
  await openProject(page, 'TITULO-DE-OTRA-PERSONA');
  await typeInFirstTextarea(page, ' OFFLINE-EDIT');
  await waitSaved(page);
  await clickButton(page, 'Volver al Almacén');
  await externalEdit(page, setTitle, ['a3-otra-persona', 'CAMBIO-AJENO-SIN-CONEXION']);
  await clickButton(page, 'Reconectar');
  await until(async () => (await readFile(page)).includes('OFFLINE-EDIT'));
  text = await pageText(page);
  rep.check(
    'reconectar: se fusiona sin preguntar',
    !text.includes('lo mismo que tú') && !text.includes('versiones distintas')
  );
  const reconnected = await readFile(page);
  rep.check(
    'reconectar: llegan mis cambios sin conexión y se conservan los ajenos',
    reconnected.includes('OFFLINE-EDIT') && reconnected.includes('CAMBIO-AJENO-SIN-CONEXION')
  );

  // --- Otra persona guarda con una versión más nueva de la app: aviso ---
  await page.evaluate(async (FILE) => {
    const h = await (await navigator.storage.getDirectory()).getFileHandle(FILE);
    const data = JSON.parse(await (await h.getFile()).text());
    data.appVersion = '99.0.0';
    const before = (await h.getFile()).lastModified;
    for (let i = 0; i < 30; i++) {
      const w = await h.createWritable();
      await w.write(JSON.stringify(data));
      await w.close();
      if ((await h.getFile()).lastModified !== before) break;
      await new Promise((r) => setTimeout(r, 100));
    }
  }, FILE);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await waitForText(page, 'Estás usando una versión antigua de la app');
  rep.check(
    'almacén guardado por una versión más nueva: aviso de versión antigua',
    (await pageText(page)).includes('Estás usando una versión antigua de la app')
  );

  // --- Editor ---
  await clickButton(page, 'Nuevo Problema A3');
  rep.check('los A3 nuevos se abren en Modo Asistente', (await pageText(page)).includes('MODO ASISTENTE GUIADO'));
  const titleInput = await page.$('[aria-label="Título del A3"]');
  rep.check('modo asistente: se puede editar el título del A3', Boolean(titleInput));
  if (titleInput) {
    await titleInput.click({ clickCount: 3 });
    await page.keyboard.type('A3 CREADO EN ASISTENTE');
    await waitSaved(page);
  }
  await clickButton(page, 'Volver al Almacén');
  rep.check(
    'el A3 nuevo aparece en el almacén con su título',
    (await pageText(page)).includes('A3 CREADO EN ASISTENTE')
  );
  await openProject(page, 'TITULO-DE-OTRA-PERSONA');
  const guideButtons = await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Guía Sensei')?.click();
    return new Promise((r) =>
      setTimeout(
        () => r([...document.querySelectorAll('button')].filter((b) => b.textContent.includes('Guía Sensei')).length),
        400
      )
    );
  });
  // Secciones de la lámina (el botón «Criterios de calidad» de cada una; no el resumen de la barra del editor)
  const sections = await page.evaluate(
    () =>
      [...document.querySelectorAll('button')].filter(
        (b) => b.textContent.includes('Criterios de calidad') && !b.closest('[data-editor-toolbar]')
      ).length
  );
  rep.check(
    'lámina: un solo botón de Guía Sensei por sección',
    guideButtons === sections,
    `${guideButtons} botones / ${sections} secciones`
  );
  text = await pageText(page);
  rep.check(
    'se muestra un solo indicador de avance (Pasos n/7)',
    /Pasos\s*\d+\/7/.test(text) && !/Relleno\s*\d+%/.test(text)
  );
  rep.check('sin botón Guardar duplicado', !text.includes('Guardar Cambios'));

  rep.check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await page.close();
  return rep.failures;
}
