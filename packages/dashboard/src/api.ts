/**
 * Cliente de la API: sesión, lectura de datos y escritura de recomendaciones.
 * El token vive en localStorage del navegador del técnico/cliente.
 */
import type { Campo, Evento, Medicion, Recomendacion, Auditoria, Usuario } from './tipos.js';

export const URL_SERVIDOR =
  (import.meta.env['VITE_URL_SERVIDOR'] as string | undefined) ?? 'http://localhost:8787';

const CLAVE_TOKEN = 'pasto.token';
const CLAVE_USUARIO = 'pasto.usuario';

export const tokenGuardado = (): string => localStorage.getItem(CLAVE_TOKEN) ?? '';

export const usuarioGuardado = (): Usuario | null => {
  const crudo = localStorage.getItem(CLAVE_USUARIO);
  return crudo ? (JSON.parse(crudo) as Usuario) : null;
};

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    readonly estado: number,
  ) {
    super(mensaje);
  }
}

async function traer<T>(ruta: string): Promise<T> {
  const resp = await fetch(`${URL_SERVIDOR}${ruta}`, {
    headers: { authorization: `Bearer ${tokenGuardado()}` },
  });
  if (!resp.ok) {
    const datos = (await resp.json().catch(() => ({}))) as { error?: string };
    throw new ErrorApi(datos.error ?? `Error ${resp.status}`, resp.status);
  }
  return (await resp.json()) as T;
}

export interface Sesion {
  token: string;
  usuario: Usuario;
  campos: { id: string; nombre: string }[];
}

export async function ingresar(email: string, clave: string): Promise<Usuario> {
  const resp = await fetch(`${URL_SERVIDOR}/api/sesion`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, clave }),
  });
  if (!resp.ok) {
    const datos = (await resp.json().catch(() => ({}))) as { error?: string };
    throw new ErrorApi(datos.error ?? 'No se pudo ingresar', resp.status);
  }
  const sesion = (await resp.json()) as Sesion;
  localStorage.setItem(CLAVE_TOKEN, sesion.token);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(sesion.usuario));
  return sesion.usuario;
}

export async function salir(): Promise<void> {
  await fetch(`${URL_SERVIDOR}/api/salir`, {
    method: 'POST',
    headers: { authorization: `Bearer ${tokenGuardado()}` },
  }).catch(() => undefined);
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
}

export interface DatosDashboard {
  campo: Campo;
  mediciones: Medicion[];
  eventos: Evento[];
  recomendaciones: Recomendacion[];
}

export async function cargarDatos(): Promise<DatosDashboard> {
  const [campo, mediciones, eventos, recomendaciones] = await Promise.all([
    traer<Campo>('/api/campo'),
    traer<Medicion[]>('/api/mediciones'),
    traer<Evento[]>('/api/eventos'),
    traer<Recomendacion[]>('/api/recomendaciones'),
  ]);
  return { campo, mediciones, eventos, recomendaciones };
}

export async function cargarAuditoria(): Promise<Auditoria[]> {
  return traer<Auditoria[]>('/api/auditoria');
}

export async function publicarRecomendacion(
  r: Recomendacion,
  campoId: string,
): Promise<boolean> {
  try {
    const resp = await fetch(`${URL_SERVIDOR}/api/recomendaciones`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenGuardado()}` },
      body: JSON.stringify({ ...r, campoId }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export interface RespuestaGuardado {
  ok: boolean;
  error?: string;
}

/** Ajuste de los objetivos del campo (solo técnico). */
export async function guardarTargets(
  campoId: string,
  targets: Record<string, unknown>,
): Promise<RespuestaGuardado> {
  try {
    const resp = await fetch(`${URL_SERVIDOR}/api/targets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenGuardado()}` },
      body: JSON.stringify({ campoId, targets }),
    });
    if (resp.ok) return { ok: true };
    const datos = (await resp.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: datos.error ?? `Error ${resp.status}` };
  } catch {
    return { ok: false, error: 'No se pudo contactar al servidor' };
  }
}

export interface ResultadoImportacion extends RespuestaGuardado {
  creados?: string[];
  actualizados?: string[];
  omitidos?: string[];
}

/** Carga de los límites de los potreros leídos de un KML (solo técnico). */
export async function importarPotreros(
  campoId: string,
  potreros: unknown[],
): Promise<ResultadoImportacion> {
  try {
    const resp = await fetch(`${URL_SERVIDOR}/api/potreros/importar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenGuardado()}` },
      body: JSON.stringify({ campoId, potreros }),
    });
    const datos = (await resp.json().catch(() => ({}))) as ResultadoImportacion & { error?: string };
    return resp.ok ? { ...datos, ok: true } : { ok: false, error: datos.error ?? `Error ${resp.status}` };
  } catch {
    return { ok: false, error: 'No se pudo contactar al servidor' };
  }
}
