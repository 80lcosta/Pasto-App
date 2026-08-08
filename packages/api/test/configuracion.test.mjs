/**
 * Ajuste de objetivos e importación de límites de potreros desde KML.
 * Los objetivos quedan abiertos para ir afinándolos con el uso, pero validados:
 * un objetivo mal cargado desalinea todo el tablero.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { crearServidor, idDeNombre, validarTargets } from '../src/servidor.mjs';
import { sembrar } from '../src/sembrar.mjs';
import { cerrar, consultar, unaFila } from '../src/db.mjs';

let servidor;
let base;

async function pedir(ruta, { metodo = 'GET', token, cuerpo } = {}) {
  const resp = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(cuerpo ? { 'content-type': 'application/json' } : {}),
    },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });
  const texto = await resp.text();
  return { estado: resp.status, datos: texto ? JSON.parse(texto) : null };
}

const ingresar = async (email, clave) =>
  (await pedir('/api/sesion', { metodo: 'POST', cuerpo: { email, clave } })).datos.token;

/**
 * Potrero ya leído del KML (la lectura del archivo se prueba en @pasto/core;
 * acá se prueba qué hace la API con el resultado). Cuadrado de ~`lados`
 * metros en coordenadas de Tandil.
 */
function potreroLeido(nombre, lados, desplazamiento = 0) {
  const lat = -37.32 + desplazamiento * 0.05;
  const lon = -59.13;
  const dLat = lados / 2 / 111_320;
  const dLon = lados / 2 / (111_320 * Math.cos((lat * Math.PI) / 180));
  const anillo = [
    [lon - dLon, lat - dLat], [lon + dLon, lat - dLat],
    [lon + dLon, lat + dLat], [lon - dLon, lat + dLat], [lon - dLon, lat - dLat],
  ];
  return {
    nombre,
    superficieHa: Number(((lados * lados) / 10_000).toFixed(2)),
    geometria: { type: 'Polygon', coordinates: [anillo] },
  };
}

before(async () => {
  await sembrar();
  servidor = crearServidor();
  await new Promise((r) => servidor.listen(0, r));
  base = `http://localhost:${servidor.address().port}`;
});

after(async () => {
  await consultar("delete from potrero where campo_id = 'loma-alta' and nombre = 'Lote del cerro'");
  await consultar(
    `update campo set targets = '{"stockKgMSHa":1500,"entradaKgMSHa":2000,"salidaKgMSHa":1000,"datum":"ras_suelo"}'::jsonb
      where id = 'loma-alta'`,
  );
  await new Promise((r) => servidor.close(r));
  await cerrar();
});

describe('validarTargets', () => {
  it('acepta objetivos coherentes y los redondea', () => {
    const r = validarTargets({ stockKgMSHa: 1500.4, entradaKgMSHa: 2000, salidaKgMSHa: 1000 });
    assert.deepEqual(r, { stockKgMSHa: 1500, entradaKgMSHa: 2000, salidaKgMSHa: 1000, datum: 'ras_suelo' });
  });

  it('rechaza salida mayor o igual que entrada', () => {
    assert.equal(typeof validarTargets({ stockKgMSHa: 1500, entradaKgMSHa: 1000, salidaKgMSHa: 1000 }), 'string');
  });

  it('rechaza un stock fuera del rango entrada–salida', () => {
    assert.equal(typeof validarTargets({ stockKgMSHa: 2500, entradaKgMSHa: 2000, salidaKgMSHa: 1000 }), 'string');
    assert.equal(typeof validarTargets({ stockKgMSHa: 500, entradaKgMSHa: 2000, salidaKgMSHa: 1000 }), 'string');
  });

  it('rechaza valores que no son números', () => {
    assert.equal(typeof validarTargets({ stockKgMSHa: 'mucho', entradaKgMSHa: 2000, salidaKgMSHa: 1000 }), 'string');
  });

  it('acepta el coeficiente de consumo dentro de un rango sensato', () => {
    const ok = validarTargets({ stockKgMSHa: 1500, entradaKgMSHa: 2000, salidaKgMSHa: 1000, coefConsumo: 0.035 });
    assert.equal(ok.coefConsumo, 0.035);
    assert.equal(typeof validarTargets({ stockKgMSHa: 1500, entradaKgMSHa: 2000, salidaKgMSHa: 1000, coefConsumo: 0.5 }), 'string');
  });
});

describe('idDeNombre', () => {
  it('saca acentos, espacios y símbolos', () => {
    assert.equal(idDeNombre('Pastura 1 año'), 'pastura-1-ano');
    assert.equal(idDeNombre('Bulevard & cía'), 'bulevard-cia');
    assert.equal(idDeNombre('  '), 'potrero');
  });
});

describe('Ajustar los objetivos', () => {
  it('el técnico los cambia y queda registrado el antes y el después', async () => {
    const token = await ingresar('pancho@biom.test', 'tecnico123');
    const r = await pedir('/api/targets', {
      metodo: 'POST',
      token,
      cuerpo: { campoId: 'loma-alta', targets: { stockKgMSHa: 1600, entradaKgMSHa: 2200, salidaKgMSHa: 1100 } },
    });
    assert.equal(r.estado, 200);

    const campo = await unaFila("select targets from campo where id = 'loma-alta'");
    assert.equal(campo.targets.stockKgMSHa, 1600);

    const [aud] = await consultar(
      `select detalle from auditoria where accion = 'ajuste_objetivos' order by cuando desc limit 1`,
    );
    assert.equal(aud.detalle.antes.stockKgMSHa, 1500);
    assert.equal(aud.detalle.despues.stockKgMSHa, 1600);
  });

  it('rechaza objetivos incoherentes con un mensaje que explica el problema', async () => {
    const token = await ingresar('pancho@biom.test', 'tecnico123');
    const r = await pedir('/api/targets', {
      metodo: 'POST',
      token,
      cuerpo: { campoId: 'loma-alta', targets: { stockKgMSHa: 1500, entradaKgMSHa: 900, salidaKgMSHa: 1000 } },
    });
    assert.equal(r.estado, 400);
    assert.match(r.datos.error, /salida/i);
  });

  it('el cliente no puede tocarlos', async () => {
    const token = await ingresar('cliente@lomaalta.test', 'cliente123');
    const r = await pedir('/api/targets', {
      metodo: 'POST',
      token,
      cuerpo: { campoId: 'loma-alta', targets: { stockKgMSHa: 1500, entradaKgMSHa: 2000, salidaKgMSHa: 1000 } },
    });
    assert.equal(r.estado, 403);
  });
});

describe('Importar los límites desde KML', () => {
  it('actualiza el potrero que ya existe y crea el que no', async () => {
    const token = await ingresar('pancho@biom.test', 'tecnico123');
    const potreros = [potreroLeido('Pastura 1 año', 1000), potreroLeido('Lote del cerro', 2000, 1)];

    const r = await pedir('/api/potreros/importar', {
      metodo: 'POST',
      token,
      cuerpo: { campoId: 'loma-alta', potreros },
    });
    assert.equal(r.estado, 200);
    assert.deepEqual(r.datos.actualizados, ['Pastura 1 año']);
    assert.deepEqual(r.datos.creados, ['Lote del cerro']);

    // El potrero existente conserva su recurso y ahora tiene geometría.
    const existente = await unaFila("select geometria, recurso_id, superficie_ha from potrero where id = 'pastura-1'");
    assert.equal(existente.geometria.type, 'Polygon');
    assert.equal(existente.recurso_id, 'pastura-base-alfalfa');
    assert.ok(Math.abs(Number(existente.superficie_ha) - 100) < 1);

    const nuevo = await unaFila("select id, superficie_ha from potrero where nombre = 'Lote del cerro'");
    assert.equal(nuevo.id, 'lote-del-cerro');
    assert.ok(Math.abs(Number(nuevo.superficie_ha) - 400) < 3);
  });

  it('omite los que vienen sin geometría o sin nombre, sin romper el resto', async () => {
    const token = await ingresar('pancho@biom.test', 'tecnico123');
    const r = await pedir('/api/potreros/importar', {
      metodo: 'POST',
      token,
      cuerpo: {
        campoId: 'loma-alta',
        potreros: [
          { nombre: '', superficieHa: 10, geometria: { type: 'Polygon', coordinates: [] } },
          { nombre: 'Sin geometría', superficieHa: 10 },
        ],
      },
    });
    assert.equal(r.estado, 200);
    assert.equal(r.datos.omitidos.length, 2);
    assert.equal(r.datos.creados.length, 0);
  });

  it('el medidor no puede importar', async () => {
    const token = await ingresar('benjamin@biom.test', 'medidor123');
    const r = await pedir('/api/potreros/importar', {
      metodo: 'POST',
      token,
      cuerpo: { campoId: 'loma-alta', potreros: [] },
    });
    assert.equal(r.estado, 403);
  });
});
