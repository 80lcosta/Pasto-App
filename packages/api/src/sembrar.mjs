/**
 * Carga inicial: BioM, el cliente de Loma Alta, el campo con sus potreros y
 * puntos, y los tres usuarios de prueba (uno por rol).
 */
import { campo as campoDemo } from '@pasto/campo-demo';
import { hashearClave } from './auth.mjs';
import { cerrar, consultar } from './db.mjs';
import { migrar } from './migrar.mjs';

const ORGANIZACION = { id: 'biom', nombre: 'BioM' };
const CLIENTE = { id: 'loma-alta-cliente', nombre: 'Establecimiento Loma Alta' };
const CAMPO_ID = 'loma-alta';

/** Usuarios de prueba (una clave por rol). Cambiar antes de producción. */
export const USUARIOS_SEMILLA = [
  { id: 'u-medidor', email: 'benjamin@biom.test', nombre: 'Benjamín (medidor)', rol: 'medidor', clave: 'medidor123' },
  { id: 'u-tecnico', email: 'pancho@biom.test', nombre: 'Pancho (técnico)', rol: 'tecnico', clave: 'tecnico123' },
  { id: 'u-cliente', email: 'cliente@lomaalta.test', nombre: 'Dueño de Loma Alta', rol: 'cliente', clave: 'cliente123' },
];

/** 1 punto cada ~5 ha de superficie ganadera, mínimo 2 (minuta). */
export const cantidadPuntos = (supGanaderaHa) => Math.max(2, Math.round(supGanaderaHa / 5));

export async function sembrar() {
  await migrar();

  await consultar('insert into organizacion (id, nombre) values ($1,$2) on conflict (id) do nothing', [
    ORGANIZACION.id, ORGANIZACION.nombre,
  ]);
  await consultar(
    'insert into cliente (id, organizacion_id, nombre) values ($1,$2,$3) on conflict (id) do nothing',
    [CLIENTE.id, ORGANIZACION.id, CLIENTE.nombre],
  );
  await consultar(
    `insert into campo (id, cliente_id, nombre, targets) values ($1,$2,$3,$4)
     on conflict (id) do update set targets = excluded.targets`,
    [CAMPO_ID, CLIENTE.id, campoDemo.campo, JSON.stringify(campoDemo.targets)],
  );

  for (const r of campoDemo.recursos) {
    await consultar(
      `insert into recurso (id, campo_id, nombre, curva, nota_curva) values ($1,$2,$3,$4,$5)
       on conflict (id) do update set curva = excluded.curva, nota_curva = excluded.nota_curva`,
      [r.id, CAMPO_ID, r.nombre, JSON.stringify(r.curva), r.notaCurva ?? null],
    );
  }

  for (const p of campoDemo.potreros) {
    await consultar(
      `insert into potrero (id, campo_id, orden, nombre, superficie_ha, sup_ganadera_ha, recurso_id, descripcion)
       values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (id) do nothing`,
      [p.id, CAMPO_ID, p.orden, p.nombre, p.superficieHa, p.supGanaderaHa, p.recursoId, p.descripcionRecurso],
    );
    for (let i = 1; i <= cantidadPuntos(p.supGanaderaHa); i++) {
      await consultar(
        `insert into punto (id, potrero_id, nombre, orden, activo) values ($1,$2,$3,$4,true)
         on conflict (id) do nothing`,
        [`${p.id}-p${i}`, p.id, `Punto ${i}`, i],
      );
    }
  }

  await consultar(
    `insert into rodeo (id, campo_id, nombre, categorias) values ($1,$2,$3,$4)
     on conflict (id) do update set categorias = excluded.categorias`,
    [campoDemo.rodeo.id, CAMPO_ID, campoDemo.rodeo.nombre, JSON.stringify(campoDemo.rodeo.categorias)],
  );

  for (const u of USUARIOS_SEMILLA) {
    await consultar(
      `insert into usuario (id, email, nombre, rol, clave_hash) values ($1,$2,$3,$4,$5)
       on conflict (id) do update set clave_hash = excluded.clave_hash, rol = excluded.rol`,
      [u.id, u.email, u.nombre, u.rol, await hashearClave(u.clave)],
    );
    await consultar(
      'insert into acceso (usuario_id, campo_id) values ($1,$2) on conflict do nothing',
      [u.id, CAMPO_ID],
    );
  }

  return { campoId: CAMPO_ID, usuarios: USUARIOS_SEMILLA };
}

if (process.argv[1]?.endsWith('sembrar.mjs')) {
  const { usuarios } = await sembrar();
  console.log('Datos iniciales cargados. Usuarios de prueba:');
  for (const u of usuarios) console.log(`  ${u.rol.padEnd(8)} ${u.email}  clave: ${u.clave}`);
  await cerrar();
}
