/**
 * API del Proyecto Pasto.
 *
 *   POST /api/sesion            {email, clave} → {token, usuario, campos}
 *   POST /api/salir             cierra la sesión
 *   GET  /api/campo?campo=id    configuración del campo (potreros, recursos, rodeo, targets)
 *   POST /api/sync              {campoId, mediciones[], eventos[]} → {aceptadas:[ids]}
 *   GET  /api/mediciones?campo=id
 *   GET  /api/eventos?campo=id
 *   GET  /api/recomendaciones?campo=id
 *   POST /api/recomendaciones   {campoId, id, fechaHora, autor, texto, datos}
 *   GET  /api/auditoria?campo=id
 *
 * Todas las rutas salvo /api/sesion piden `Authorization: Bearer <token>`, y
 * cada una verifica el permiso del rol y el acceso al campo pedido.
 */
import { createServer } from 'node:http';
import { auditar, camposDe, cerrarSesion, iniciarSesion, puede, tieneAccesoAlCampo, usuarioDeToken } from './auth.mjs';
import { consultar, enTransaccion } from './db.mjs';

const PUERTO = Number(process.env.PUERTO ?? 8787);

function responder(res, codigo, cuerpo) {
  res.writeHead(codigo, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
  });
  res.end(JSON.stringify(cuerpo));
}

function leerCuerpo(req) {
  return new Promise((resolver, rechazar) => {
    let datos = '';
    req.on('data', (trozo) => {
      datos += trozo;
      if (datos.length > 5_000_000) rechazar(new Error('Cuerpo demasiado grande'));
    });
    req.on('end', () => {
      if (!datos) return resolver({});
      try {
        resolver(JSON.parse(datos));
      } catch {
        rechazar(new Error('JSON inválido'));
      }
    });
    req.on('error', rechazar);
  });
}

const tokenDe = (req) => (req.headers.authorization ?? '').replace(/^Bearer /i, '') || null;

/** Trae el campo completo tal como lo consumen la app y el tablero. */
async function traerCampo(campoId) {
  const [campo] = await consultar('select id, nombre, targets from campo where id = $1', [campoId]);
  if (!campo) return null;
  const [recursos, potreros, puntos, rodeos] = await Promise.all([
    consultar('select id, nombre, curva, nota_curva from recurso where campo_id = $1', [campoId]),
    consultar(
      `select id, orden, nombre, superficie_ha, sup_ganadera_ha, recurso_id, descripcion, geometria
         from potrero where campo_id = $1 order by orden`,
      [campoId],
    ),
    consultar(
      `select p.id, p.potrero_id, p.nombre, p.orden, p.activo, p.lat, p.lon
         from punto p join potrero t on t.id = p.potrero_id
        where t.campo_id = $1 order by t.orden, p.orden`,
      [campoId],
    ),
    consultar('select id, nombre, categorias from rodeo where campo_id = $1', [campoId]),
  ]);

  return {
    campoId: campo.id,
    campo: campo.nombre,
    targets: campo.targets,
    recursos: recursos.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      curva: r.curva,
      ...(r.nota_curva ? { notaCurva: r.nota_curva } : {}),
    })),
    potreros: potreros.map((p) => ({
      id: p.id,
      orden: p.orden,
      nombre: p.nombre,
      superficieHa: Number(p.superficie_ha),
      supGanaderaHa: Number(p.sup_ganadera_ha),
      recursoId: p.recurso_id,
      descripcionRecurso: p.descripcion ?? '',
      ...(p.geometria ? { geometria: p.geometria } : {}),
    })),
    puntos: puntos.map((p) => ({
      id: p.id,
      potreroId: p.potrero_id,
      nombre: p.nombre,
      orden: p.orden,
      activo: p.activo,
      ...(p.lat !== null && p.lon !== null ? { lat: p.lat, lon: p.lon } : {}),
    })),
    rodeo: rodeos[0]
      ? { id: rodeos[0].id, nombre: rodeos[0].nombre, categorias: rodeos[0].categorias }
      : null,
  };
}

/** Inserta mediciones y eventos. Es idempotente: reenviar no duplica. */
async function guardarSync(campoId, usuario, paquete) {
  return enTransaccion(async (cx) => {
    const aceptadas = [];
    for (const m of paquete.mediciones ?? []) {
      if (typeof m?.id !== 'string') continue;
      await cx.query(
        `insert into medicion (id, campo_id, potrero_id, punto_id, fecha_hora, lecturas_cm,
                               altura_promedio, kg_ms_ha, curva, gps, observaciones,
                               usuario_id, usuario_nombre, dispositivo)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         on conflict (id) do nothing`,
        [
          m.id, campoId, m.potreroId, m.puntoId, m.fechaHora,
          JSON.stringify(m.lecturasCm ?? []), m.alturaPromedioCm, m.kgMSHa,
          JSON.stringify(m.curva ?? {}), m.gps ? JSON.stringify(m.gps) : null,
          m.observaciones ?? null, usuario.id, m.usuario ?? usuario.nombre,
          paquete.dispositivo ?? null,
        ],
      );
      aceptadas.push(m.id);
    }
    for (const e of paquete.eventos ?? []) {
      if (typeof e?.id !== 'string') continue;
      await cx.query(
        `insert into evento (id, campo_id, tipo, potrero_id, rodeo_id, fecha_hora,
                             altura_cm, observaciones, usuario_id, usuario_nombre)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict (id) do nothing`,
        [
          e.id, campoId, e.tipo, e.potreroId, e.rodeoId ?? null, e.fechaHora,
          e.alturaCm ?? null, e.observaciones ?? null, usuario.id, e.usuario ?? usuario.nombre,
        ],
      );
      aceptadas.push(e.id);
    }
    return aceptadas;
  });
}

const mapearMedicion = (m) => ({
  id: m.id,
  puntoId: m.punto_id,
  potreroId: m.potrero_id,
  fechaHora: m.fecha_hora.toISOString(),
  lecturasCm: m.lecturas_cm,
  alturaPromedioCm: Number(m.altura_promedio),
  kgMSHa: Number(m.kg_ms_ha),
  curva: m.curva,
  usuario: m.usuario_nombre,
  ...(m.gps ? { gps: m.gps } : {}),
  ...(m.observaciones ? { observaciones: m.observaciones } : {}),
  recibidaEn: m.recibida_en.toISOString(),
});

const mapearEvento = (e) => ({
  id: e.id,
  tipo: e.tipo,
  potreroId: e.potrero_id,
  rodeoId: e.rodeo_id,
  fechaHora: e.fecha_hora.toISOString(),
  ...(e.altura_cm !== null ? { alturaCm: Number(e.altura_cm) } : {}),
  ...(e.observaciones ? { observaciones: e.observaciones } : {}),
  usuario: e.usuario_nombre,
});

export function crearServidor() {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const ruta = url.pathname;

    if (req.method === 'OPTIONS') return responder(res, 204, {});

    try {
      // --- Sesión ---
      if (req.method === 'POST' && ruta === '/api/sesion') {
        const { email, clave } = await leerCuerpo(req);
        const sesion = await iniciarSesion(email, clave);
        if (!sesion) {
          await auditar({ usuario: null, accion: 'ingreso_fallido', detalle: { email } });
          return responder(res, 401, { error: 'Usuario o clave incorrectos' });
        }
        await auditar({ usuario: sesion.usuario, accion: 'ingreso' });
        return responder(res, 200, sesion);
      }

      // --- De acá en adelante hace falta sesión ---
      const token = tokenDe(req);
      const usuario = await usuarioDeToken(token);
      if (!usuario) return responder(res, 401, { error: 'Sesión no válida' });

      if (req.method === 'POST' && ruta === '/api/salir') {
        await cerrarSesion(token);
        await auditar({ usuario, accion: 'salida' });
        return responder(res, 200, { ok: true });
      }

      if (req.method === 'GET' && ruta === '/api/yo') {
        return responder(res, 200, { usuario, campos: await camposDe(usuario.id) });
      }

      // Campo pedido: el del parámetro, o el único al que el usuario accede.
      const campos = await camposDe(usuario.id);
      const campoId = url.searchParams.get('campo') ?? (await leerCampoDelCuerpo(req)) ?? campos[0]?.id;
      if (!campoId) return responder(res, 403, { error: 'El usuario no tiene campos asignados' });
      if (!(await tieneAccesoAlCampo(usuario.id, campoId))) {
        await auditar({ usuario, accion: 'acceso_denegado', campoId, detalle: { ruta } });
        return responder(res, 403, { error: 'Sin acceso a ese campo' });
      }

      // --- Lectura ---
      if (req.method === 'GET' && ruta === '/api/campo') {
        if (!puede(usuario.rol, 'leer:campo')) return responder(res, 403, { error: 'Sin permiso' });
        const campo = await traerCampo(campoId);
        return campo ? responder(res, 200, campo) : responder(res, 404, { error: 'Campo inexistente' });
      }

      if (req.method === 'GET' && ruta === '/api/mediciones') {
        if (!puede(usuario.rol, 'leer:datos')) return responder(res, 403, { error: 'Sin permiso' });
        const filas = await consultar(
          'select * from medicion where campo_id = $1 order by fecha_hora',
          [campoId],
        );
        return responder(res, 200, filas.map(mapearMedicion));
      }

      if (req.method === 'GET' && ruta === '/api/eventos') {
        if (!puede(usuario.rol, 'leer:datos')) return responder(res, 403, { error: 'Sin permiso' });
        const filas = await consultar(
          'select * from evento where campo_id = $1 order by fecha_hora',
          [campoId],
        );
        return responder(res, 200, filas.map(mapearEvento));
      }

      if (req.method === 'GET' && ruta === '/api/recomendaciones') {
        if (!puede(usuario.rol, 'leer:datos')) return responder(res, 403, { error: 'Sin permiso' });
        const filas = await consultar(
          'select id, fecha_hora, autor, texto, datos from recomendacion where campo_id = $1 order by fecha_hora desc',
          [campoId],
        );
        return responder(
          res,
          200,
          filas.map((r) => ({
            id: r.id,
            fechaHora: r.fecha_hora.toISOString(),
            autor: r.autor,
            texto: r.texto,
            ...(r.datos ? { datos: r.datos } : {}),
          })),
        );
      }

      if (req.method === 'GET' && ruta === '/api/auditoria') {
        if (!puede(usuario.rol, 'leer:auditoria')) return responder(res, 403, { error: 'Sin permiso' });
        const filas = await consultar(
          `select cuando, usuario_nombre, rol, accion, entidad, entidad_id, detalle
             from auditoria where campo_id = $1 or campo_id is null
            order by cuando desc limit 500`,
          [campoId],
        );
        return responder(
          res,
          200,
          filas.map((a) => ({
            cuando: a.cuando.toISOString(),
            usuario: a.usuario_nombre,
            rol: a.rol,
            accion: a.accion,
            entidad: a.entidad,
            entidadId: a.entidad_id,
            detalle: a.detalle,
          })),
        );
      }

      // --- Escritura ---
      if (req.method === 'POST' && ruta === '/api/sync') {
        if (!puede(usuario.rol, 'escribir:mediciones')) {
          await auditar({ usuario, accion: 'escritura_denegada', campoId, detalle: { ruta } });
          return responder(res, 403, { error: 'Este usuario no carga mediciones' });
        }
        const paquete = req.cuerpo ?? (await leerCuerpo(req));
        const aceptadas = await guardarSync(campoId, usuario, paquete);
        await auditar({
          usuario,
          accion: 'sincronizacion',
          entidad: 'medicion',
          campoId,
          detalle: {
            mediciones: paquete.mediciones?.length ?? 0,
            eventos: paquete.eventos?.length ?? 0,
            dispositivo: paquete.dispositivo ?? null,
          },
        });
        return responder(res, 200, { aceptadas });
      }

      if (req.method === 'POST' && ruta === '/api/recomendaciones') {
        if (!puede(usuario.rol, 'escribir:recomendaciones')) {
          await auditar({ usuario, accion: 'escritura_denegada', campoId, detalle: { ruta } });
          return responder(res, 403, { error: 'Solo el técnico registra recomendaciones' });
        }
        const r = req.cuerpo ?? (await leerCuerpo(req));
        if (typeof r?.id !== 'string' || typeof r?.texto !== 'string' || !r.texto.trim()) {
          return responder(res, 400, { error: 'Falta id o texto' });
        }
        await consultar(
          `insert into recomendacion (id, campo_id, fecha_hora, autor, texto, datos, usuario_id)
           values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do nothing`,
          [
            r.id, campoId, r.fechaHora ?? new Date().toISOString(),
            r.autor ?? usuario.nombre, r.texto,
            r.datos ? JSON.stringify(r.datos) : null, usuario.id,
          ],
        );
        await auditar({
          usuario,
          accion: 'recomendacion',
          entidad: 'recomendacion',
          entidadId: r.id,
          campoId,
          detalle: { texto: r.texto.slice(0, 200) },
        });
        return responder(res, 200, { aceptadas: [r.id] });
      }

      if (req.method === 'POST' && ruta === '/api/targets') {
        if (!puede(usuario.rol, 'escribir:configuracion')) {
          await auditar({ usuario, accion: 'escritura_denegada', campoId, detalle: { ruta } });
          return responder(res, 403, { error: 'Solo el técnico ajusta los objetivos' });
        }
        const { targets } = req.cuerpo ?? (await leerCuerpo(req));
        const validado = validarTargets(targets);
        if (typeof validado === 'string') return responder(res, 400, { error: validado });

        const [previo] = await consultar('select targets from campo where id = $1', [campoId]);
        await consultar('update campo set targets = $1 where id = $2', [
          JSON.stringify(validado), campoId,
        ]);
        await auditar({
          usuario,
          accion: 'ajuste_objetivos',
          entidad: 'campo',
          entidadId: campoId,
          campoId,
          detalle: { antes: previo?.targets ?? null, despues: validado },
        });
        return responder(res, 200, { targets: validado });
      }

      if (req.method === 'POST' && ruta === '/api/potreros/importar') {
        if (!puede(usuario.rol, 'escribir:configuracion')) {
          await auditar({ usuario, accion: 'escritura_denegada', campoId, detalle: { ruta } });
          return responder(res, 403, { error: 'Solo el técnico carga los límites de los potreros' });
        }
        const cuerpo = req.cuerpo ?? (await leerCuerpo(req));
        const resultado = await importarPotreros(campoId, cuerpo.potreros ?? []);
        await auditar({
          usuario,
          accion: 'importacion_kml',
          entidad: 'potrero',
          campoId,
          detalle: resultado,
        });
        return responder(res, 200, resultado);
      }

      responder(res, 404, { error: 'No existe' });
    } catch (error) {
      console.error('[api]', error);
      responder(res, 400, { error: error instanceof Error ? error.message : 'Error' });
    }
  });
}

/**
 * Valida los objetivos antes de guardarlos. Devuelve el objeto limpio, o un
 * texto con el motivo del rechazo: un objetivo mal cargado desalinea todo el
 * tablero, así que conviene que no entre.
 */
export function validarTargets(t) {
  if (!t || typeof t !== 'object') return 'Faltan los objetivos';
  const numeros = ['stockKgMSHa', 'entradaKgMSHa', 'salidaKgMSHa'];
  const limpio = {};
  for (const clave of numeros) {
    const v = Number(t[clave]);
    if (!Number.isFinite(v) || v < 0 || v > 20000) {
      return `El valor de ${clave} tiene que ser un número entre 0 y 20.000`;
    }
    limpio[clave] = Math.round(v);
  }
  if (limpio.salidaKgMSHa >= limpio.entradaKgMSHa) {
    return 'La biomasa de salida tiene que ser menor que la de entrada';
  }
  if (limpio.stockKgMSHa < limpio.salidaKgMSHa || limpio.stockKgMSHa > limpio.entradaKgMSHa) {
    return 'El stock objetivo tiene que quedar entre la biomasa de salida y la de entrada';
  }
  const datum = t.datum === 'sobre_5cm' ? 'sobre_5cm' : 'ras_suelo';
  const coef = t.coefConsumo === undefined ? undefined : Number(t.coefConsumo);
  if (coef !== undefined && (!Number.isFinite(coef) || coef <= 0 || coef > 0.15)) {
    return 'El consumo tiene que estar entre 0 y 15 % del peso vivo';
  }
  return { ...limpio, datum, ...(coef !== undefined ? { coefConsumo: coef } : {}) };
}

/** Nombre de potrero → identificador estable y legible. */
export function idDeNombre(nombre) {
  return (
    nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'potrero'
  );
}

/**
 * Guarda los potreros que vinieron de un KML. Si el nombre coincide con uno
 * que ya existe, se le agrega la geometría y la superficie sin tocar el resto
 * (recurso, mediciones); si no existe, se crea.
 */
async function importarPotreros(campoId, potreros) {
  const existentes = await consultar('select id, nombre from potrero where campo_id = $1', [campoId]);
  const porNombre = new Map(existentes.map((p) => [p.nombre.trim().toLowerCase(), p.id]));
  const [recurso] = await consultar(
    'select id from recurso where campo_id = $1 order by id limit 1',
    [campoId],
  );

  const actualizados = [];
  const creados = [];
  const omitidos = [];
  let orden = existentes.length;

  for (const p of potreros) {
    const nombre = String(p?.nombre ?? '').trim();
    const superficie = Number(p?.superficieHa);
    if (!nombre || !Number.isFinite(superficie) || superficie <= 0 || !p?.geometria) {
      omitidos.push(nombre || '(sin nombre)');
      continue;
    }
    const idExistente = porNombre.get(nombre.toLowerCase());
    if (idExistente) {
      await consultar(
        'update potrero set geometria = $1, superficie_ha = $2 where id = $3',
        [JSON.stringify(p.geometria), superficie, idExistente],
      );
      actualizados.push(nombre);
    } else {
      if (!recurso) {
        omitidos.push(nombre);
        continue;
      }
      let id = idDeNombre(nombre);
      if (existentes.some((e) => e.id === id)) id = `${id}-${++orden}`;
      await consultar(
        `insert into potrero (id, campo_id, orden, nombre, superficie_ha, sup_ganadera_ha,
                              recurso_id, descripcion, geometria)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, campoId, ++orden, nombre, superficie, superficie, recurso.id, '', JSON.stringify(p.geometria)],
      );
      creados.push(nombre);
    }
  }
  return { creados, actualizados, omitidos };
}

/**
 * Para los POST, el campo puede venir en el cuerpo. Se lee una sola vez y se
 * guarda en la petición para no consumir el stream dos veces.
 */
async function leerCampoDelCuerpo(req) {
  if (req.method !== 'POST') return null;
  req.cuerpo = await leerCuerpo(req);
  return req.cuerpo.campoId ?? null;
}

if (process.argv[1]?.endsWith('servidor.mjs')) {
  crearServidor().listen(PUERTO, () => {
    console.log(`API del Proyecto Pasto en http://localhost:${PUERTO}`);
  });
}
