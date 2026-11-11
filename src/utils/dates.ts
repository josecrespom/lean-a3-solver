// Fechas de modificación en hora LOCAL ("YYYY-MM-DD HH:MM").
// (Antes se guardaban en UTC: una hora menos que en España.)

const pad = (n: number) => String(n).padStart(2, '0');

export function localStamp(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "hoy 14:32", "ayer 09:10" o "08/11/2026" */
export function describeStamp(stamp?: string): string {
  if (!stamp) return '';
  // También acepta fechas ISO completas ("2026-11-09T16:32:29.682Z"), que se pasan a hora local
  if (stamp.includes('T')) {
    const d = new Date(stamp);
    if (!Number.isNaN(d.getTime())) stamp = localStamp(d);
  }
  const [day, time = ''] = stamp.split(' ');
  const today = localDate();
  const yesterday = localDate(new Date(Date.now() - 86_400_000));
  if (day === today) return `hoy ${time}`.trim();
  if (day === yesterday) return `ayer ${time}`.trim();
  const [y, m, d] = day.split('-');
  return y && m && d ? `${d}/${m}/${y}` : stamp;
}

/** "2026-11-04" → "04/11/2026" (deja tal cual lo que no sea una fecha ISO) */
export function formatDate(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
