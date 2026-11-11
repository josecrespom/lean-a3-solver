// Comparación de versiones "mayor.menor.parche" (p. ej. 1.3.1 < 1.10.0).
export function compareVersions(a?: string, b?: string): number {
  const pa = (a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = (b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
