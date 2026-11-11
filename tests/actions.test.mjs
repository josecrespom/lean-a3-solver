// Seguimiento de acciones e indicadores del almacén.
// Las fechas se calculan respecto a hoy para que la prueba no dependa del día.
import { clickButton, createReporter, pageText, settle } from './helpers.mjs';

const seed = () => {
  const pad = (n) => String(n).padStart(2, '0');
  const day = (offset) => {
    const d = new Date(Date.now() + offset * 86400000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const key = 'cms_lean_a3_projects_v2';
  const list = JSON.parse(localStorage.getItem(key));
  const base = list[0];
  const a3 = {
    ...base,
    id: 'a3-seguimiento',
    title: 'A3 DE SEGUIMIENTO',
    status: 'en_progreso',
    actionItems: [
      { id: 'v', action: 'ACCION-VENCIDA', owner: 'Luis Pérez (Mantenimiento)', dueDate: day(-3), status: 'pending' },
      { id: 's', action: 'ACCION-SEMANA', owner: 'Marta', dueDate: day(3), status: 'in_progress' },
      { id: 'l', action: 'ACCION-LEJANA', owner: 'Luis Pérez (Mantenimiento)', dueDate: day(30), status: 'pending' },
      { id: 'h', action: 'ACCION-HECHA', owner: 'Mariana', dueDate: day(-10), status: 'completed' },
    ],
  };
  localStorage.setItem(key, JSON.stringify([a3]));
  localStorage.setItem('cms_a3_usuario', 'Luis');
};

const actionRows = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('tbody tr td:first-child')]
      .filter((td) => td.offsetParent) // excluye la lámina oculta de impresión
      .map((td) => td.textContent.trim())
  );

export async function run(browser, url) {
  const rep = createReporter('acciones');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(seed);
  await page.reload({ waitUntil: 'networkidle0' });

  // Indicadores del almacén y aviso en la barra
  let text = await pageText(page);
  rep.check(
    'almacén: indicador de acciones vencidas',
    /Acciones vencidas\s*1\s*de 3 pendientes/.test(text),
    text.match(/Acciones vencidas[^\n]*\n?[^\n]*/)?.[0]
  );
  const badge = await page.evaluate(() => document.querySelector('[title$="acciones vencidas"]')?.textContent);
  rep.check('barra superior: número de acciones vencidas', badge === '1', String(badge));

  // Aviso al responsable de sus acciones vencidas
  rep.check('el responsable ve «Tienes 1 acción vencida»', text.includes('Tienes 1 acción vencida'));
  await clickButton(page, 'Ver mis acciones');
  rep.check(
    '«Ver mis acciones» muestra solo mis vencidas',
    JSON.stringify(await actionRows(page)) === JSON.stringify(['ACCION-VENCIDA']),
    JSON.stringify(await actionRows(page))
  );
  const mineSelected = await page.evaluate(
    () => document.querySelector('select[aria-label="Filtrar por responsable"]').value
  );
  rep.check('filtro «Mis acciones» seleccionado', mineSelected === '__mine__', mineSelected);
  await clickButton(page, 'Almacén');

  // Vista de acciones
  await clickButton(page, 'Acciones');
  rep.check(
    'vista: por defecto solo pendientes, ordenadas por plazo',
    JSON.stringify(await actionRows(page)) === JSON.stringify(['ACCION-VENCIDA', 'ACCION-SEMANA', 'ACCION-LEJANA']),
    JSON.stringify(await actionRows(page))
  );
  text = await pageText(page);
  rep.check('vista: indica el retraso', text.includes('vencida hace 3 días'));
  await clickButton(page, 'Vencen en 7 días');
  rep.check('filtro «vencen en 7 días»', JSON.stringify(await actionRows(page)) === JSON.stringify(['ACCION-SEMANA']));
  await clickButton(page, 'Todas');
  await page.select('select[aria-label="Filtrar por responsable"]', 'Luis Pérez (Mantenimiento)');
  await settle(page);
  rep.check(
    'filtro por responsable',
    JSON.stringify(await actionRows(page)) === JSON.stringify(['ACCION-VENCIDA', 'ACCION-LEJANA'])
  );
  await page.select('select[aria-label="Filtrar por responsable"]', 'all');

  // Exportar a Excel
  await page.evaluate(() => {
    window.__blobs = [];
    const o = URL.createObjectURL;
    URL.createObjectURL = (b) => {
      window.__blobs.push(b);
      return o(b);
    };
  });
  await clickButton(page, 'Exportar a Excel');
  const csv = await page.evaluate(async () => (window.__blobs[0] ? window.__blobs[0].text() : ''));
  rep.check('exportación CSV para Excel', csv.includes('"Acción";"Responsable"') && csv.includes('ACCION-HECHA'));

  // Marcar como hecha desde la lista
  await page.select('select[aria-label="Estado de «ACCION-VENCIDA»"]', 'completed');
  await settle(page);
  const badgeAfter = await page.evaluate(
    () => document.querySelector('[title$="acciones vencidas"]')?.textContent ?? null
  );
  rep.check('al marcarla como hecha deja de contar como vencida', badgeAfter === null, String(badgeAfter));
  rep.check('y desaparece el aviso de acciones vencidas', !(await pageText(page)).includes('acción vencida'));
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('cms_lean_a3_projects_v2'))[0].actionItems.find((a) => a.id === 'v').status
  );
  rep.check('el cambio de estado se guarda en el A3', stored === 'completed', stored);

  // Abrir el A3 desde la lista
  await page.evaluate(() => [...document.querySelectorAll('button[title="Abrir este A3"]')][0].click());
  await settle(page);
  rep.check(
    'el enlace abre el A3',
    await page.evaluate(() => document.querySelector('[aria-label="Título del A3"]')?.value === 'A3 DE SEGUIMIENTO')
  );

  rep.check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await context.close();
  return rep.failures;
}
