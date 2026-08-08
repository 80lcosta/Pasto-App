/**
 * Cliente de la API: sesión, lectura de datos y escritura de recomendaciones.
 * El token vive en localStorage del navegador del técnico/cliente.
 */
import type { Campo, Evento, Medicion, Recomendacion, Auditoria, Usuario } from './tipos.js';
import {
  agregarRecomendacionDemo,
  auditoriaDemo,
  cargarDatosDemo,
  guardarTargetsDemo,
  importarPotrerosDemo,
  USUARIO_DEMO,
} from './demo.js';

export const URL_SERVIDOR =
  (import.meta.env['VITE_URL_SERVIDOR'] as string | undefined) ?? 'http://localhost:8787';

const CLAVE_TOKEN = 'pasto.token';
const CLAVE_USUARIO = 'pasto.usuario';
const CLAVE_DEMO = 'pasto.demo';

/**
 * Compilación de solo demostración: la página se publica sola, sin servidor
 * ni cuenta. Se usa para la versión que se comparte por enlace.
 */
export const SOLO_DEMO = import.meta.env['VITE_SOLO_DEMO'] === '1';

/** El almacenamiento puede estar bloqueado (páginas embebidas): no debe romper. */
function guardado(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function guardar(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: la sesión dura lo que dura la pestaña */
  }
}
function borrar(clave: string): void {
  try {
    localStorage.removeItem(clave);
  } catch {
    /* nada que borrar */
  }
}

/**
 * En modo demostración todo ocurre dentro del navegador: no hay servidor ni
 * base de datos. Sirve para mostrar la herramienta sin pagar hosting.
 */
export const enModoDemo = (): boolean => SOLO_DEMO || guardado(CLAVE_DEMO) === 'si';

export function entrarEnModoDemo(): Usuario {
  guardar(CLAVE_DEMO, 'si');
  guardar(CLAVE_USUARIO, JSON.stringify(USUARIO_DEMO));
  return USUARIO_DEMO;
}

export const tokenGuardado = (): string => guardado(CLAVE_TOKEN) ?? '';

export const usuarioGuardado = (): Usuario | null => {
  if (SOLO_DEMO) return USUARIO_DEMO;
  const crudo = guardado(CLAVE_USUARIO);
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
  guardar(CLAVE_TOKEN, sesion.token);
  guardar(CLAVE_USUARIO, JSON.stringify(sesion.usuario));
  return sesion.usuario;
}

export async function salir(): Promise<void> {
  if (enModoDemo()) {
    borrar(CLAVE_DEMO);
    borrar(CLAVE_USUARIO);
    return;
  }
  await fetch(`${URL_SERVIDOR}/api/salir`, {
    method: 'POST',
    headers: { authorization: `Bearer ${tokenGuardado()}` },
  }).catch(() => undefined);
  borrar(CLAVE_TOKEN);
  borrar(CLAVE_USUARIO);
}

export interface DatosDashboard {
  campo: Campo;
  mediciones: Medicion[];
  eventos: Evento[];
  recomendaciones: Recomendacion[];
}

export async function cargarDatos(): Promise<DatosDashboard> {
  if (enModoDemo()) return cargarDatosDemo();
  const [campo, mediciones, eventos, recomendaciones] = await Promise.all([
    traer<Campo>('/api/campo'),
    traer<Medicion[]>('/api/mediciones'),
    traer<Evento[]>('/api/eventos'),
    traer<Recomendacion[]>('/api/recomendaciones'),
  ]);
  return { campo, mediciones, eventos, recomendaciones };
}

export async function cargarAuditoria(): Promise<Auditoria[]> {
  if (enModoDemo()) return auditoriaDemo();
  return traer<Auditoria[]>('/api/auditoria');
}

export async function publicarRecomendacion(
  r: Recomendacion,
  campoId: string,
): Promise<boolean> {
  if (enModoDemo()) {
    agregarRecomendacionDemo(r);
    return true;
  }
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
  if (enModoDemo()) {
    guardarTargetsDemo(targets as unknown as Campo['targets']);
    return { ok: true };
  }
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
  if (enModoDemo()) {
    return { ok: true, ...importarPotrerosDemo(potreros as Parameters<typeof importarPotrerosDemo>[0]) };
  }
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
