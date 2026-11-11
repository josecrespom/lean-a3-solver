// La app publicada como artefacto de Claude (p. ej. en el móvil): el visor bloquea
// los enlaces de descarga y ofrece la capacidad `downloads` (se simula aquí).
import { clickButton, createReporter, until } from './helpers.mjs';

const fakeHost = (decline) => {
  window.__saves = [];
  window.claude = {
    use: async (name) =>
      name === 'downloads'
        ? {
            save: async (r) => {
              window.__saves.push({ filename: r.filename, size: String(r.data).length });
              if (decline) throw { code: 'declined', message: 'no' };
              return { status: 'saved' };
            },
          }
        : null,
  };
};

export async function run(browser, url) {
  const rep = createReporter('artefacto');
  for (const decline of [false, true]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.evaluateOnNewDocument(fakeHost, decline);
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      localStorage.setItem('cms_a3_usuario', 'Ana');
      localStorage.setItem('cms_a3_bienvenida_vista', '1');
      localStorage.removeItem('cms_a3_ultima_copia');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await clickButton(page, 'Exportar todo');
    const saved = await until(async () => (await page.evaluate(() => window.__saves.length)) > 0);
    const saves = await page.evaluate(() => window.__saves);
    const last = await page.evaluate(() => localStorage.getItem('cms_a3_ultima_copia'));
    if (!decline) {
      rep.check(
        'en el visor de Claude la copia se guarda con su capacidad de descargas',
        saved && /^almacen_A3_.*\.json$/.test(saves[0]?.filename) && saves[0].size > 100,
        JSON.stringify(saves)
      );
      rep.check('guardada: cuenta como copia descargada', Boolean(last));
      await clickButton(page, 'Acciones');
      await clickButton(page, 'Exportar');
      await until(async () => (await page.evaluate(() => window.__saves.length)) > 1);
      rep.check(
        'el CSV de acciones también se guarda',
        ((await page.evaluate(() => window.__saves))[1]?.filename || '').endsWith('.csv')
      );
    } else {
      rep.check('si se rechaza el guardado, no cuenta como copia hecha', saved && !last, String(last));
    }
    rep.check(
      `sin errores de JavaScript (${decline ? 'rechazo' : 'guardado'})`,
      errors.length === 0,
      errors.join(' | ')
    );
    await context.close();
  }
  return rep.failures;
}
