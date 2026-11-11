// Pruebas del lienzo de diagramas (zoom/encuadre) y de la tabla de acciones.
import { clickButton, createReporter, openProject, settle } from './helpers.mjs';

const canvasInfo = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.zoom-pan-viewport')]
      .filter((v) => v.offsetParent)
      .map((v) => {
        const c = v.querySelector('.diagram-canvas-inner');
        const vr = v.getBoundingClientRect();
        const cr = c.getBoundingClientRect();
        return {
          fullyVisible:
            cr.left >= vr.left - 1 && cr.right <= vr.right + 1 && cr.top >= vr.top - 1 && cr.bottom <= vr.bottom + 1,
          width: cr.width,
        };
      })
  );

const hiddenText = (page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('[data-action-list] textarea, .zoom-pan-viewport textarea')].filter(
        (x) => x.offsetParent && x.scrollHeight > x.clientHeight + 1
      ).length
  );

export async function run(browser, url) {
  const rep = createReporter('diagramas');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.setItem('cms_a3_usuario', 'Prueba'));
  await page.reload({ waitUntil: 'networkidle0' });
  await openProject(page, 'porosidad');

  // Ejemplo: cada causa raíz ya tiene su acción, no deben crearse filas vacías
  const emptyRows = await page.evaluate(
    () =>
      [...document.querySelectorAll('[data-action-list] textarea')].filter(
        (t) => t.placeholder.startsWith('Ej: Instalar') && !t.value.trim()
      ).length
  );
  rep.check('el ejemplo no genera acciones vacías', emptyRows === 0, `${emptyRows} filas vacías`);
  rep.check('tabla y diagrama sin texto oculto', (await hiddenText(page)) === 0);

  let [info] = await canvasInfo(page);
  rep.check('lámina: el diagrama arranca encuadrado completo', info?.fullyVisible === true);
  const fit = await page.evaluate(() => {
    const box = [...document.querySelectorAll('[data-fit-height]')].find((e) => e.getBoundingClientRect().width > 0);
    const inner = box?.querySelector('.diagram-canvas-inner');
    return box && inner
      ? {
          box: box.getBoundingClientRect().height,
          diagram: inner.getBoundingClientRect().height,
          zoom: Number(/scale\(([\d.]+)\)/.exec(inner.style.transform)?.[1]),
        }
      : null;
  });
  rep.check(
    'lámina: el lienzo toma la altura del diagrama (sin hueco vacío)',
    fit && fit.box - fit.diagram < 160,
    JSON.stringify(fit)
  );
  rep.check(
    'lámina (1440 px): el Ishikawa se ve a un tamaño legible (≥ 65%)',
    fit && fit.zoom >= 0.65,
    JSON.stringify(fit)
  );

  // Con el zoom al máximo se puede llegar a todos los bordes
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => document.querySelector('button[aria-label="Acercar"]').click());
  }
  await settle(page);
  const edges = await page.evaluate(() => {
    const v = [...document.querySelectorAll('.zoom-pan-viewport')].find((x) => x.offsetParent);
    const c = v.querySelector('.diagram-canvas-inner');
    const vr = v.getBoundingClientRect();
    v.scrollLeft = 0;
    v.scrollTop = 0;
    const a = c.getBoundingClientRect();
    const start = a.left >= vr.left - 1 && a.top >= vr.top - 1;
    v.scrollLeft = v.scrollWidth;
    v.scrollTop = v.scrollHeight;
    const b = c.getBoundingClientRect();
    const end = b.right <= vr.right + 25 && b.bottom <= vr.bottom + 25;
    return { start, end };
  });
  rep.check('zoom máximo: se alcanzan todos los bordes del diagrama', edges.start && edges.end, JSON.stringify(edges));
  await clickButton(page, 'Ajustar');
  [info] = await canvasInfo(page);
  rep.check('"Ajustar" vuelve a encuadrar el diagrama', info?.fullyVisible === true);
  const zooms = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const c = [...document.querySelectorAll('.diagram-canvas-inner')].find((x) => x.offsetParent);
        const seen = new Set();
        let n = 0;
        const t = setInterval(() => {
          seen.add(c.style.transform);
          if (++n >= 20) {
            clearInterval(t);
            resolve([...seen]);
          }
        }, 50);
      })
  );
  rep.check('"Ajustar" no entra en bucle (el zoom se queda quieto)', zooms.length === 1, zooms.join(' '));

  // Modo asistente, paso 4, y cambio a árbol de 5 porqués
  await clickButton(page, 'Modo Asistente');
  await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .find((e) => e.textContent.includes('4. Causa Raíz') && e.textContent.length < 40)
      .click()
  );
  await settle(page);
  [info] = await canvasInfo(page);
  rep.check('asistente: el diagrama arranca encuadrado completo', info?.fullyVisible === true);
  // Un solo método: con Ishikawa empezado, el árbol está deshabilitado
  const treeDisabled = await page.evaluate(
    () =>
      [...document.querySelectorAll('button')].find(
        (b) => b.textContent.trim() === 'Árbol 5 Por Qués' && b.offsetParent
      ).disabled
  );
  rep.check('Ishikawa empezado: el árbol de 5 Por Qués está deshabilitado', treeDisabled === true);
  await clickButton(page, 'Vaciar y cambiar de método');
  rep.check(
    'cambiar de método pide confirmación',
    (await page.evaluate(() => document.body.innerText)).includes('Se borrará todo el contenido')
  );
  await clickButton(page, 'Sí, vaciar');
  const modeNow = await page.evaluate(() =>
    [...document.querySelectorAll('button[aria-pressed="true"]')]
      .map((b) => b.textContent.trim())
      .find((t) => /Árbol|Ishikawa/.test(t))
  );
  rep.check('tras vaciar se pasa al árbol', modeNow === 'Árbol 5 Por Qués', String(modeNow));
  [info] = await canvasInfo(page);
  rep.check('al cambiar a árbol se vuelve a encuadrar', info?.fullyVisible === true);

  // Ishikawa: con una categoría muy grande, espina, triángulo y cabeza siguen alineados
  await clickButton(page, 'Volver al Almacén');
  await page.evaluate(() => {
    const k = 'cms_lean_a3_projects_v2';
    const l = JSON.parse(localStorage.getItem(k));
    const cat = l[0].rootCauseIshikawa.categories[0];
    for (let i = 0; i < 8; i++)
      cat.causes.push({
        id: `grande-${i}`,
        text: `Causa larga ${i} para que la categoría crezca en altura`,
        isRootCause: false,
        subcauses: [],
      });
    l[0].rootCauseMode = 'ishikawa';
    localStorage.setItem(k, JSON.stringify(l));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await openProject(page, 'porosidad');
  const centers = await page.evaluate(() => {
    const v = [...document.querySelectorAll('.diagram-canvas-inner')].find((x) => x.offsetParent);
    const mid = (e) => {
      const r = e.getBoundingClientRect();
      return Math.round(r.top + r.height / 2);
    };
    return [
      mid(v.querySelector('[data-ishikawa="espina"]')),
      mid(v.querySelector('[data-ishikawa="triangulo"]')),
      mid(v.querySelector('[data-ishikawa="cabeza"]')),
    ];
  });
  rep.check(
    'Ishikawa: espina, triángulo y cabeza alineados con una categoría grande',
    Math.max(...centers) - Math.min(...centers) <= 2,
    centers.join(' / ')
  );

  rep.check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await context.close();
  return rep.failures;
}
