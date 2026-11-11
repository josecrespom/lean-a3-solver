// Validación y reparación de A3 al cargarlos (archivo del almacén, importación,
// copia de seguridad o navegador). Un A3 incompleto o con tipos raros (editado a
// mano, de una versión antigua, a medio escribir) se completa con valores vacíos
// en lugar de romper el editor.
//
// Reglas:
//   - Lo que ya es válido NO se toca (misma referencia), para no provocar
//     escrituras ni fusiones innecesarias. Aplicarla dos veces da lo mismo.
//   - Los campos que esta versión no conoce se conservan tal cual.
import type {
  A3Indicator,
  A3Project,
  A3Review,
  ActionItem,
  IndicatorMeasurement,
  IshikawaCategory,
  IshikawaCause,
  IshikawaData,
  ReviewComment,
  TreeNode,
  W5H1,
} from '../types/lean';

/** Versión del formato de los datos (la del archivo del almacén) */
export const FORMAT_VERSION = 2;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Identificador estable para un elemento que no lo tenía (mismo contenido → mismo id) */
function stableId(prefix: string, content: unknown): string {
  const text = JSON.stringify(content) ?? '';
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${prefix}-${(h >>> 0).toString(36)}`;
}

/** Texto: lo admite si es texto; un número se convierte; lo demás, vacío */
const str = (v: unknown, fallback = ''): string => (isStr(v) ? v : isNum(v) ? String(v) : fallback);

/**
 * Aplica `fix` a una copia solo si algo cambia; si no, devuelve el original.
 * `fix` recibe la copia y devuelve si ha cambiado algo.
 */
function patch<T extends Obj>(o: T, fix: (copy: T) => boolean): T {
  const copy = { ...o };
  return fix(copy) ? copy : o;
}

function normList<T>(v: unknown, item: (x: unknown, i: number) => T | null): { list: T[]; changed: boolean } {
  if (!Array.isArray(v)) return { list: [], changed: true };
  let changed = false;
  const list: T[] = [];
  v.forEach((x, i) => {
    const r = item(x, i);
    if (r === null) changed = true;
    else {
      if (r !== x) changed = true;
      list.push(r);
    }
  });
  return { list: changed ? list : (v as T[]), changed };
}

// ---------------------------------------------------------------------------
function normTree(v: unknown, path = 'n'): TreeNode | null {
  if (!isObj(v)) return null;
  return patch(v, (c) => {
    let ch = false;
    if (!isStr(c.id) || !c.id) {
      c.id = stableId(`nodo-${path}`, v);
      ch = true;
    }
    if (!isStr(c.text)) {
      c.text = str(c.text);
      ch = true;
    }
    const kids = normList(c.children, (x, i) => normTree(x, `${path}${i}`));
    if (kids.changed) {
      c.children = kids.list;
      ch = true;
    }
    return ch;
  }) as unknown as TreeNode;
}

function normCause(v: unknown, path: string): IshikawaCause | null {
  if (!isObj(v)) return null;
  return patch(v, (c) => {
    let ch = false;
    if (!isStr(c.id) || !c.id) {
      c.id = stableId(`causa-${path}`, v);
      ch = true;
    }
    if (!isStr(c.text)) {
      c.text = str(c.text);
      ch = true;
    }
    if (c.subcauses !== undefined) {
      const subs = normList(c.subcauses, (x, i) => normCause(x, `${path}${i}`));
      if (subs.changed) {
        c.subcauses = subs.list;
        ch = true;
      }
    }
    return ch;
  }) as unknown as IshikawaCause;
}

function normCategory(v: unknown, i: number): IshikawaCategory | null {
  if (!isObj(v)) return null;
  return patch(v, (c) => {
    let ch = false;
    if (!isStr(c.id) || !c.id) {
      c.id = `cat-${i + 1}`;
      ch = true;
    }
    if (!isStr(c.name)) {
      c.name = str(c.name, `Categoría ${i + 1}`);
      ch = true;
    }
    const causes = normList(c.causes, (x, j) => normCause(x, `${i}-${j}`));
    if (causes.changed) {
      c.causes = causes.list;
      ch = true;
    }
    return ch;
  }) as unknown as IshikawaCategory;
}

const DEFAULT_CATEGORIES = ['Maquinaria', 'Métodos', 'Materiales', 'Mano de Obra', 'Medición', 'Medio Ambiente'];

function normIshikawa(v: unknown): IshikawaData {
  if (!isObj(v)) {
    return {
      problemHead: 'Problema a Analizar',
      categories: DEFAULT_CATEGORIES.map((name, i) => ({ id: `cat-${i + 1}`, name, causes: [] })),
    };
  }
  return patch(v, (c) => {
    let ch = false;
    if (!isStr(c.problemHead)) {
      c.problemHead = str(c.problemHead);
      ch = true;
    }
    const cats = normList(c.categories, normCategory);
    if (cats.changed) {
      c.categories = cats.list;
      ch = true;
    }
    return ch;
  }) as unknown as IshikawaData;
}

const ACTION_STATUS = ['pending', 'in_progress', 'completed'];
const LEVEL = ['alto', 'bajo'];

function normAction(v: unknown, i: number): ActionItem | null {
  if (!isObj(v)) return null;
  return patch(v, (c) => {
    let ch = false;
    if (!isStr(c.id) || !c.id) {
      c.id = stableId(`act-${i}`, v);
      ch = true;
    }
    for (const k of ['action', 'owner', 'dueDate'] as const)
      if (!isStr(c[k])) {
        c[k] = str(c[k]);
        ch = true;
      }
    if (!ACTION_STATUS.includes(c.status as string)) {
      c.status = 'pending';
      ch = true;
    }
    for (const k of ['impact', 'effort'] as const)
      if (c[k] !== undefined && !LEVEL.includes(c[k] as string)) {
        delete c[k];
        ch = true;
      }
    for (const k of ['linkedRootCause', 'linkedRootCauseId'] as const)
      if (c[k] !== undefined && !isStr(c[k])) {
        delete c[k];
        ch = true;
      }
    return ch;
  }) as unknown as ActionItem;
}

function normMeasurement(v: unknown, i: number): IndicatorMeasurement | null {
  if (!isObj(v)) return null;
  return patch(v, (c) => {
    let ch = false;
    if (!isStr(c.id) || !c.id) {
      c.id = stableId(`med-${i}`, v);
      ch = true;
    }
    if (!isStr(c.date)) {
      c.date = str(c.date);
      ch = true;
    }
    if (c.value !== null && !isNum(c.value)) {
      const n = isStr(c.value) ? Number(c.value.replace(',', '.')) : NaN;
      c.value = Number.isFinite(n) ? n : null;
      ch = true;
    }
    if (c.note !== undefined && !isStr(c.note)) {
      delete c.note;
      ch = true;
    }
    return ch;
  }) as unknown as IndicatorMeasurement;
}

function normIndicator(v: unknown): A3Indicator | undefined {
  if (!isObj(v)) return undefined;
  return patch(v, (c) => {
    let ch = false;
    if (!isStr(c.name)) {
      c.name = str(c.name);
      ch = true;
    }
    if (c.direction !== 'down' && c.direction !== 'up') {
      c.direction = 'down';
      ch = true;
    }
    if (c.unit !== undefined && !isStr(c.unit)) {
      delete c.unit;
      ch = true;
    }
    for (const k of ['baseline', 'target'] as const)
      if (c[k] !== undefined && !isNum(c[k])) {
        delete c[k];
        ch = true;
      }
    const ms = normList(c.measurements, normMeasurement);
    if (ms.changed) {
      c.measurements = ms.list;
      ch = true;
    }
    return ch;
  }) as unknown as A3Indicator;
}

const REVIEW_STATES = ['borrador', 'en_revision', 'devuelto', 'aprobado'];

function normReview(v: unknown): A3Review | undefined {
  if (!isObj(v) || !REVIEW_STATES.includes(v.state as string)) return undefined;
  return patch(v, (c) => {
    if (c.history !== undefined && !Array.isArray(c.history)) {
      delete c.history;
      return true;
    }
    if (Array.isArray(c.history) && !c.history.every(isObj)) {
      c.history = c.history.filter(isObj);
      return true;
    }
    return false;
  }) as unknown as A3Review;
}

function normComment(v: unknown, i: number): ReviewComment | null {
  if (!isObj(v) || !isStr(v.text)) return null;
  return patch(v, (c) => {
    let ch = false;
    if (!isStr(c.id) || !c.id) {
      c.id = stableId(`com-${i}`, v);
      ch = true;
    }
    if (!isStr(c.at)) {
      c.at = str(c.at);
      ch = true;
    }
    if (!isNum(c.step)) {
      c.step = 0;
      ch = true;
    }
    return ch;
  }) as unknown as ReviewComment;
}

const STATUS = ['abierto', 'en_progreso', 'estandarizado'];
const REQUIRED_TEXT = [
  'title',
  'owner',
  'department',
  'date',
  'background',
  'currentCondition',
  'goals',
  'countermeasures',
  'check',
  'followUp',
] as const;
const OPTIONAL_TEXT = [
  'rootCauseConclusions',
  'beforeMetric',
  'afterMetric',
  'targetMetric',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'deletedAt',
  'deletedBy',
] as const;
const W5H1_KEYS: (keyof W5H1)[] = ['what', 'where', 'when', 'who', 'why', 'how'];

/** Valida y completa un A3. Devuelve null si no es un A3 (no es un objeto). */
export function normalizeProject(v: unknown, index = 0): A3Project | null {
  if (!isObj(v)) return null;
  return patch(v, (c) => {
    let ch = false;
    if (!isStr(c.id) || !c.id) {
      c.id = stableId(`a3-recuperado-${index}`, v);
      ch = true;
    }
    for (const k of REQUIRED_TEXT)
      if (!isStr(c[k])) {
        c[k] = str(c[k]);
        ch = true;
      }
    for (const k of OPTIONAL_TEXT)
      if (c[k] !== undefined && !isStr(c[k])) {
        delete c[k];
        ch = true;
      }
    if (!STATUS.includes(c.status as string)) {
      c.status = 'abierto';
      ch = true;
    }

    if (!isObj(c.w5h1) || !W5H1_KEYS.every((k) => isStr((c.w5h1 as Obj)[k]))) {
      const w = isObj(c.w5h1) ? c.w5h1 : {};
      c.w5h1 = Object.fromEntries(W5H1_KEYS.map((k) => [k, str(w[k])]));
      ch = true;
    }
    if (c.show5W1H !== undefined && typeof c.show5W1H !== 'boolean') {
      delete c.show5W1H;
      ch = true;
    }

    const tree = normTree(c.rootCauseTree);
    if (tree !== c.rootCauseTree) {
      c.rootCauseTree = tree ?? { id: 'root-node', text: 'Problema Principal', isRootCause: false, children: [] };
      ch = true;
    }
    const ish = normIshikawa(c.rootCauseIshikawa);
    if (ish !== c.rootCauseIshikawa) {
      c.rootCauseIshikawa = ish;
      ch = true;
    }
    if (c.rootCauseMode !== 'tree' && c.rootCauseMode !== 'ishikawa') {
      c.rootCauseMode = ish.categories.some((cat) => cat.causes.length) ? 'ishikawa' : 'tree';
      ch = true;
    }

    if (c.actionItems !== undefined) {
      const acts = normList(c.actionItems, normAction);
      if (acts.changed) {
        c.actionItems = acts.list;
        ch = true;
      }
    }
    if (c.indicator !== undefined) {
      const ind = normIndicator(c.indicator);
      if (ind !== c.indicator) {
        if (ind) c.indicator = ind;
        else delete c.indicator;
        ch = true;
      }
    }
    if (c.qualityChecks !== undefined) {
      const q = c.qualityChecks;
      if (!isObj(q)) {
        delete c.qualityChecks;
        ch = true;
      } else if (!Object.values(q).every((x) => typeof x === 'boolean')) {
        c.qualityChecks = Object.fromEntries(Object.entries(q).map(([k, x]) => [k, x === true]));
        ch = true;
      }
    }
    if (c.review !== undefined) {
      const r = normReview(c.review);
      if (r !== c.review) {
        if (r) c.review = r;
        else delete c.review;
        ch = true;
      }
    }
    if (c.comments !== undefined) {
      const cs = normList(c.comments, normComment);
      if (cs.changed) {
        c.comments = cs.list;
        ch = true;
      }
    }
    return ch;
  }) as unknown as A3Project;
}

/** Valida una lista de A3: descarta lo que no son A3 y repara el resto */
export function normalizeProjects(list: unknown[]): { projects: A3Project[]; repaired: number; discarded: number } {
  let repaired = 0;
  let discarded = 0;
  const projects: A3Project[] = [];
  list.forEach((x, i) => {
    const p = normalizeProject(x, i);
    if (!p) discarded++;
    else {
      if (p !== x) repaired++;
      projects.push(p);
    }
  });
  // Ids repetidos (copias mal hechas): el segundo recibe otro id
  const seen = new Set<string>();
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    if (seen.has(p.id)) {
      projects[i] = { ...p, id: stableId(`${p.id}-dup${i}`, p) };
      repaired++;
    }
    seen.add(projects[i].id);
  }
  return { projects, repaired, discarded };
}
