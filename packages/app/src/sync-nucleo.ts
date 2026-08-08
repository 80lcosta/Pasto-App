/**
 * Lógica pura de la sincronización (testeable sin navegador ni IndexedDB).
 * Contrato con el servidor:
 *   POST {base}/api/sync  { usuario, dispositivo, mediciones, eventos }
 *   →  { aceptadas: string[] }   (ids de registros persistidos; idempotente)
 */
import type { EventoLocal, MedicionLocal } from './db.js';

export interface PaqueteSync {
  usuario: string;
  dispositivo: string;
  mediciones: MedicionLocal[];
  eventos: EventoLocal[];
}

export interface RespuestaSync {
  aceptadas: string[];
}

export function armarPaqueteSync(
  mediciones: MedicionLocal[],
  eventos: EventoLocal[],
  usuario: string,
  dispositivo: string,
): PaqueteSync {
  return {
    usuario,
    dispositivo,
    mediciones: mediciones.filter((m) => m.estadoSync === 'pendiente'),
    eventos: eventos.filter((e) => e.estadoSync === 'pendiente'),
  };
}

export function hayAlgoParaSincronizar(p: PaqueteSync): boolean {
  return p.mediciones.length > 0 || p.eventos.length > 0;
}

/** Ids locales que el servidor confirmó y hay que marcar como enviados. */
export function idsConfirmados(paquete: PaqueteSync, respuesta: RespuestaSync): {
  mediciones: string[];
  eventos: string[];
} {
  const ok = new Set(respuesta.aceptadas);
  return {
    mediciones: paquete.mediciones.filter((m) => ok.has(m.id)).map((m) => m.id),
    eventos: paquete.eventos.filter((e) => ok.has(e.id)).map((e) => e.id),
  };
}
