// Operaciones puras sobre el Ishikawa (sin React): cada una devuelve datos nuevos.
import type { IshikawaCategory, IshikawaCause, IshikawaData } from '../../types/lean';

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const mapCategory = (
  data: IshikawaData,
  catId: string,
  fn: (c: IshikawaCategory) => IshikawaCategory
): IshikawaData => ({
  ...data,
  categories: data.categories.map((c) => (c.id === catId ? fn(c) : c)),
});

const mapCause = (
  data: IshikawaData,
  catId: string,
  causeId: string,
  fn: (c: IshikawaCause) => IshikawaCause
): IshikawaData =>
  mapCategory(data, catId, (cat) => ({ ...cat, causes: cat.causes.map((c) => (c.id === causeId ? fn(c) : c)) }));

const mapSubcause = (
  data: IshikawaData,
  catId: string,
  causeId: string,
  subId: string,
  fn: (c: IshikawaCause) => IshikawaCause
): IshikawaData =>
  mapCause(data, catId, causeId, (c) => ({
    ...c,
    subcauses: (c.subcauses || []).map((s) => (s.id === subId ? fn(s) : s)),
  }));

export const setProblemHead = (data: IshikawaData, problemHead: string): IshikawaData => ({ ...data, problemHead });

export function addCategory(data: IshikawaData): { data: IshikawaData; id: string } {
  const id = newId('cat');
  return {
    id,
    data: {
      ...data,
      categories: [...data.categories, { id, name: `Categoría ${data.categories.length + 1}`, causes: [] }],
    },
  };
}

export const renameCategory = (data: IshikawaData, catId: string, name: string) =>
  mapCategory(data, catId, (c) => ({ ...c, name }));

export const deleteCategory = (data: IshikawaData, catId: string): IshikawaData => ({
  ...data,
  categories: data.categories.filter((c) => c.id !== catId),
});

export function addCause(data: IshikawaData, catId: string): { data: IshikawaData; id: string } {
  const id = newId('cause');
  return {
    id,
    data: mapCategory(data, catId, (cat) => ({
      ...cat,
      causes: [...cat.causes, { id, text: '', isRootCause: false, subcauses: [] }],
    })),
  };
}

export const setCauseText = (data: IshikawaData, catId: string, causeId: string, text: string) =>
  mapCause(data, catId, causeId, (c) => ({ ...c, text }));

export const toggleCauseRoot = (data: IshikawaData, catId: string, causeId: string) =>
  mapCause(data, catId, causeId, (c) => ({ ...c, isRootCause: !c.isRootCause }));

export const deleteCause = (data: IshikawaData, catId: string, causeId: string) =>
  mapCategory(data, catId, (cat) => ({ ...cat, causes: cat.causes.filter((c) => c.id !== causeId) }));

export function addSubcause(data: IshikawaData, catId: string, causeId: string): { data: IshikawaData; id: string } {
  const id = newId('subcause');
  return {
    id,
    data: mapCause(data, catId, causeId, (c) => ({
      ...c,
      subcauses: [...(c.subcauses || []), { id, text: '', isRootCause: false }],
    })),
  };
}

export const setSubcauseText = (data: IshikawaData, catId: string, causeId: string, subId: string, text: string) =>
  mapSubcause(data, catId, causeId, subId, (s) => ({ ...s, text }));

export const toggleSubcauseRoot = (data: IshikawaData, catId: string, causeId: string, subId: string) =>
  mapSubcause(data, catId, causeId, subId, (s) => ({ ...s, isRootCause: !s.isRootCause }));

export const deleteSubcause = (data: IshikawaData, catId: string, causeId: string, subId: string) =>
  mapCause(data, catId, causeId, (c) => ({ ...c, subcauses: (c.subcauses || []).filter((s) => s.id !== subId) }));
