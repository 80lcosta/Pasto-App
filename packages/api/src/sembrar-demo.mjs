/**
 * Carga las recorridas de demostración como mediciones reales, atribuidas al
 * usuario medidor. Sirve para mostrar el tablero con historial sin tener que
 * salir a medir. No se usa en producción.
 */
import { createHash } from 'node:crypto';
import { campo as campoDemo, demo } from '@pasto/campo-demo';
import { cerrar, consultar } from './db.mjs';
import { sembrar } from './sembrar.mjs';

const CAMPO_ID = campoDemo.campoId;
const USUARIO = { id: 'u-medidor', nombre: 'Benjamín (medidor)' };

/**
 * UUID estable derivado de la clave completa, para que volver a correr la
 * carga no duplique nada. Tiene que usar toda la clave: truncar el texto hace
 * que distintos potreros y fechas terminen con el mismo id.
 */
export function idDemo(clave) {
  const h = createHash('sha1').update(clave).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export async function sembrarDemo() {
  await sembrar();

  const curvas = new Map(
    (await consultar('select id, curva from recurso where campo_id = $1', [CAMPO_ID])).map((r) => [
      r.id,
      r.curva,
    ]),
  );
  const potreros = await consultar(
    'select id, recurso_id from potrero where campo_id = $1',
    [CAMPO_ID],
  );
  const recursoDe = new Map(potreros.map((p) => [p.id, p.recurso_id]));

  let mediciones = 0;
  for (const recorrida of demo.recorridas) {
    for (const [potreroId, kgMSHa] of Object.entries(recorrida.biomasas)) {
      const curva = curvas.get(recursoDe.get(potreroId));
      if (!curva) continue;
      const alturaCm = Number(((kgMSHa - curva.interseccion) / curva.pendiente).toFixed(1));
      await consultar(
        `insert into medicion (id, campo_id, potrero_id, punto_id, fecha_hora, lecturas_cm,
                               altura_promedio, kg_ms_ha, curva, usuario_id, usuario_nombre, dispositivo)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) on conflict (id) do nothing`,
        [
          idDemo(`${potreroId}|${recorrida.fecha}`), CAMPO_ID, potreroId, `${potreroId}-p1`,
          `${recorrida.fecha}T12:00:00.000Z`, JSON.stringify([alturaCm]), alturaCm, kgMSHa,
          JSON.stringify(curva), USUARIO.id, USUARIO.nombre, 'carga de demostración',
        ],
      );
      mediciones++;
    }
  }

  for (const e of demo.eventos) {
    await consultar(
      `insert into evento (id, campo_id, tipo, potrero_id, rodeo_id, fecha_hora, altura_cm,
                           usuario_id, usuario_nombre)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (id) do nothing`,
      [
        idDemo(`${e.potreroId}|${e.fechaHora}`), CAMPO_ID, e.tipo, e.potreroId, e.rodeoId,
        e.fechaHora, e.alturaCm ?? null, USUARIO.id, USUARIO.nombre,
      ],
    );
  }

  return { mediciones, eventos: demo.eventos.length };
}

if (process.argv[1]?.endsWith('sembrar-demo.mjs')) {
  const r = await sembrarDemo();
  console.log(`Demostración cargada: ${r.mediciones} mediciones y ${r.eventos} movimientos.`);
  await cerrar();
}
