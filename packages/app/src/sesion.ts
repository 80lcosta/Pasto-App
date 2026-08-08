/**
 * Sesión del medidor. El token se guarda en el equipo: se ingresa una vez
 * (con señal) y después la app sigue funcionando a campo sin conexión.
 */
import { db, escribirMeta, leerMeta } from './db.js';
import type { PotreroLocal, PuntoLocal, RecursoLocal, RodeoLocal } from './db.js';
import * as demo from './campo-demo.js';

export const URL_SERVIDOR_DEFAULT = 'http://localhost:8787';

/**
 * Compilación de solo demostración: la app se abre sin cuenta ni servidor.
 * Se usa para la versión que se comparte por enlace.
 */
export const SOLO_DEMO = import.meta.env['VITE_SOLO_DEMO'] === '1';

export interface Usuario {
  id: string;
  nombre: string;
  rol: 'medidor' | 'tecnico' | 'cliente';
}

export async function urlServidor(): Promise<string> {
  return leerMeta('urlServidor', URL_SERVIDOR_DEFAULT);
}

export async function tokenGuardado(): Promise<string> {
  return leerMeta('token', '');
}

/**
 * Modo demostración: el campo Loma Alta se carga en el teléfono y la app
 * funciona entera, sin servidor. Sirve para mostrarla sin pagar hosting; lo
 * que se mida queda solo en el equipo y no se sincroniza con nadie.
 */
export async function enModoDemo(): Promise<boolean> {
  return SOLO_DEMO || (await leerMeta('modoDemo', '')) === 'si';
}

export async function entrarEnModoDemo(): Promise<void> {
  const { campo, potreros, recursos, puntos, rodeo } = demo;
  await db.transaction('rw', [db.recursos, db.potreros, db.puntos, db.rodeos, db.meta], async () => {
    await db.recursos.bulkPut(recursos);
    await db.potreros.bulkPut(potreros);
    await db.puntos.bulkPut(puntos);
    await db.rodeos.put(rodeo);
    await db.meta.put({ clave: 'campo', valor: campo });
    await db.meta.put({ clave: 'modoDemo', valor: 'si' });
    await db.meta.put({ clave: 'usuario', valor: 'Demostración' });
  });
}

export async function usuarioGuardado(): Promise<Usuario | null> {
  const crudo = await leerMeta('usuarioSesion', '');
  return crudo ? (JSON.parse(crudo) as Usuario) : null;
}

export interface ResultadoIngreso {
  ok: boolean;
  error?: string;
}

/** Ingresa, guarda el token y descarga el campo para poder trabajar offline. */
export async function ingresar(email: string, clave: string): Promise<ResultadoIngreso> {
  const base = await urlServidor();
  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}/api/sesion`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, clave }),
    });
  } catch {
    return { ok: false, error: 'No se pudo contactar al servidor. ¿Hay señal?' };
  }
  if (!respuesta.ok) {
    const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: datos.error ?? 'No se pudo ingresar' };
  }

  const datos = (await respuesta.json()) as {
    token: string;
    usuario: Usuario;
    campos: { id: string; nombre: string }[];
  };
  if (datos.usuario.rol !== 'medidor' && datos.usuario.rol !== 'tecnico') {
    return { ok: false, error: 'Este usuario no carga mediciones a campo' };
  }

  await escribirMeta('token', datos.token);
  await escribirMeta('usuarioSesion', JSON.stringify(datos.usuario));
  await escribirMeta('usuario', datos.usuario.nombre);
  const campoId = datos.campos[0]?.id ?? '';
  await escribirMeta('campoId', campoId);

  const bajado = await descargarCampo(base, datos.token, campoId);
  if (!bajado) return { ok: false, error: 'Ingresaste, pero no se pudo descargar el campo' };
  return { ok: true };
}

export async function salir(): Promise<void> {
  if (await enModoDemo()) {
    await escribirMeta('modoDemo', '');
    await db.delete();
    return;
  }
  const [base, token] = await Promise.all([urlServidor(), tokenGuardado()]);
  if (token) {
    await fetch(`${base}/api/salir`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
  await escribirMeta('token', '');
  await escribirMeta('usuarioSesion', '');
}

interface RespuestaCampo {
  campoId: string;
  campo: string;
  recursos: RecursoLocal[];
  potreros: PotreroLocal[];
  puntos: PuntoLocal[];
  rodeo: RodeoLocal | null;
}

/** Descarga el campo y lo guarda para trabajar sin señal. */
export async function descargarCampo(
  base: string,
  token: string,
  campoId: string,
): Promise<boolean> {
  try {
    const resp = await fetch(`${base}/api/campo?campo=${encodeURIComponent(campoId)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return false;
    const datos = (await resp.json()) as RespuestaCampo;
    await db.transaction('rw', [db.recursos, db.potreros, db.puntos, db.rodeos, db.meta], async () => {
      await db.recursos.bulkPut(datos.recursos);
      await db.potreros.bulkPut(datos.potreros);
      await db.puntos.bulkPut(datos.puntos);
      if (datos.rodeo) await db.rodeos.put(datos.rodeo);
      await db.meta.put({ clave: 'campo', valor: datos.campo });
      await db.meta.put({ clave: 'campoId', valor: datos.campoId });
    });
    return true;
  } catch {
    return false;
  }
}
