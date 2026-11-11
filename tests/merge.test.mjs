// Pruebas unitarias de la fusión del almacén (src/storage/merge.ts).
// Se compila al vuelo con esbuild (dependencia de desarrollo).
import { build } from 'esbuild';
import { join } from 'node:path';
import { ROOT, createReporter } from './helpers.mjs';

async function loadMerge() {
  const out = await build({
    entryPoints: [join(ROOT, 'src/storage/merge.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    logLevel: 'silent',
  });
  const code = out.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

const P = (id, title, extra = {}) => ({ id, title, background: '', goals: '', ...extra });

export async function run() {
  const rep = createReporter('fusión');
  const { mergeProjects, resolveConflicts } = await loadMerge();
  const base = [P('a', 'A'), P('b', 'B'), P('c', 'C')];
  const titles = (r) => r.merged.map((p) => p.title);
  let r;

  r = mergeProjects(base, [P('a', 'A-mio'), P('b', 'B'), P('c', 'C')], [P('a', 'A'), P('b', 'B-suyo'), P('c', 'C')]);
  rep.check(
    'A3 distintos: se combinan los dos cambios',
    r.conflicts.length === 0 && titles(r).join() === 'A-mio,B-suyo,C'
  );

  r = mergeProjects(
    base,
    [P('a', 'A', { background: 'mío' }), P('b', 'B'), P('c', 'C')],
    [P('a', 'A', { goals: 'suyo' }), P('b', 'B'), P('c', 'C')]
  );
  const a = r.merged.find((p) => p.id === 'a');
  rep.check(
    'mismo A3, campos distintos: se combinan sin conflicto',
    r.conflicts.length === 0 && a.background === 'mío' && a.goals === 'suyo'
  );

  r = mergeProjects(
    base,
    [P('a', 'A-mio'), P('b', 'B'), P('c', 'C')],
    [P('a', 'A-suyo'), P('b', 'B'), P('c', 'C-suyo')]
  );
  rep.check(
    'mismo campo: conflicto solo en ese A3',
    r.conflicts.length === 1 && r.conflicts[0].id === 'a' && r.conflicts[0].fields.join() === 'title'
  );
  rep.check('mismo campo: el resto se fusiona', r.merged.find((p) => p.id === 'c').title === 'C-suyo');
  rep.check(
    'elegir lo mío',
    resolveConflicts(r.merged, r.conflicts, 'mine').find((p) => p.id === 'a').title === 'A-mio'
  );
  rep.check(
    'elegir lo suyo',
    resolveConflicts(r.merged, r.conflicts, 'theirs').find((p) => p.id === 'a').title === 'A-suyo'
  );

  const c1 = { id: 'k1', step: 2, at: '2026-01-01 10:00', text: 'del revisor' };
  const c2 = { id: 'k2', step: 0, at: '2026-01-01 11:00', text: 'del autor' };
  r = mergeProjects([P('a', 'A')], [P('a', 'A-mio', { comments: [c2] })], [P('a', 'A-suyo', { comments: [c1] })]);
  const keepMine = resolveConflicts(r.merged, r.conflicts, 'mine')[0];
  rep.check('los comentarios se suman aunque se elija una versión', keepMine.comments.length === 2);

  r = mergeProjects(
    [P('a', 'A', { comments: [c1] })],
    [P('a', 'A', { comments: [{ ...c1, resolved: true }] })],
    [P('a', 'A', { comments: [c1, c2] })]
  );
  const merged = r.merged[0].comments;
  rep.check(
    'comentario resuelto en un lado y comentario nuevo en el otro',
    merged.length === 2 && merged.find((c) => c.id === 'k1').resolved === true
  );

  r = mergeProjects(base, [P('n1', 'Nuevo mío'), ...base], [...base, P('n2', 'Nuevo suyo')]);
  rep.check('A3 nuevos en los dos lados', r.merged.map((p) => p.id).join() === 'n1,a,b,c,n2');

  r = mergeProjects(base, [P('a', 'A'), P('b', 'B')], [P('a', 'A'), P('b', 'B'), P('c', 'C-suyo')]);
  rep.check(
    'borrado por mí pero modificado por otro: se conserva',
    r.merged.some((p) => p.title === 'C-suyo')
  );

  r = mergeProjects(base, [P('a', 'A'), P('b', 'B')], [P('a', 'A'), P('c', 'C')]);
  rep.check('borrados sin cambios ajenos: se eliminan', r.merged.map((p) => p.id).join() === 'a');

  // --- Fusión en profundidad: listas por elemento y objetos por clave ---
  const act = (id, status = 'pending', action = `acción ${id}`) => ({ id, action, owner: '', dueDate: '', status });
  const acts = [act('x'), act('y'), act('z')];
  r = mergeProjects(
    [P('a', 'A', { actionItems: acts })],
    [P('a', 'A', { actionItems: [act('x', 'completed'), act('y'), act('z')] })],
    [P('a', 'A', { actionItems: [act('x'), act('y', 'in_progress'), act('z')] })]
  );
  rep.check(
    'acciones distintas cambiadas por dos personas: sin conflicto',
    r.conflicts.length === 0,
    JSON.stringify(r.conflicts.map((c) => c.fields))
  );
  rep.check(
    '…y se conservan los dos cambios',
    r.merged[0].actionItems.map((a) => a.status).join() === 'completed,in_progress,pending'
  );

  r = mergeProjects(
    [P('a', 'A', { actionItems: acts })],
    [P('a', 'A', { actionItems: [...acts, act('m1')] })],
    [P('a', 'A', { actionItems: [act('x'), act('t1'), act('y'), act('z')] })]
  );
  rep.check(
    'acciones añadidas por las dos personas: están todas y en su sitio',
    r.conflicts.length === 0 && r.merged[0].actionItems.map((a) => a.id).join() === 'x,t1,y,z,m1',
    r.merged[0].actionItems.map((a) => a.id).join()
  );

  r = mergeProjects(
    [P('a', 'A', { actionItems: acts })],
    [P('a', 'A', { actionItems: [act('x'), act('z')] })],
    [P('a', 'A', { actionItems: [act('x'), act('y'), act('z', 'completed')] })]
  );
  rep.check(
    'una borra una acción y otra cambia otra distinta: sin conflicto',
    r.conflicts.length === 0 &&
      r.merged[0].actionItems.map((a) => `${a.id}:${a.status}`).join() === 'x:pending,z:completed'
  );

  r = mergeProjects(
    [P('a', 'A', { actionItems: acts })],
    [P('a', 'A', { actionItems: [act('x', 'completed', 'cambiada por mí'), act('y'), act('z')] })],
    [P('a', 'A', { actionItems: [act('x', 'pending', 'cambiada por otro'), act('y'), act('z')] })]
  );
  rep.check(
    'la MISMA acción cambiada distinto: conflicto solo en contramedidas',
    r.conflicts.length === 1 && r.conflicts[0].fields.join() === 'actionItems'
  );
  const mineA = resolveConflicts(r.merged, r.conflicts, 'mine')[0].actionItems[0];
  const theirsA = resolveConflicts(r.merged, r.conflicts, 'theirs')[0].actionItems[0];
  rep.check(
    '…y se puede elegir cada versión',
    mineA.action === 'cambiada por mí' && theirsA.action === 'cambiada por otro'
  );

  r = mergeProjects(
    [P('a', 'A', { actionItems: acts })],
    [P('a', 'A', { actionItems: [act('y'), act('z')] })],
    [P('a', 'A', { actionItems: [act('x', 'completed'), act('y'), act('z')] })]
  );
  rep.check('borrada por mí y cambiada por otro: se pregunta', r.conflicts.length === 1);

  const ind = (ms, extra = {}) => ({ name: 'i', direction: 'down', target: 1, measurements: ms, ...extra });
  const med = (id, value) => ({ id, date: `2026-01-0${id.slice(-1)}`, value });
  r = mergeProjects(
    [P('a', 'A', { indicator: ind([med('m1', 5)]) })],
    [P('a', 'A', { indicator: ind([med('m1', 5), med('m2', 4)]) })],
    [P('a', 'A', { indicator: ind([med('m1', 5), med('m3', 3)], { target: 0.5 }) })]
  );
  const mi = r.merged[0].indicator;
  rep.check(
    'mediciones añadidas por dos personas y meta cambiada: todo se junta',
    r.conflicts.length === 0 && mi.measurements.length === 3 && mi.target === 0.5,
    JSON.stringify(mi)
  );

  const ish = (causes) => ({ categories: [{ id: 'c1', name: 'Máquina', causes }] });
  r = mergeProjects(
    [P('a', 'A', { rootCauseIshikawa: ish([{ id: 'k1', text: 'uno' }]) })],
    [P('a', 'A', { rootCauseIshikawa: ish([{ id: 'k1', text: 'uno', isRootCause: true }]) })],
    [
      P('a', 'A', {
        rootCauseIshikawa: ish([
          { id: 'k1', text: 'uno' },
          { id: 'k2', text: 'dos' },
        ]),
      }),
    ]
  );
  const cs = r.merged[0].rootCauseIshikawa.categories[0].causes;
  rep.check(
    'Ishikawa: marcar causa raíz y añadir otra causa a la vez',
    r.conflicts.length === 0 && cs.length === 2 && cs[0].isRootCause === true
  );

  r = mergeProjects(
    [P('a', 'A', { background: 'x' })],
    [P('a', 'A', { background: 'mío' })],
    [P('a', 'A', { background: 'suyo' })]
  );
  rep.check(
    'el mismo texto cambiado distinto sigue siendo conflicto',
    r.conflicts.length === 1 && r.conflicts[0].fields.join() === 'background'
  );

  return rep.failures;
}
