/**
 * Autenticación, sesiones y permisos por rol.
 *
 * Las claves se guardan con scrypt (sal por usuario) y los tokens de sesión
 * se guardan hasheados: si alguien lee la base, no puede hacerse pasar por
 * un usuario con lo que encuentre ahí.
 */
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { consultar, unaFila } from './db.mjs';

const scryptAsync = promisify(scrypt);
const DIAS_SESION = 30;

export async function hashearClave(clave) {
  const sal = randomBytes(16);
  const derivada = await scryptAsync(clave, sal, 64);
  return `scrypt:${sal.toString('hex')}:${derivada.toString('hex')}`;
}

export async function verificarClave(clave, guardada) {
  const [algoritmo, salHex, esperadoHex] = String(guardada).split(':');
  if (algoritmo !== 'scrypt' || !salHex || !esperadoHex) return false;
  const derivada = await scryptAsync(clave, Buffer.from(salHex, 'hex'), 64);
  const esperado = Buffer.from(esperadoHex, 'hex');
  return derivada.length === esperado.length && timingSafeEqual(derivada, esperado);
}

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

/** Valida usuario y clave; devuelve el token de sesión y sus campos. */
export async function iniciarSesion(email, clave) {
  const usuario = await unaFila(
    'select id, email, nombre, rol, clave_hash, activo from usuario where lower(email) = lower($1)',
    [email ?? ''],
  );
  if (!usuario || !usuario.activo) return null;
  if (!(await verificarClave(clave ?? '', usuario.clave_hash))) return null;

  const token = randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + DIAS_SESION * 24 * 60 * 60 * 1000);
  await consultar(
    'insert into sesion (token_hash, usuario_id, expira_en) values ($1, $2, $3)',
    [hashToken(token), usuario.id, expira],
  );
  return { token, usuario: recortar(usuario), campos: await camposDe(usuario.id) };
}

export async function cerrarSesion(token) {
  if (!token) return;
  await consultar('delete from sesion where token_hash = $1', [hashToken(token)]);
}

/** Devuelve el usuario de una sesión vigente, o null. */
export async function usuarioDeToken(token) {
  if (!token) return null;
  const fila = await unaFila(
    `select u.id, u.email, u.nombre, u.rol, u.activo
       from sesion s join usuario u on u.id = s.usuario_id
      where s.token_hash = $1 and s.expira_en > now()`,
    [hashToken(token)],
  );
  if (!fila || !fila.activo) return null;
  return recortar(fila);
}

export async function camposDe(usuarioId) {
  return consultar(
    `select c.id, c.nombre from campo c
       join acceso a on a.campo_id = c.id
      where a.usuario_id = $1
      order by c.nombre`,
    [usuarioId],
  );
}

export async function tieneAccesoAlCampo(usuarioId, campoId) {
  const fila = await unaFila(
    'select 1 as ok from acceso where usuario_id = $1 and campo_id = $2',
    [usuarioId, campoId],
  );
  return fila !== null;
}

const recortar = (u) => ({ id: u.id, email: u.email, nombre: u.nombre, rol: u.rol });

/**
 * Permisos por rol. El cliente es de solo lectura: lleva la trazabilidad del
 * proceso pero no carga ni modifica datos.
 */
export const PERMISOS = {
  medidor: ['leer:campo', 'escribir:mediciones'],
  tecnico: [
    'leer:campo',
    'leer:datos',
    'leer:auditoria',
    'escribir:mediciones',
    'escribir:recomendaciones',
  ],
  cliente: ['leer:campo', 'leer:datos', 'leer:auditoria'],
};

export function puede(rol, permiso) {
  return (PERMISOS[rol] ?? []).includes(permiso);
}

/** Registra una operación en la auditoría. */
export async function auditar({ usuario, accion, entidad, entidadId, campoId, detalle }) {
  await consultar(
    `insert into auditoria (usuario_id, usuario_nombre, rol, accion, entidad, entidad_id, campo_id, detalle)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      usuario?.id ?? null,
      usuario?.nombre ?? null,
      usuario?.rol ?? null,
      accion,
      entidad ?? null,
      entidadId ?? null,
      campoId ?? null,
      detalle ? JSON.stringify(detalle) : null,
    ],
  );
}
