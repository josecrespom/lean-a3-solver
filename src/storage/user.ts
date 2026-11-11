// Nombre de la persona que usa la app en este equipo (para registrar quién
// crea y modifica cada A3). Se guarda solo en este navegador.
const KEY = 'cms_a3_usuario';

export function getUserName(): string {
  try {
    return localStorage.getItem(KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function saveUserName(name: string) {
  try {
    if (name.trim()) localStorage.setItem(KEY, name.trim());
    else localStorage.removeItem(KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}
