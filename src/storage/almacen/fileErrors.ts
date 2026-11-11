// Traduce un error del archivo del almacén a estado y mensaje para la interfaz.
import { DamagedFileError, OutdatedAppError, VerifyError } from '../fileStore';
import { AlmacenStatus } from '../almacenShared';

export interface FileErrorInfo {
  status: Extract<AlmacenStatus, 'damaged' | 'outdated' | 'error'>;
  message: string;
  /** La escritura propia no quedó bien: el archivo puede estar a medias por nuestra culpa */
  brokenOwnWrite?: boolean;
}

export function describeFileError(e: unknown): FileErrorInfo {
  if (e instanceof DamagedFileError) return { status: 'damaged', message: `${e.message} No se ha tocado.` };
  if (e instanceof OutdatedAppError) return { status: 'outdated', message: e.message };
  if (e instanceof VerifyError)
    return {
      status: 'error',
      message: 'El archivo no ha quedado bien guardado (se ha comprobado releyéndolo).',
      brokenOwnWrite: true,
    };
  const name = (e as { name?: string } | null)?.name;
  return {
    status: 'error',
    message:
      name === 'NotAllowedError'
        ? 'Se ha perdido el permiso para escribir en el archivo.'
        : name === 'NotFoundError'
          ? 'No se encuentra el archivo (¿se ha movido, borrado o la unidad de red no está disponible?).'
          : 'No se ha podido guardar en el archivo.',
  };
}
