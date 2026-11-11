// Rendimiento con un almacén grande (200 A3). Umbrales holgados: sirven para
// detectar empeoramientos claros, no para medir con precisión.
import { createReporter } from './helpers.mjs';

export async function run(browser, url) {
  const rep = createReporter('rendimiento');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  const kb = await page.evaluate(() => {
    const base = JSON.parse(localStorage.getItem('cms_lean_a3_projects_v2'))[0];
    const list = Array.from({ length: 200 }, (_, i) => ({
      ...structuredClone(base),
      id: `perf-${i}`,
      title: `A3 número ${i}`,
    }));
    const s = JSON.stringify(list);
    localStorage.setItem('cms_lean_a3_projects_v2', s);
    localStorage.setItem('cms_a3_bienvenida_vista', '1');
    localStorage.setItem('cms_a3_usuario', 'Prueba');
    return Math.round(s.length / 1024);
  });
  const t0 = Date.now();
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('[data-step-strip]').length === 200, { timeout: 15000 });
  const load = Date.now() - t0;
  // Con la CPU ralentizada a propósito (CPU_LENTA=N) los límites de tiempo se escalan en proporción
  const factor = Math.max(1, Number(process.env.CPU_LENTA || 1));
  rep.check(`200 A3 (${kb} KB): el almacén se muestra en menos de ${3 * factor} s`, load < 3000 * factor, `${load} ms`);

  const keys = await page.evaluate(async () => {
    const input = document.querySelector('input[placeholder*="Buscar"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const times = [];
    for (const term of ['n', 'nú', 'núm', '1', '12', '']) {
      const t = performance.now();
      setter.call(input, term);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      times.push(Math.round(performance.now() - t));
    }
    return times;
  });
  const worst = Math.max(...keys);
  const limit = 150 * factor;
  rep.check(`el buscador responde en menos de ${limit} ms por tecla`, worst < limit, `${keys.join(', ')} ms`);
  await context.close();
  return rep.failures;
}
