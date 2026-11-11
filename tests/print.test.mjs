// La lámina A3 debe imprimirse siempre en UNA sola hoja DIN A3 apaisada,
// tanto desde la app como desde el HTML imprimible descargado.
import { createReporter, settle } from './helpers.mjs';

const pdfPages = (buf) => {
  const m = Buffer.from(buf)
    .toString('latin1')
    .match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)|\/Count\s+(\d+)[\s\S]*?\/Type\s*\/Pages/);
  return m ? Number(m[1] || m[2]) : -1;
};

/** Triplica los textos y duplica las acciones del primer A3 del almacén. */
const makeLong = () => {
  const key = 'cms_lean_a3_projects_v2';
  const list = JSON.parse(localStorage.getItem(key));
  const p = list[0];
  for (const k of ['background', 'currentCondition', 'goals', 'check', 'followUp', 'rootCauseConclusions']) {
    if (p[k]) p[k] = [p[k], p[k], p[k]].join(' ');
  }
  // Una categoría mucho más larga que las demás (descentraba el Ishikawa)
  const cat = p.rootCauseIshikawa.categories[0];
  cat.causes = [...cat.causes, ...cat.causes.map((c, i) => ({ ...c, id: `${c.id}-copia-${i}`, isRootCause: false }))];
  p.actionItems = [...p.actionItems, ...p.actionItems.map((a, i) => ({ ...a, id: `${a.id}-copia-${i}` }))];
  localStorage.setItem(key, JSON.stringify(list));
};

async function printToPdf(page) {
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint'))); // page.pdf() no lo dispara
  await page.emulateMediaType('print');
  const buf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await page.emulateMediaType('screen');
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  return buf;
}

export async function run(browser, url) {
  const rep = createReporter('impresión');
  for (const variant of ['normal', 'largo']) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1600, height: 1100 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.setItem('cms_a3_bienvenida_vista', '1'));
    if (variant === 'largo') await page.evaluate(makeLong);
    await page.reload({ waitUntil: 'networkidle0' });
    const label = variant === 'largo' ? 'A3 extenso' : 'A3 de ejemplo';

    rep.check(`${label}: se imprime en una sola hoja`, pdfPages(await printToPdf(page)) === 1);

    // Vista previa: aviso de reducción solo cuando no cabe
    await page.evaluate(() => {
      window.__blobs = [];
      const original = URL.createObjectURL;
      URL.createObjectURL = (blob) => {
        window.__blobs.push(blob);
        return original(blob);
      };
      [...document.querySelectorAll('[title]')]
        .find((e) => e.getAttribute('title').includes('Vista Previa e Imprimir'))
        .click();
    });
    await settle(page);
    const banner = await page.evaluate(() => document.body.innerText.includes('no cabe en una hoja'));
    rep.check(
      `${label}: ${variant === 'largo' ? 'la vista previa avisa de la reducción' : 'sin aviso de reducción'}`,
      banner === (variant === 'largo')
    );

    // Ishikawa de la lámina: espina, triángulo y cabeza a la misma altura
    const offsets = await page.evaluate(() => {
      const fig = [...document.querySelectorAll('[data-print-ishikawa]')].find(
        (e) => e.getBoundingClientRect().height > 0
      );
      if (!fig) return null;
      const mid = (n) => {
        const r = fig.querySelector(`[data-ishikawa="${n}"]`).getBoundingClientRect();
        return r.top + r.height / 2;
      };
      const spine = mid('espina');
      return [Math.abs(mid('triangulo') - spine), Math.abs(mid('cabeza') - spine)];
    });
    rep.check(
      `${label}: triángulo y cabeza del Ishikawa centrados en la espina`,
      offsets && offsets.every((d) => d < 2),
      JSON.stringify(offsets)
    );

    // HTML imprimible descargado
    await page.evaluate(() =>
      [...document.querySelectorAll('button')].find((b) => /HTML/i.test(b.textContent + b.title)).click()
    );
    await settle(page);
    const html = await page.evaluate(async () => (window.__blobs.length ? window.__blobs[0].text() : null));
    rep.check(`${label}: se genera el HTML imprimible`, Boolean(html));
    if (html) {
      rep.check(
        `${label}: el HTML imprimible no depende de internet`,
        !/<link[^>]+https?:|<script[^>]+src=/i.test(html)
      );
      const standalone = await context.newPage();
      standalone.on('pageerror', (e) => errors.push(`imprimible: ${e.message}`));
      await standalone.setContent(html, { waitUntil: 'load' });
      rep.check(`${label}: el HTML imprimible sale en una sola hoja`, pdfPages(await printToPdf(standalone)) === 1);
    }
    rep.check(`${label}: sin errores de JavaScript`, errors.length === 0, errors.join(' | '));
    await context.close();
  }
  return rep.failures;
}
