// Descarga de archivos generados por la app (copias, CSV, HTML imprimible).
// - En el navegador (el .html abierto normalmente): enlace de descarga clásico.
// - Publicada como artefacto de Claude (p. ej. en el móvil): el visor bloquea los
//   enlaces de descarga, así que se usa su capacidad `downloads`; quien la ve
//   confirma el guardado y puede rechazarlo.

interface DownloadsApi {
  save(request: { filename: string; data: string | Blob }): Promise<unknown>;
}
interface ClaudeHost {
  use?: (name: string) => Promise<unknown>;
}

let downloadsApi: Promise<DownloadsApi | null> | null = null;
const artifactDownloads = (): Promise<DownloadsApi | null> => {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (!host?.use) return Promise.resolve(null);
  downloadsApi ??= host
    .use('downloads')
    .then((api) => (api as DownloadsApi | null) ?? null)
    .catch(() => null);
  return downloadsApi;
};

function anchorDownload(filename: string, data: string, mime: string) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Ofrece `data` como archivo. Devuelve true si se ha guardado (o entregado al
 * navegador) y false si quien lo ve lo ha rechazado o no se puede guardar aquí.
 */
export async function saveFile(filename: string, data: string, mime: string): Promise<boolean> {
  const api = await artifactDownloads();
  if (!api) {
    anchorDownload(filename, data, mime);
    return true;
  }
  try {
    await api.save({ filename, data });
    return true;
  } catch (e) {
    console.warn('Descarga no realizada', (e as { code?: string })?.code ?? e);
    return false;
  }
}
