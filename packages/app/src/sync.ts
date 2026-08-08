/**
 * Cola de sincronización: junta lo pendiente de IndexedDB, lo manda al
 * servidor cuando hay señal y marca lo confirmado como enviado.
 */
import { db, escribirMeta, leerMeta } from './db.js';
import { armarPaqueteSync, hayAlgoParaSincronizar, idsConfirmados, type RespuestaSync } from './sync-nucleo.js';

export const URL_SERVIDOR_DEFAULT = 'http://localhost:8787';

export interface ResultadoSync {
  enviadas: number;
  pendientes: number;
  error?: string;
}

export async function contarPendientes(): Promise<number> {
  const [m, e] = await Promise.all([
    db.mediciones.where('estadoSync').equals('pendiente').count(),
    db.eventos.where('estadoSync').equals('pendiente').count(),
  ]);
  return m + e;
}

export async function sincronizar(): Promise<ResultadoSync> {
  const [medPend, evPend, usuario, urlBase] = await Promise.all([
    db.mediciones.where('estadoSync').equals('pendiente').toArray(),
    db.eventos.where('estadoSync').equals('pendiente').toArray(),
    leerMeta('usuario', 'medidor'),
    leerMeta('urlServidor', URL_SERVIDOR_DEFAULT),
  ]);
  const paquete = armarPaqueteSync(medPend, evPend, usuario, navigator.userAgent);
  if (!hayAlgoParaSincronizar(paquete)) {
    return { enviadas: 0, pendientes: 0 };
  }
  if (!navigator.onLine) {
    return { enviadas: 0, pendientes: paquete.mediciones.length + paquete.eventos.length, error: 'Sin señal' };
  }
  try {
    const resp = await fetch(`${urlBase}/api/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(paquete),
    });
    if (!resp.ok) throw new Error(`Servidor respondió ${resp.status}`);
    const datos = (await resp.json()) as RespuestaSync;
    const ok = idsConfirmados(paquete, datos);
    await db.transaction('rw', [db.mediciones, db.eventos], async () => {
      if (ok.mediciones.length) await db.mediciones.where('id').anyOf(ok.mediciones).modify({ estadoSync: 'enviado' });
      if (ok.eventos.length) await db.eventos.where('id').anyOf(ok.eventos).modify({ estadoSync: 'enviado' });
    });
    await escribirMeta('ultimaSync', new Date().toISOString());
    const enviadas = ok.mediciones.length + ok.eventos.length;
    return { enviadas, pendientes: await contarPendientes() };
  } catch (e) {
    return {
      enviadas: 0,
      pendientes: paquete.mediciones.length + paquete.eventos.length,
      error: e instanceof Error ? e.message : 'Error de red',
    };
  }
}

/** Sincronización automática: al volver la señal y cada 45 segundos. */
export function iniciarSyncAutomatica(alTerminar?: (r: ResultadoSync) => void): () => void {
  const correr = () => {
    void sincronizar().then((r) => alTerminar?.(r));
  };
  window.addEventListener('online', correr);
  const intervalo = window.setInterval(correr, 45_000);
  return () => {
    window.removeEventListener('online', correr);
    window.clearInterval(intervalo);
  };
}
