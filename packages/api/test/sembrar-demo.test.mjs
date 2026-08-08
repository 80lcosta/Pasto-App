/**
 * La carga de demostración tiene que insertar TODAS las mediciones.
 * Una versión anterior derivaba el id de un recorte del texto, así que
 * distintos potreros y fechas terminaban con el mismo id y se perdían
 * casi todos los registros sin dar error.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { campo as campoDemo, demo } from '@pasto/campo-demo';
import { idDemo, sembrarDemo } from '../src/sembrar-demo.mjs';
import { cerrar, consultar, unaFila } from '../src/db.mjs';

before(async () => {
  await consultar("delete from medicion where dispositivo = 'carga de demostración'");
  await sembrarDemo();
});
after(async () => {
  await cerrar();
});

describe('Carga de demostración', () => {
  it('genera un id distinto por potrero y por fecha', () => {
    const claves = [];
    for (const r of demo.recorridas) {
      for (const potreroId of Object.keys(r.biomasas)) claves.push(`${potreroId}|${r.fecha}`);
    }
    const ids = claves.map(idDemo);
    assert.equal(new Set(ids).size, claves.length, 'hay ids repetidos');
  });

  it('los ids tienen forma de UUID', () => {
    assert.match(idDemo('pastura-1|2026-08-08'), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('inserta las 30 mediciones (6 potreros × 5 recorridas)', async () => {
    const esperadas = demo.recorridas.reduce((a, r) => a + Object.keys(r.biomasas).length, 0);
    const fila = await unaFila(
      "select count(*)::int as n from medicion where dispositivo = 'carga de demostración'",
    );
    assert.equal(esperadas, 30);
    assert.equal(fila.n, esperadas);
  });

  it('cada recorrida queda completa: los 6 potreros en las 5 fechas', async () => {
    const filas = await consultar(
      `select fecha_hora::date as fecha, count(distinct potrero_id)::int as potreros
         from medicion where dispositivo = 'carga de demostración'
        group by 1 order by 1`,
    );
    assert.equal(filas.length, demo.recorridas.length);
    for (const f of filas) assert.equal(f.potreros, campoDemo.potreros.length);
  });

  it('volver a correrla no duplica nada', async () => {
    const antes = await unaFila("select count(*)::int as n from medicion where dispositivo = 'carga de demostración'");
    await sembrarDemo();
    const despues = await unaFila("select count(*)::int as n from medicion where dispositivo = 'carga de demostración'");
    assert.equal(despues.n, antes.n);
  });
});
