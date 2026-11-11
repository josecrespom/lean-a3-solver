// Textos y opciones de las preguntas que hace el almacén ante un conflicto.
// Son funciones puras: el hook decide cuándo mostrarlas y qué hace `commit`.
import { A3Project } from '../types/lean';
import { MergeConflict, resolveConflicts } from './merge';
import { AlmacenConflict, describeFields } from './almacenShared';

/** Deja `list` en la app y en el archivo (ver `commit` en useAlmacenArchivo) */
export type Commit = (
  list: A3Project[],
  fileContent: A3Project[],
  fileLm: number,
  fromOthers: number,
  hard?: boolean
) => Promise<void>;

/** Los dos han cambiado el mismo apartado de uno o varios A3 */
export const perA3Dialog = (
  merged: A3Project[],
  conflicts: MergeConflict[],
  fileContent: A3Project[],
  fileLm: number,
  fromOthers: number,
  commit: Commit
): AlmacenConflict => ({
  title:
    conflicts.length === 1
      ? 'Otra persona ha cambiado lo mismo que tú en un A3'
      : `Otra persona ha cambiado lo mismo que tú en ${conflicts.length} A3`,
  message:
    'El resto de cambios (y los comentarios de revisión) se han fusionado sin problemas. En estos A3 los dos habéis cambiado el mismo apartado; elige qué versión conservar:',
  items: conflicts.map((c) => `${c.title || '(sin título)'} — ${describeFields(c.fields)}`),
  options: [
    {
      label: 'Quedarme con mis cambios',
      primary: true,
      action: () => commit(resolveConflicts(merged, conflicts, 'mine'), fileContent, fileLm, fromOthers),
    },
    {
      label: 'Usar los cambios de la otra persona',
      description: 'Se descartan tus cambios en estos A3.',
      action: () => commit(resolveConflicts(merged, conflicts, 'theirs'), fileContent, fileLm, fromOthers, true),
    },
  ],
});

/** A3 que estaban en el almacén y han desaparecido del archivo sin pasar por la papelera */
export const missingDialog = (
  merged: A3Project[],
  conflicts: MergeConflict[],
  missing: A3Project[],
  getLocal: () => A3Project[],
  fileContent: A3Project[],
  fileLm: number,
  fromOthers: number,
  commit: Commit
): AlmacenConflict => {
  const keep = () => {
    const ids = new Set(merged.map((p) => p.id));
    const restored = getLocal().filter((p) => missing.some((m) => m.id === p.id) && !ids.has(p.id));
    return resolveConflicts([...restored, ...merged], conflicts, 'mine');
  };
  return {
    title: `Faltan ${missing.length} A3 en el archivo del almacén`,
    message:
      'Estos A3 estaban en el almacén, no se habían enviado a la papelera y ya no aparecen en el archivo. Puede que alguien haya guardado una copia antigua encima o que el archivo se haya estropeado.',
    items: missing.map((p) => p.title || '(sin título)'),
    options: [
      {
        label: 'Conservarlos (volver a guardarlos en el archivo)',
        primary: true,
        action: () => commit(keep(), fileContent, fileLm, fromOthers),
      },
      {
        label: 'Aceptar que ya no están',
        description: 'Desaparecen también de este navegador (quedan en las copias de seguridad).',
        action: () => commit(resolveConflicts(merged, conflicts, 'mine'), fileContent, fileLm, fromOthers),
      },
    ],
  };
};

/** Sin versión de referencia conocida: elegir el archivo entero */
export const wholeFileDialog = (
  fileName: string | undefined,
  fileContent: A3Project[],
  fileLm: number,
  getLocal: () => A3Project[],
  commit: Commit
): AlmacenConflict => ({
  title: 'El archivo y este navegador tienen versiones distintas',
  message: `No se puede saber qué ha cambiado cada uno en "${fileName}". ¿Qué versión quieres conservar?`,
  options: [
    {
      label: 'Usar la versión del archivo',
      primary: true,
      action: () => commit(fileContent, fileContent, fileLm, fileContent.length, true),
    },
    {
      label: 'Guardar la de este navegador en el archivo',
      description: 'Sobrescribe el archivo.',
      action: () => commit(getLocal(), fileContent, fileLm, 0),
    },
  ],
});

/** Al abrir otro almacén, este navegador tiene A3 que no están en él */
export const onlyLocalDialog = (
  fileName: string,
  onlyLocal: A3Project[],
  fileProjects: A3Project[],
  fileLm: number,
  commit: Commit
): AlmacenConflict => ({
  title: `Este navegador tiene ${onlyLocal.length} A3 que no están en el archivo`,
  message: `"${fileName}" contiene ${fileProjects.length} A3. ¿Quieres añadirle los de este navegador o quedarte solo con los del archivo?`,
  options: [
    {
      label: 'Combinar (añadirlos al archivo)',
      primary: true,
      action: () => commit([...onlyLocal, ...fileProjects], fileProjects, fileLm, 0),
    },
    {
      label: 'Usar solo los del archivo',
      action: () => commit(fileProjects, fileProjects, fileLm, fileProjects.length, true),
    },
  ],
});
