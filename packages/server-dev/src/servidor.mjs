/**
 * Servidor de DESARROLLO del Proyecto Pasto. Persiste en un JSON local y es
 * idempotente por id. El backend real (API + Postgres/PostGIS, auth, roles)
 * mantiene este mismo contrato:
 *
 *   GET  /api/campo            → configuración del campo (potreros, recursos, rodeo, targets)
 *   POST /api/sync             { usuario, dispositivo, mediciones[], eventos[] } → { aceptadas: [ids] }
 *   GET  /api/mediciones       → mediciones recibidas
 *   GET  /api/eventos          → eventos recibidos
 *   GET  /api/recomendaciones  → recomendaciones del técnico
 *   POST /api/recomendaciones  { id, fechaHora, autor, texto, datos? } → { aceptadas: [id] }
 *   GET  /api/estado           → conteos
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { campo } from '@pasto/campo-demo';

const PUERTO = Number(process.env.PUERTO ?? 8787);
const RUTA_DATOS = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'sync.json');

function cargar() {
  try {
    const d = JSON.parse(readFileSync(RUTA_DATOS, 'utf8'));
    return { mediciones: {}, eventos: {}, recomendaciones: {}, ...d };
  } catch {
    return { mediciones: {}, eventos: {}, recomendaciones: {} };
  }
}

function guardar(datos) {
  mkdirSync(dirname(RUTA_DATOS), { recursive: true });
  writeFileSync(RUTA_DATOS, JSON.stringify(datos, null, 2));
}

const datos = cargar();

function responder(res, codigo, cuerpo) {
  res.writeHead(codigo, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(cuerpo));
}

function leerCuerpo(req) {
  return new Promise((resolver, rechazar) => {
    let cuerpo = '';
    req.on('data', (trozo) => (cuerpo += trozo));
    req.on('end', () => {
      try {
        resolver(JSON.parse(cuerpo));
      } catch {
        rechazar(new Error('JSON inválido'));
      }
    });
  });
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') return responder(res, 204, {});

  try {
    if (req.method === 'GET' && url.pathname === '/api/campo') {
      return responder(res, 200, campo);
    }

    if (req.method === 'POST' && url.pathname === '/api/sync') {
      const paquete = await leerCuerpo(req);
      const aceptadas = [];
      for (const m of paquete.mediciones ?? []) {
        if (typeof m?.id === 'string') {
          datos.mediciones[m.id] = { ...m, recibidaEl: new Date().toISOString() };
          aceptadas.push(m.id);
        }
      }
      for (const e of paquete.eventos ?? []) {
        if (typeof e?.id === 'string') {
          datos.eventos[e.id] = { ...e, recibidoEl: new Date().toISOString() };
          aceptadas.push(e.id);
        }
      }
      guardar(datos);
      console.log(
        `[sync] ${paquete.usuario ?? '?'}: ${aceptadas.length} registros (total ${Object.keys(datos.mediciones).length} mediciones, ${Object.keys(datos.eventos).length} eventos)`,
      );
      return responder(res, 200, { aceptadas });
    }

    if (req.method === 'GET' && url.pathname === '/api/mediciones') {
      return responder(res, 200, Object.values(datos.mediciones));
    }

    if (req.method === 'GET' && url.pathname === '/api/eventos') {
      return responder(res, 200, Object.values(datos.eventos));
    }

    if (req.method === 'GET' && url.pathname === '/api/recomendaciones') {
      return responder(res, 200, Object.values(datos.recomendaciones));
    }

    if (req.method === 'POST' && url.pathname === '/api/recomendaciones') {
      const r = await leerCuerpo(req);
      if (typeof r?.id !== 'string' || typeof r?.texto !== 'string') {
        return responder(res, 400, { error: 'Falta id o texto' });
      }
      datos.recomendaciones[r.id] = { ...r, recibidaEl: new Date().toISOString() };
      guardar(datos);
      return responder(res, 200, { aceptadas: [r.id] });
    }

    if (req.method === 'GET' && url.pathname === '/api/estado') {
      return responder(res, 200, {
        mediciones: Object.keys(datos.mediciones).length,
        eventos: Object.keys(datos.eventos).length,
        recomendaciones: Object.keys(datos.recomendaciones).length,
      });
    }

    responder(res, 404, { error: 'No existe' });
  } catch (e) {
    responder(res, 400, { error: e instanceof Error ? e.message : 'Error' });
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Servidor de desarrollo del Proyecto Pasto en http://localhost:${PUERTO}`);
});
