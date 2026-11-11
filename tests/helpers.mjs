// Utilidades comunes de las pruebas: servidor estático para dist/ y arranque
// de Chrome/Edge instalado en el equipo (puppeteer-core no descarga navegador).
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

export const ROOT = join(import.meta.dirname, '..');
export const APP_FILE = 'Lean-A3.html';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

export function findBrowser() {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error('No se encontró Chrome ni Edge. Indica la ruta con la variable CHROME_PATH.');
  }
  return found;
}

/** Sirve dist/ por HTTP (necesario para simular archivos con el almacenamiento interno de Chrome). */
export function serveDist() {
  const file = join(ROOT, 'dist', APP_FILE);
  if (!existsSync(file)) throw new Error(`Falta dist/${APP_FILE}: ejecuta antes "npm run build".`);
  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}/${APP_FILE}`, close: () => server.close() });
    });
  });
}

export async function launch() {
  return puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ['--no-sandbox'],
    // Mostrar barras de desplazamiento reales (como en Windows): sin ellas no se
    // detectan fallos de maquetación que dependen de su grosor
    ignoreDefaultArgs: ['--hide-scrollbars'],
  });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Espera a que la página «se calme»: ninguna modificación del DOM durante
 * `quiet` ms (como mucho `max` ms). Sustituye a las esperas fijas: termina en
 * cuanto la interfaz ha reaccionado, sea rápida o lenta la máquina.
 */
export async function settle(page, { quiet = 120, max = 4000 } = {}) {
  await page.evaluate(
    (quiet, max) =>
      new Promise((resolve) => {
        let timer = setTimeout(done, quiet);
        const limit = setTimeout(done, max);
        const mo = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(done, quiet);
        });
        mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
        function done() {
          mo.disconnect();
          clearTimeout(timer);
          clearTimeout(limit);
          requestAnimationFrame(() => resolve());
        }
      }),
    quiet,
    max
  );
}

/** Espera (hasta `timeout` ms) a que aparezca un botón cuyo texto contenga `text`, lo pulsa y espera a que la página se calme. */
export async function clickButton(page, text, { timeout = 3000 } = {}) {
  const found = await page
    .waitForFunction(
      (t) =>
        [...document.querySelectorAll('button')].some(
          (b) => b.textContent.trim().includes(t) || (b.getAttribute('aria-label') || '').includes(t)
        ),
      { timeout },
      text
    )
    .then(() => true)
    .catch(() => false);
  if (!found) return false;
  await page.evaluate((t) => {
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent.trim().includes(t) || (b.getAttribute('aria-label') || '').includes(t))
      .click();
  }, text);
  await settle(page);
  return true;
}

/** Abre un A3 del almacén por parte de su título y espera a que el editor esté listo */
export async function openProject(page, titlePart) {
  await page.waitForFunction(
    (t) => [...document.querySelectorAll('h2,h3,h4')].some((e) => e.textContent.includes(t)),
    { timeout: 5000 },
    titlePart
  );
  await page.evaluate((t) => {
    [...document.querySelectorAll('h2,h3,h4')].find((e) => e.textContent.includes(t)).click();
  }, titlePart);
  await page.waitForSelector('[data-editor-toolbar]', { timeout: 5000 });
  await settle(page);
}

/**
 * Repite `check` (función asíncrona de Node) hasta que devuelva algo verdadero
 * o se agote el tiempo. Devuelve si se cumplió. Sustituye a «esperar N ms y mirar».
 */
export async function until(check, { timeout = 6000, interval = 100 } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    try {
      if (await check()) return true;
    } catch {
      /* todavía no */
    }
    if (Date.now() > end) return false;
    await new Promise((r) => setTimeout(r, interval));
  }
}

/** Espera a que la página muestre un texto (cadena o expresión regular). Devuelve si apareció. */
export async function waitForText(page, text, timeout = 6000) {
  const src = text instanceof RegExp ? text.source : text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flags = text instanceof RegExp ? text.flags : '';
  return page
    .waitForFunction((src, flags) => new RegExp(src, flags).test(document.body.innerText), { timeout }, src, flags)
    .then(() => true)
    .catch(() => false);
}

/** Escribe al final de un campo. El foco se pone por programa: un clic podría caer en la barra fija si la página está desplazada. */
export async function typeAtEnd(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 5000 });
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    el.scrollIntoView({ block: 'center' });
    el.focus();
    if ('setSelectionRange' in el) el.setSelectionRange(el.value.length, el.value.length);
  }, selector);
  await page.keyboard.type(text);
}

export const CONTEXT = 'textarea[aria-label="Contexto y antecedentes"]';

/** Espera a que el editor haya guardado (sin «Guardando…» en pantalla) */
export async function waitSaved(page, timeout = 6000) {
  // Estado de guardado del editor (atributo, no el texto); fuera del editor no hay nada que esperar
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-save-status]');
      return !el || el.getAttribute('data-save-status') === 'saved';
    },
    { timeout }
  );
  await settle(page);
}

export const pageText = (page) => page.evaluate(() => document.body.innerText);

/** Registro de resultados sencillo */
export function createReporter(name) {
  const failures = [];
  return {
    check(label, condition, detail = '') {
      console.log(`${condition ? '  ✔' : '  ✘'} ${label}${!condition && detail ? ` — ${detail}` : ''}`);
      if (!condition) failures.push(`${name}: ${label}`);
    },
    failures,
  };
}
