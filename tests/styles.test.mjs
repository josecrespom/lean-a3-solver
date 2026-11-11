// Recorre la app en modo claro y oscuro y detecta:
//  - fondos claros en modo oscuro (clases de color que no generan CSS, etc.)
//  - textos con contraste insuficiente (< 3:1)
import { clickButton, createReporter, openProject, settle } from './helpers.mjs';

const auditPage = (page, mode) =>
  page.evaluate((mode) => {
    const parse = (c) => {
      const ok = c.match(/oklch\(([\d.]+)(%?)\s[^/)]*(?:\/\s*([\d.]+%?))?/);
      if (ok) {
        const l = parseFloat(ok[1]) / (ok[2] ? 100 : 1);
        const a = ok[3] ? parseFloat(ok[3]) / (ok[3].endsWith('%') ? 100 : 1) : 1;
        return { lum: Math.pow(l, 3), a };
      }
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const v = m[1]
        .split(/[ ,/]+/)
        .filter(Boolean)
        .map(Number);
      const f = (x) => {
        x /= 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return { lum: 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]), a: v[3] ?? 1 };
    };
    const effectiveBg = (el) => {
      const layers = [];
      for (let e = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c && c.a > 0) {
          layers.push(c);
          if (c.a >= 0.95) break;
        }
      }
      if (!layers.length) return mode === 'dark' ? 0.01 : 1;
      let l = layers[layers.length - 1].lum;
      for (let i = layers.length - 2; i >= 0; i--) l = layers[i].a * layers[i].lum + (1 - layers[i].a) * l;
      return l;
    };
    const describe = (el) =>
      (typeof el.className === 'string'
        ? el.className
            .split(' ')
            .filter((c) => /bg-|text-/.test(c))
            .slice(0, 4)
            .join('.')
        : '') || el.tagName;
    const issues = new Set();
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
      const own = parse(cs.backgroundColor);
      if (mode === 'dark' && own && own.a > 0.3 && r.width * r.height > 3000 && effectiveBg(el) > 0.5) {
        issues.add(`fondo claro en oscuro: ${describe(el)}`);
      }
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (hasText) {
        const fc = parse(cs.color);
        if (!fc) continue;
        const lb = effectiveBg(el);
        const cr = (Math.max(fc.lum, lb) + 0.05) / (Math.min(fc.lum, lb) + 0.05);
        if (cr < 3) issues.add(`contraste ${cr.toFixed(2)}: ${describe(el)} "${el.textContent.trim().slice(0, 25)}"`);
      }
    }
    return [...issues];
  }, mode);

export async function run(browser, url) {
  const rep = createReporter('estilos');
  for (const mode of ['light', 'dark']) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1500, height: 1000 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.evaluate((m) => {
      localStorage.clear();
      localStorage.setItem('lean_a3_theme_mode', m);
      localStorage.setItem('cms_a3_usuario', 'Prueba');
    }, mode);
    await page.reload({ waitUntil: 'networkidle0' });
    // A3 en revisión con comentarios, para auditar también el panel de revisión
    await page.evaluate(() => {
      const k = 'cms_lean_a3_projects_v2';
      const l = JSON.parse(localStorage.getItem(k));
      l[0].review = {
        state: 'en_revision',
        reviewer: 'Prueba',
        history: [{ at: '2026-01-01 10:00', by: 'Ana', action: 'solicitada' }],
      };
      l[0].comments = [
        { id: 'c1', step: 3, author: 'Prueba', at: '2026-01-01 11:00', text: 'Comentario pendiente' },
        { id: 'c2', step: 0, author: 'Prueba', at: '2026-01-01 11:05', text: 'Comentario resuelto', resolved: true },
      ];
      l.push({
        ...l[0],
        id: 'devuelto',
        title: 'A3 devuelto',
        review: { state: 'devuelto', requestedBy: 'Prueba', decidedBy: 'Ana' },
      });
      localStorage.setItem(k, JSON.stringify(l));
    });
    await page.reload({ waitUntil: 'networkidle0' });

    const issues = new Set(await auditPage(page, mode));
    // Las opciones de los desplegables las pinta el sistema: comprobar su contraste
    const badOptions = await page.evaluate(() => {
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgb = (c) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = '#000';
        ctx.fillStyle = c;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      };
      const lum = ([r, g, b]) =>
        [r, g, b]
          .map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          })
          .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
      return [...document.querySelectorAll('option')]
        .filter((o) => {
          const cs = getComputedStyle(o);
          // Fondo transparente = el sistema lo pinta blanco
          const bg = rgb(cs.backgroundColor);
          const [a, b] = [lum(rgb(cs.color)), bg[3] === 0 ? 1 : lum(bg)];
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 4.5;
        })
        .map((o) => o.textContent);
    });
    if (badOptions.length) issues.add(`opciones de desplegable ilegibles: ${badOptions.slice(0, 3).join(', ')}`);
    await openProject(page, 'porosidad');
    await page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .filter((b) => /Guía Sensei|Criterios de calidad|Completo/.test(b.textContent))
        .forEach((b) => b.click())
    );
    await settle(page);
    (await auditPage(page, mode)).forEach((i) => issues.add(i));
    await clickButton(page, 'Matriz de priorización');
    (await auditPage(page, mode)).forEach((i) => issues.add(i));
    await clickButton(page, 'Modo Asistente');
    for (const step of [
      '1. Contexto',
      '2. Situación',
      '3. Objetivo',
      '4. Causa',
      '5. Contramedidas',
      '6. Verificación',
      '7. Yokoten',
    ]) {
      await clickButton(page, step, 400);
      (await auditPage(page, mode)).forEach((i) => issues.add(i));
    }
    await clickButton(page, 'Ver 1 comentario');
    (await auditPage(page, mode)).forEach((i) => issues.add(i));
    await clickButton(page, 'Acciones');
    (await auditPage(page, mode)).forEach((i) => issues.add(i));
    await clickButton(page, 'Guía Metodológica');
    (await auditPage(page, mode)).forEach((i) => issues.add(i));

    rep.check(
      `modo ${mode === 'dark' ? 'oscuro' : 'claro'}: sin problemas de fondo ni contraste`,
      issues.size === 0,
      [...issues].slice(0, 5).join(' | ')
    );
    rep.check(
      `modo ${mode === 'dark' ? 'oscuro' : 'claro'}: sin errores de JavaScript`,
      errors.length === 0,
      errors.join(' | ')
    );
    await context.close();
  }
  return rep.failures;
}
