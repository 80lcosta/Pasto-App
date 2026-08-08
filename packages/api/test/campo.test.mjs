/**
 * Integridad del campo piloto Loma Alta cargado en la base
 * (Excel · Info Base, tabla de lotes) y regla de puntos de la minuta.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { campo as campoDemo } from '@pasto/campo-demo';
import { cantidadPuntos, sembrar } from '../src/sembrar.mjs';
import { cerrar, consultar, unaFila } from '../src/db.mjs';

before(async () => {
  await sembrar();
  // Importar un KML actualiza la superficie de los potreros al valor del
  // dibujo (es su función), así que acá se restablece la base sembrada para
  // comprobar el campo piloto tal como se carga la primera vez.
  for (const p of campoDemo.potreros) {
    await consultar(
      'update potrero set superficie_ha = $1, sup_ganadera_ha = $2 where id = $3',
      [p.superficieHa, p.supGanaderaHa, p.id],
    );
  }
});
after(async () => {
  await cerrar();
});

describe('Campo piloto Loma Alta', () => {
  it('superficie ganadera total = 146 ha (Excel C68)', async () => {
    const fila = await unaFila(
      "select sum(sup_ganadera_ha)::float as ha from potrero where campo_id = 'loma-alta'",
    );
    assert.equal(fila.ha, 146);
  });

  it('superficie física total = 161 ha (suma de lotes)', async () => {
    const fila = await unaFila(
      "select sum(superficie_ha)::float as ha from potrero where campo_id = 'loma-alta'",
    );
    assert.equal(fila.ha, 161);
  });

  it('1 punto cada ~5 ha de superficie ganadera, mínimo 2 (minuta)', () => {
    assert.equal(cantidadPuntos(30), 6);
    assert.equal(cantidadPuntos(15), 3);
    assert.equal(cantidadPuntos(6), 2);
  });

  it('quedan 29 puntos de medición activos', async () => {
    const fila = await unaFila(
      `select count(*)::int as n from punto p
         join potrero t on t.id = p.potrero_id
        where t.campo_id = 'loma-alta' and p.activo`,
    );
    assert.equal(fila.n, 29);
  });

  it('el rodeo suma 373 cabezas (Excel C83), sin duplicar categorías', async () => {
    const fila = await unaFila("select categorias from rodeo where campo_id = 'loma-alta'");
    const cabezas = fila.categorias.reduce((a, c) => a + c.cabezas, 0);
    assert.equal(cabezas, 373);
  });

  it('todos los potreros apuntan a un recurso existente con su curva', async () => {
    const huerfanos = await consultar(
      `select p.id from potrero p
        left join recurso r on r.id = p.recurso_id
       where p.campo_id = 'loma-alta' and (r.id is null or r.curva is null)`,
    );
    assert.deepEqual(huerfanos, []);
  });

  it('los objetivos del campo son los de la Guía (1.500 / 2.000 / 1.000)', async () => {
    const fila = await unaFila("select targets from campo where id = 'loma-alta'");
    assert.equal(fila.targets.stockKgMSHa, 1500);
    assert.equal(fila.targets.entradaKgMSHa, 2000);
    assert.equal(fila.targets.salidaKgMSHa, 1000);
    assert.equal(fila.targets.datum, 'ras_suelo');
  });
});
