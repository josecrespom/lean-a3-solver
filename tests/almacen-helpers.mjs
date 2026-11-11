// Utilidades para probar el almacén compartido. Los selectores de archivo de
// Windows se sustituyen por archivos del sistema de archivos privado del navegador (OPFS).
import { settle, sleep } from './helpers.mjs';

/** Abre la app con el almacén vacío, sin bienvenida y con un nombre de usuario */
export async function setupAlmacenPage(browser, url, { file, user = 'Ana', errors = [] }) {
  const page = await browser.defaultBrowserContext().newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.evaluateOnNewDocument((file) => {
    const root = () => navigator.storage.getDirectory();
    window.showSaveFilePicker = async () => (await root()).getFileHandle(file, { create: true });
    window.showOpenFilePicker = async () => [await (await root()).getFileHandle(file, { create: true })];
    window.showDirectoryPicker = async () => (await root()).getDirectoryHandle('carpeta_compartida', { create: true });
  }, file);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(
    async (file, user) => {
      localStorage.clear();
      localStorage.setItem('cms_a3_bienvenida_vista', '1');
      localStorage.setItem('cms_a3_usuario', user);
      await Promise.all(
        ['lean-a3-cms', 'lean-a3-cms-copias'].map(
          (db) =>
            new Promise((r) => {
              const req = indexedDB.deleteDatabase(db);
              req.onsuccess = req.onerror = req.onblocked = () => r();
            })
        )
      );
      const dir = await navigator.storage.getDirectory();
      await dir.removeEntry(file).catch(() => {});
      await dir.removeEntry('carpeta_compartida', { recursive: true }).catch(() => {});
    },
    file,
    user
  );
  await page.reload({ waitUntil: 'networkidle0' });
  return page;
}

export const readFile = (page, file) =>
  page.evaluate(async (file) => {
    const h = await (await navigator.storage.getDirectory()).getFileHandle(file);
    return (await h.getFile()).text();
  }, file);

export const readJson = async (page, file) => JSON.parse(await readFile(page, file));

/**
 * Otra persona (u otro programa) escribe en el archivo. Espera lo justo para
 * que cambie la fecha de modificación (resolución de 1 s en algunos sistemas).
 */
export const writeRaw = (page, file, text) =>
  page.evaluate(
    async (file, text) => {
      const h = await (await navigator.storage.getDirectory()).getFileHandle(file);
      const before = (await h.getFile()).lastModified;
      const proto = FileSystemFileHandle.prototype;
      const create = window.__origCreateWritable || proto.createWritable;
      for (let i = 0; i < 30; i++) {
        const w = await create.call(h);
        await w.write(text);
        await w.close();
        if ((await h.getFile()).lastModified !== before) return;
        await new Promise((r) => setTimeout(r, 100));
      }
    },
    file,
    text
  );

/** Hace que la app compruebe el archivo ahora (como al volver a la ventana) y espera a que termine */
export async function syncNow(page) {
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await waitIdle(page);
}

/** Espera a que la app no tenga guardados en marcha (indicador «Guardando…») */
export async function waitIdle(page, extra = 150) {
  await sleep(extra);
  await page
    .waitForFunction(() => !/Guardando/.test(document.body.innerText), { timeout: 5000 })
    .catch(() => undefined);
  await sleep(extra);
}

export async function clickInDialog(page, text) {
  await page.waitForFunction(
    (t) =>
      [...document.querySelectorAll('[role="dialog"] button, [role="alertdialog"] button')].some((b) =>
        b.textContent.trim().startsWith(t)
      ),
    { timeout: 5000 },
    text
  );
  await page.evaluate((t) => {
    [...document.querySelectorAll('[role="dialog"] button, [role="alertdialog"] button')]
      .find((b) => b.textContent.trim().startsWith(t))
      .click();
  }, text);
  await settle(page);
}

/** Espera hasta que el texto de la página cumpla una condición */
export const waitText = (page, re, timeout = 5000) =>
  page.waitForFunction(
    (src, flags) => new RegExp(src, flags).test(document.body.innerText),
    { timeout },
    re.source,
    re.flags
  );
