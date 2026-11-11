// Pruebas unitarias rápidas de la lógica (sin navegador): indicador, revisión,
// acciones, fechas, completitud, operaciones sobre A3, causas raíz, glosario,
// opiniones y formato del almacén. Se compilan al vuelo con esbuild.
import { build } from 'esbuild';
import { ROOT, createReporter } from './helpers.mjs';

const ENTRY = `
export * from './src/utils/indicator';
export * from './src/utils/review';
export * from './src/utils/actions';
export * from './src/utils/dates';
export * from './src/utils/completeness';
export { QUALITY_CRITERIA_BY_STEP } from './src/data/qualityCriteria';
export * from './src/utils/projectOps';
export * from './src/utils/rootCauses';
export * from './src/utils/glossary';
export * from './src/utils/version';
export * from './src/utils/normalize';
export * from './src/utils/actionSync';
export * as ish from './src/components/ishikawa/ishikawaOps';
export { mergeOpinions } from './src/storage/merge';
export { doneByVersion, isDue, opinionsToCsv, statusOf, statusPatch } from './src/utils/opinions';
export { planMerge } from './src/storage/almacen/planMerge';
export { newerThanApp } from './src/storage/almacen/AlmacenSync';
export { describeFileError } from './src/storage/almacen/fileErrors';
export { DamagedFileError, OutdatedAppError, VerifyError } from './src/storage/fileStore';
export { parseAlmacenFull, serializeAlmacen } from './src/storage/fileStore';
export { initialProjects, emptyProjectTemplate } from './src/data/defaultProjects';
`;

async function load() {
  const out = await build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    jsx: 'automatic',
    logLevel: 'silent',
    define: { __APP_VERSION__: '"9.9.9"', 'process.env.NODE_ENV': '"production"' },
  });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
}

export async function run() {
  const rep = createReporter('unitarias');
  const m = await load();
  const sample = JSON.parse(JSON.stringify(m.initialProjects[0]));

  // --- Números e indicador ---
  rep.check('parseNumber acepta coma y punto', m.parseNumber('4,8') === 4.8 && m.parseNumber(' 0.3 ') === 0.3);
  rep.check(
    'parseNumber: vacío es undefined y texto es NaN',
    m.parseNumber('') === undefined && Number.isNaN(m.parseNumber('4,8x'))
  );
  rep.check('withUnit con % y con unidad', m.withUnit(1.4, '%') === '1,4%' && m.withUnit(12, 'min') === '12 min');
  const ind = {
    name: 'x',
    unit: '%',
    direction: 'down',
    baseline: 5,
    target: 1,
    measurements: [
      { id: 'a', date: '2026-01-03', value: 0.8 },
      { id: 'b', date: '2026-01-01', value: 4 },
      { id: 'c', date: '2026-01-02', value: 0.9 },
      { id: 'd', date: '2026-01-04', value: null },
    ],
  };
  const st = m.indicatorStatus(ind);
  rep.check(
    'indicador: ordena por fecha e ignora filas sin valor',
    st.count === 3 && st.last === 0.8 && st.lastDate === '2026-01-03'
  );
  rep.check('indicador: racha de mediciones que cumplen', st.met === true && st.streak === 2, JSON.stringify(st));
  rep.check('indicador: mejora frente a la base', Math.round(st.improvementPct) === 84);
  const up = m.indicatorStatus({ ...ind, direction: 'up', target: 3 });
  rep.check(
    'indicador "mejor si sube": falta hasta la meta',
    up.met === false && Math.abs(up.gap - 2.2) < 1e-9,
    JSON.stringify(up)
  );
  rep.check(
    'resumen antes/meta/actual desde el indicador',
    JSON.stringify(m.metricSummary({ indicator: ind })) ===
      JSON.stringify({ before: '5%', target: '≤ 1%', after: '0,8%' })
  );
  rep.check(
    'resumen sin indicador: textos libres',
    m.metricSummary({ beforeMetric: 'a', targetMetric: 'b', afterMetric: 'c' }).target === 'b'
  );

  // --- Fechas ---
  rep.check(
    'formatDate ISO → dd/mm/aaaa',
    m.formatDate('2026-11-04') === '04/11/2026' && m.formatDate('texto') === 'texto' && m.formatDate() === ''
  );
  rep.check(
    'describeStamp acepta fechas ISO (hoy hh:mm)',
    /^hoy \d{2}:\d{2}$/.test(m.describeStamp(new Date().toISOString())),
    m.describeStamp(new Date().toISOString())
  );
  rep.check('describeStamp de otro día', m.describeStamp('2020-03-04 10:00') === '04/03/2020');
  rep.check('localDate en formato ISO', /^\d{4}-\d{2}-\d{2}$/.test(m.localDate()));

  // --- Acciones ---
  rep.check('daysUntil', m.daysUntil('2026-01-10', '2026-01-08') === 2 && m.daysUntil(undefined) === null);
  rep.check(
    'vencida solo si no está hecha',
    m.isOverdue({ status: 'pending', dueDate: '2026-01-01' }, '2026-01-02') &&
      !m.isOverdue({ status: 'completed', dueDate: '2026-01-01' }, '2026-01-02')
  );
  rep.check(
    'isOwner ignora tildes y mayúsculas',
    m.isOwner('José Pérez (Calidad)', 'jose perez') && !m.isOwner('Joselito', 'Jose')
  );
  const csv = m.actionsToCsv(m.collectActions([sample]));
  rep.check('CSV de acciones con BOM y punto y coma', csv.charCodeAt(0) === 0xfeff && csv.split('\n')[0].includes(';'));

  // --- Revisión ---
  const req = { ...sample, review: m.requestReview(sample, 'Marta', 'Ana') };
  rep.check('pedir revisión', req.review.state === 'en_revision' && req.review.reviewer === 'Marta');
  const ok = { ...req, review: m.decideReview(req, 'aprobado', 'Marta') };
  rep.check('aprobar guarda la huella del contenido', ok.review.state === 'aprobado' && !m.changedAfterApproval(ok));
  rep.check('cambiar tras aprobar se detecta', m.changedAfterApproval({ ...ok, goals: ok.goals + ' cambio' }));
  const withC = { ...sample, comments: m.addComment(sample, 2, 'Falta el dato', 'Marta') };
  rep.check(
    'comentarios abiertos por paso',
    m.openComments(withC, 2).length === 1 && m.openComments(withC, 3).length === 0
  );

  // --- Completitud ---
  rep.check('el ejemplo está completo', m.calculateA3Completeness(sample).percentage === 100);
  rep.check('un A3 vacío no', m.calculateA3Completeness({ ...m.emptyProjectTemplate, id: 'x' }).percentage < 50);
  const prog = m.a3Progress(sample);
  rep.check(
    'avance: el ejemplo relleno pasa a «falta autoevaluar»',
    prog.done === 7 && prog.total === 7 && prog.phase === 'review'
  );
  const allChecks = Object.fromEntries(
    Object.values(m.QUALITY_CRITERIA_BY_STEP).flatMap((st) => st.criteria.map((c) => [c.id, true]))
  );
  rep.check(
    'avance: con todos los criterios de calidad queda validado',
    m.a3Progress({ ...sample, qualityChecks: allChecks }).phase === 'validated'
  );
  rep.check(
    'avance: un A3 vacío está rellenándose',
    m.a3Progress({ ...m.emptyProjectTemplate, id: 'x' }).phase === 'filling'
  );
  const noCheck = { ...sample, check: '', indicator: { ...sample.indicator } };
  rep.check(
    'paso 6 completo con mediciones aunque no haya texto',
    m.calculateA3Completeness(noCheck).steps[6].completed
  );

  // --- Operaciones sobre A3 ---
  const list = [
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B' },
  ];
  const trashed = m.trashProject(list, 'a', 'Ana', '2026-01-01T10:00');
  rep.check(
    'papelera: borrado suave con autor',
    trashed[0].deletedAt === '2026-01-01T10:00' && trashed[0].deletedBy === 'Ana'
  );
  rep.check('restaurar quita la marca', !('deletedAt' in m.restoreProject(trashed, 'a', 'Luis')[0]));
  const old = [{ id: 'v', deletedAt: '2000-01-01T00:00' }, { id: 'n', deletedAt: m.localStamp() }, { id: 'x' }];
  rep.check(
    'purga solo lo de más de 30 días',
    m
      .purgeOldTrash(old)
      .map((p) => p.id)
      .join() === 'n,x'
  );
  const imp = m.importProjects(list, [
    { id: 'a', title: 'A importado' },
    { id: 'z', title: 'Z' },
  ]);
  rep.check('importar no pisa ids existentes', imp.length === 4 && imp[0].id !== 'a' && imp[1].id === 'z');
  const dup = m.duplicateProject({ ...sample, review: { state: 'aprobado' } }, 'Ana');
  rep.check(
    'duplicar crea otro id y no copia la aprobación',
    dup.id !== sample.id && !dup.review && dup.title.endsWith('(Copia)')
  );
  rep.check(
    'upsert añade al principio o sustituye',
    m.upsertProject(list, { id: 'c' })[0].id === 'c' &&
      m.upsertProject(list, { id: 'b', title: 'B2' })[1].title === 'B2'
  );
  rep.check(
    'nombres conocidos sin repetir y ordenados',
    m.knownNamesOf([{ owner: 'Zoe', createdBy: 'Ana' }, { owner: 'Ana ' }]).join() === 'Ana,Zoe'
  );

  // --- Causas raíz ---
  const rcs = m.rootCausesOf(sample);
  rep.check('causas raíz del Ishikawa del ejemplo', rcs.length === 5 && rcs.every((r) => r.text.startsWith('[')));
  const tree = {
    rootCauseMode: 'tree',
    rootCauseTree: { id: 'r', text: 'raíz', children: [{ id: 'h', text: ' hoja ', isRootCause: true, children: [] }] },
  };
  rep.check(
    'causas raíz del árbol',
    JSON.stringify(m.rootCausesOf(tree)) === JSON.stringify([{ id: 'h', text: 'hoja' }])
  );

  // --- Glosario ---
  const matches = [...'Ir al Gemba y aplicar Poka-Yoke; Genchi Genbutsu'.matchAll(m.GLOSSARY_RE)].map((x) => x[1]);
  rep.check(
    'glosario reconoce términos (el más largo primero)',
    matches.join('|') === 'Gemba|Poka-Yoke|Genchi Genbutsu',
    matches.join('|')
  );
  rep.check('glosario no marca trozos de palabras', [...'Gembas y gemba'.matchAll(m.GLOSSARY_RE)].length === 0);

  // --- Contramedidas ↔ causas raíz ---
  const causes = [
    { id: 'c1', text: '[Máquina] Tobera sucia' },
    { id: 'c2', text: '[Método] Sin purga' },
  ];
  const synced = m.syncActionsWithCauses([], causes, 'Ana');
  rep.check(
    'una fila por causa sin contramedida, con el responsable por defecto',
    synced.length === 2 && synced[0].linkedRootCauseId === 'c1' && synced[1].owner === 'Ana'
  );
  rep.check(
    'si ya están todas vinculadas no cambia nada (misma lista)',
    m.syncActionsWithCauses(synced, causes) === synced
  );
  const renamedCauses = [causes[1], { id: 'c1', text: '[Máquina] Tobera obstruida' }];
  rep.check(
    'renombrar o reordenar causas no cambia las acciones',
    m.syncActionsWithCauses(synced, renamedCauses) === synced
  );
  rep.check(
    'el texto mostrado sigue a la causa (número y texto actuales)',
    m.causeLabel(synced[0], renamedCauses) === '[#2] [Máquina] Tobera obstruida'
  );
  rep.check(
    'sin id: se muestra el texto guardado sin el número antiguo',
    m.causeLabel({ linkedRootCause: '[#3] [Máquina] tobera sucia' }, causes) === '[Máquina] tobera sucia'
  );
  rep.check(
    'causa borrada: se muestra el último texto conocido',
    m.causeLabel(synced[0], []) === synced[0].linkedRootCause && !/\[#/.test(synced[0].linkedRootCause)
  );
  rep.check(
    'vínculo por texto en datos antiguos (sin id)',
    m.isLinkedTo({ linkedRootCause: '[#3] [Máquina] tobera sucia' }, causes[0])
  );

  // --- Ishikawa: operaciones de edición ---
  const I0 = { problemHead: 'P', categories: [{ id: 'c1', name: 'Máquina', causes: [] }] };
  const a1 = m.ish.addCause(I0, 'c1');
  rep.check(
    'Ishikawa: añadir causa devuelve su id y no toca el original',
    a1.data.categories[0].causes[0].id === a1.id && I0.categories[0].causes.length === 0
  );
  const a2 = m.ish.addSubcause(m.ish.setCauseText(a1.data, 'c1', a1.id, 'tobera'), 'c1', a1.id);
  const withSub = m.ish.toggleSubcauseRoot(
    m.ish.setSubcauseText(a2.data, 'c1', a1.id, a2.id, 'sin limpieza'),
    'c1',
    a1.id,
    a2.id
  );
  const cause = withSub.categories[0].causes[0];
  rep.check(
    'Ishikawa: texto, subcausa y marcar causa raíz',
    cause.text === 'tobera' && cause.subcauses[0].text === 'sin limpieza' && cause.subcauses[0].isRootCause === true
  );
  rep.check(
    'Ishikawa: la subcausa marcada aparece como causa raíz',
    m
      .rootCausesOf({ rootCauseMode: 'ishikawa', rootCauseIshikawa: withSub })
      .map((r) => r.text)
      .join() === '[Máquina] tobera ➔ sin limpieza'
  );
  rep.check(
    'Ishikawa: borrar subcausa y causa',
    m.ish.deleteCause(m.ish.deleteSubcause(withSub, 'c1', a1.id, a2.id), 'c1', a1.id).categories[0].causes.length === 0
  );
  const cat = m.ish.addCategory(I0);
  rep.check(
    'Ishikawa: añadir, renombrar y borrar categoría',
    m.ish
      .deleteCategory(m.ish.renameCategory(cat.data, cat.id, 'Medio'), 'c1')
      .categories.map((c) => c.name)
      .join() === 'Medio'
  );

  // --- Validación y reparación de A3 ---
  rep.check('un A3 válido no se toca (misma referencia)', m.normalizeProject(sample) === sample);
  const vacio = { ...m.emptyProjectTemplate, id: 'v' };
  rep.check('la plantilla vacía es válida', m.normalizeProject(vacio) === vacio);
  const roto = {
    id: 7,
    title: 42,
    actionItems: 'no es una lista',
    indicator: { measurements: [{ value: '4,5', date: '2026-01-01' }, 'basura'] },
    w5h1: null,
    rootCauseTree: { text: 'raíz', children: 'x' },
    status: 'raro',
    review: { state: 'inventado' },
    comments: [{ text: 'hola' }, 5],
    qualityChecks: { a: 1 },
    futuro: { x: 1 },
  };
  const rep1 = m.normalizeProject(roto);
  rep.check(
    'repara tipos: id y título a texto, lista de acciones vacía',
    typeof rep1.id === 'string' &&
      rep1.title === '42' &&
      Array.isArray(rep1.actionItems) &&
      rep1.actionItems.length === 0
  );
  rep.check(
    'repara mediciones (texto con coma a número, descarta basura)',
    rep1.indicator.measurements.length === 1 &&
      rep1.indicator.measurements[0].value === 4.5 &&
      rep1.indicator.direction === 'down'
  );
  rep.check(
    'completa 5W1H, árbol e Ishikawa',
    rep1.w5h1.what === '' &&
      Array.isArray(rep1.rootCauseTree.children) &&
      rep1.rootCauseIshikawa.categories.length === 6
  );
  rep.check(
    'estado desconocido → abierto; revisión inválida se quita',
    rep1.status === 'abierto' && !('review' in rep1)
  );
  rep.check(
    'comentarios: descarta los que no son comentarios y les da id',
    rep1.comments.length === 1 && typeof rep1.comments[0].id === 'string'
  );
  rep.check('conserva campos que esta versión no conoce', rep1.futuro.x === 1);
  rep.check(
    'reparar dos veces da lo mismo',
    JSON.stringify(m.normalizeProject(rep1)) === JSON.stringify(rep1) && m.normalizeProject(rep1) === rep1
  );
  rep.check(
    'el mismo A3 roto recibe siempre el mismo id',
    m.normalizeProject({ title: 'x' }).id === m.normalizeProject({ title: 'x' }).id
  );
  const nl = m.normalizeProjects([sample, 'basura', null, { ...sample }]);
  rep.check(
    'lista: descarta lo que no son A3 y separa ids repetidos',
    nl.projects.length === 2 && nl.discarded === 2 && nl.projects[0].id !== nl.projects[1].id
  );
  const fileText = JSON.stringify({
    formato: 'lean-a3-cms',
    version: 1,
    proyectos: [{ id: 'x', title: 'Archivo antiguo' }],
  });
  const oldFile = m.parseAlmacenFull(fileText);
  rep.check(
    'archivo antiguo (formato 1): se lee y se completa',
    oldFile.formatVersion === 1 &&
      oldFile.projects[0].w5h1.what === '' &&
      oldFile.projects[0].title === 'Archivo antiguo'
  );
  rep.check(
    'se guarda con la versión de formato actual',
    JSON.parse(m.serializeAlmacen(oldFile.projects)).version === m.FORMAT_VERSION
  );

  // --- Versiones ---
  rep.check(
    'comparar versiones',
    m.compareVersions('1.10.0', '1.9.9') > 0 && m.compareVersions('1.6.2', '1.6.2') === 0
  );

  // --- Formato del almacén y opiniones ---
  const ops = [{ id: 'o1', text: 'x', updatedAt: '2026-01-01T00:00:00Z', status: 'nueva' }];
  const text = m.serializeAlmacen([sample], ops);
  const back = m.parseAlmacenFull(text);
  rep.check(
    'el almacén guarda versión, A3 y opiniones',
    back.appVersion === '9.9.9' && back.projects.length === 1 && back.opiniones.length === 1
  );
  rep.check('sin opiniones no se añade el campo', !('opiniones' in JSON.parse(m.serializeAlmacen([sample]))));
  rep.check(
    'lee exportaciones antiguas (lista suelta)',
    m.parseAlmacenFull(JSON.stringify([sample])).projects.length === 1
  );
  const mergedOps = m.mergeOpinions(ops, [
    { ...ops[0], status: 'hecha', updatedAt: '2026-02-01T00:00:00Z' },
    { id: 'o2', updatedAt: '2026-01-05T00:00:00Z' },
  ]);
  rep.check(
    'opiniones: unión y gana la última modificación',
    mergedOps.length === 2 && mergedOps.find((o) => o.id === 'o1').status === 'hecha'
  );

  // --- Seguimiento de opiniones (versión de la app en estas pruebas: 9.9.9) ---
  const op = (id, extra = {}) => ({
    id,
    kind: 'idea',
    text: `Texto ${id}`,
    at: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    status: 'nueva',
    ...extra,
  });
  rep.check('opiniones: marcar hecha anota la versión actual', m.statusPatch(op('a'), 'hecha').doneVersion === '9.9.9');
  rep.check(
    'opiniones: marcar hecha una planificada usa su versión prevista',
    m.statusPatch(op('a', { status: 'planificada', plannedVersion: '9.8.0' }), 'hecha').doneVersion === '9.8.0'
  );
  rep.check(
    'opiniones: otro estado no toca las versiones',
    JSON.stringify(m.statusPatch(op('a'), 'descartada')) === '{"status":"descartada"}'
  );
  rep.check(
    'opiniones: planificada para esta versión o anterior = pendiente de marcar',
    m.isDue(op('a', { status: 'planificada', plannedVersion: '9.9.9' })) &&
      !m.isDue(op('b', { status: 'planificada', plannedVersion: '10.0.0' }))
  );
  rep.check(
    'opiniones: un estado desconocido (de una versión futura) se trata como en estudio',
    m.statusOf(op('a', { status: 'rara' })) === 'vista'
  );
  const groups = m.doneByVersion([
    op('a', { status: 'hecha', doneVersion: '1.9.0' }),
    op('b', { status: 'hecha', doneVersion: '1.10.0' }),
    op('c', { status: 'hecha' }),
    op('d'),
  ]);
  rep.check(
    'opiniones: hechas agrupadas por versión, la más reciente primero',
    groups.map((g) => g.version).join(',') === '1.10.0,1.9.0,sin versión',
    groups.map((g) => g.version).join(',')
  );
  const ocsv = m.opinionsToCsv([
    op('a', { text: 'Con "comillas"; y punto y coma', status: 'planificada', plannedVersion: '2.0.0' }),
  ]);
  rep.check(
    'opiniones: CSV con cabecera, estado y comillas escapadas',
    ocsv.startsWith('\ufeff"Tipo";"Opinión"') &&
      ocsv.includes('"Con ""comillas""; y punto y coma"') &&
      ocsv.includes('"Planificada";"2.0.0"'),
    ocsv.slice(0, 200)
  );

  // --- Decisión de fusión (planMerge) ---
  const a3 = (id, title, extra = {}) => ({ ...sample, id, title, ...extra });
  const base = [a3('a', 'A'), a3('b', 'B'), a3('c', 'C'), a3('d', 'D')];
  rep.check(
    'plan: archivo vacío con A3 previos es «dañado»',
    m.planMerge(base, base, { projects: [], empty: true }).kind === 'damaged'
  );
  rep.check(
    'plan: sin base se elige el archivo entero',
    m.planMerge(null, base, { projects: base.slice(0, 2) }).kind === 'whole'
  );
  const other = m.planMerge(base, base, { projects: base.map((p) => (p.id === 'b' ? { ...p, title: 'B2' } : p)) });
  rep.check(
    'plan: cambio ajeno sin conflicto se guarda',
    other.kind === 'commit' && other.fromOthers === 1 && other.merged.find((p) => p.id === 'b').title === 'B2'
  );
  const both = m.planMerge(
    base,
    base.map((p) => (p.id === 'a' ? { ...p, title: 'MIO' } : p)),
    { projects: base.map((p) => (p.id === 'a' ? { ...p, title: 'SUYO' } : p)) }
  );
  rep.check(
    'plan: mismo apartado cambiado por los dos es conflicto',
    both.kind === 'conflicts' && both.conflicts.length === 1 && both.conflicts[0].fields.includes('title')
  );
  const gone = m.planMerge(base, base, { projects: [base[0]] });
  rep.check('plan: faltan 3 A3 sin papelera → preguntar', gone.kind === 'missing' && gone.missing.length === 3);
  const inTrash = base.map((p, i) => (i > 0 ? { ...p, deletedAt: '2026-01-01T00:00:00Z' } : p));
  rep.check(
    'plan: los que estaban en la papelera no cuentan como desaparecidos',
    m.planMerge(inTrash, inTrash, { projects: [inTrash[0]] }).kind === 'commit'
  );
  rep.check(
    'plan: faltan solo 2 → se acepta',
    m.planMerge(base, base, { projects: base.slice(0, 2) }).kind === 'commit'
  );

  // --- Versión del archivo frente a la de la app (9.9.9 en estas pruebas) ---
  rep.check(
    'versión: una app más nueva pone en solo lectura',
    m.newerThanApp({ appVersion: '10.0.0', formatVersion: 2 }) === '10.0.0'
  );
  rep.check(
    'versión: un formato de datos más nuevo también',
    m.newerThanApp({ appVersion: '9.0.0', formatVersion: 99 }) === '9.0.0' &&
      m.newerThanApp({ appVersion: '', formatVersion: 3 }) === 'formato 3'
  );
  rep.check(
    'versión: misma o anterior, se escribe normal',
    m.newerThanApp({ appVersion: '9.9.9', formatVersion: 2 }) === null &&
      m.newerThanApp({ appVersion: '1.7.0', formatVersion: 1 }) === null
  );

  // --- Mensajes de error del archivo ---
  rep.check('error: archivo dañado', m.describeFileError(new m.DamagedFileError('x')).status === 'damaged');
  rep.check(
    'error: versión nueva → solo lectura',
    m.describeFileError(new m.OutdatedAppError('9.0.0')).status === 'outdated'
  );
  const ver = m.describeFileError(new m.VerifyError());
  rep.check(
    'error: verificación marca la escritura propia rota',
    ver.status === 'error' && ver.brokenOwnWrite === true
  );
  rep.check('error: sin permiso', /permiso/.test(m.describeFileError({ name: 'NotAllowedError' }).message));
  rep.check(
    'error: desconocido',
    m.describeFileError(new Error('x')).message === 'No se ha podido guardar en el archivo.'
  );

  return rep.failures;
}
