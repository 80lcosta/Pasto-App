/**
 * Servidor de sincronización de DESARROLLO para la app del medidor.
 * Persiste en un JSON local y es idempotente por id (los reintentos del
 * teléfono no duplican registros). El backend real (API + Postgres/PostGIS)
 * se construye en la iteración del dashboard; el contrato es el mismo:
 *
 *   POST /api/sync      { usuario, dispositivo, mediciones[], eventos[] } → { aceptadas: [ids] }
 *   GET  /api/estado    → { mediciones, eventos }
 *   GET  /api/mediciones → listado (para inspección durante el desarrollo)
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUERTO = Number(process.env.PUERTO ?? 8787);
const RUTA_DATOS = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'sync.json');

function cargar() {
  try {
    return JSON.parse(readFileSync(RUTA_DATOS, 'utf8'));
  } catch {
    return { mediciones: {}, eventos: {} };
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

const servidor = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') return responder(res, 204, {});

  if (req.method === 'POST' && url.pathname === '/api/sync') {
    let cuerpo = '';
    req.on('data', (trozo) => (cuerpo += trozo));
    req.on('end', () => {
      try {
        const paquete = JSON.parse(cuerpo);
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
        responder(res, 200, { aceptadas });
      } catch {
        responder(res, 400, { error: 'JSON inválido' });
      }
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/estado') {
    return responder(res, 200, {
      mediciones: Object.keys(datos.mediciones).length,
      eventos: Object.keys(datos.eventos).length,
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/mediciones') {
    return responder(res, 200, Object.values(datos.mediciones));
  }

  responder(res, 404, { error: 'No existe' });
});

servidor.listen(PUERTO, () => {
  console.log(`Servidor de sincronización (desarrollo) en http://localhost:${PUERTO}`);
});
