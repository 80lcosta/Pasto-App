/**
 * Tests de la API contra PostgreSQL real: sesiones, matriz de permisos por
 * rol, idempotencia de la sincronización y auditoría.
 *
 * Requiere la base configurada: `npm run --workspace @pasto/api sembrar`.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { crearServidor } from '../src/servidor.mjs';
import { sembrar } from '../src/sembrar.mjs';
import { cerrar, consultar } from '../src/db.mjs';

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

const ingresar = async (email, clave) => {
  const { datos } = await pedir('/api/sesion', { metodo: 'POST', cuerpo: { email, clave } });
  return datos.token;
};

before(async () => {
  await sembrar();
  servidor = crearServidor();
  await new Promise((r) => servidor.listen(0, r));
  base = `http://localhost:${servidor.address().port}`;
});

after(async () => {
  await new Promise((r) => servidor.close(r));
  await cerrar();
});

describe('Sesión', () => {
  it('rechaza credenciales incorrectas y no filtra si el usuario existe', async () => {
    const malaClave = await pedir('/api/sesion', {
      metodo: 'POST',
      cuerpo: { email: 'pancho@biom.test', clave: 'equivocada' },
    });
    const noExiste = await pedir('/api/sesion', {
      metodo: 'POST',
      cuerpo: { email: 'nadie@biom.test', clave: 'x' },
    });
    assert.equal(malaClave.estado, 401);
    assert.equal(noExiste.estado, 401);
    assert.equal(malaClave.datos.error, noExiste.datos.error);
  });

  it('devuelve token, rol y campos al ingresar bien', async () => {
    const { estado, datos } = await pedir('/api/sesion', {
      metodo: 'POST',
      cuerpo: { email: 'pancho@biom.test', clave: 'tecnico123' },
    });
    assert.equal(estado, 200);
    assert.equal(datos.usuario.rol, 'tecnico');
    assert.equal(datos.campos[0].id, 'loma-alta');
    assert.ok(datos.token.length >= 32);
  });

  it('sin token no se accede a nada', async () => {
    assert.equal((await pedir('/api/campo')).estado, 401);
    assert.equal((await pedir('/api/mediciones')).estado, 401);
  });

  it('un token inventado no sirve', async () => {
    assert.equal((await pedir('/api/campo', { token: 'a'.repeat(64) })).estado, 401);
  });

  it('al salir, el token deja de valer', async () => {
    const token = await ingresar('pancho@biom.test', 'tecnico123');
    assert.equal((await pedir('/api/campo', { token })).estado, 200);
    await pedir('/api/salir', { metodo: 'POST', token });
    assert.equal((await pedir('/api/campo', { token })).estado, 401);
  });
});

describe('Permisos por rol', () => {
  it('el medidor carga mediciones pero no lee el historial ni recomienda', async () => {
    const token = await ingresar('benjamin@biom.test', 'medidor123');

    assert.equal((await pedir('/api/campo', { token })).estado, 200);

    const sync = await pedir('/api/sync', {
      metodo: 'POST',
      token,
      cuerpo: {
        campoId: 'loma-alta',
        dispositivo: 'test',
        mediciones: [nuevaMedicion()],
        eventos: [],
      },
    });
    assert.equal(sync.estado, 200);
    assert.equal(sync.datos.aceptadas.length, 1);

    assert.equal((await pedir('/api/mediciones', { token })).estado, 403);
    assert.equal((await pedir('/api/auditoria', { token })).estado, 403);
    const reco = await pedir('/api/recomendaciones', {
      metodo: 'POST',
      token,
      cuerpo: { campoId: 'loma-alta', id: randomUUID(), texto: 'no debería entrar' },
    });
    assert.equal(reco.estado, 403);
  });

  it('el cliente lee todo pero no escribe nada', async () => {
    const token = await ingresar('cliente@lomaalta.test', 'cliente123');

    assert.equal((await pedir('/api/campo', { token })).estado, 200);
    assert.equal((await pedir('/api/mediciones', { token })).estado, 200);
    assert.equal((await pedir('/api/eventos', { token })).estado, 200);
    assert.equal((await pedir('/api/auditoria', { token })).estado, 200);

    const sync = await pedir('/api/sync', {
      metodo: 'POST',
      token,
      cuerpo: { campoId: 'loma-alta', mediciones: [nuevaMedicion()], eventos: [] },
    });
    assert.equal(sync.estado, 403);

    const reco = await pedir('/api/recomendaciones', {
      metodo: 'POST',
      token,
      cuerpo: { campoId: 'loma-alta', id: randomUUID(), texto: 'el cliente no recomienda' },
    });
    assert.equal(reco.estado, 403);
  });

  it('el técnico lee todo y registra recomendaciones', async () => {
    const token = await ingresar('pancho@biom.test', 'tecnico123');
    const id = randomUUID();
    const reco = await pedir('/api/recomendaciones', {
      metodo: 'POST',
      token,
      cuerpo: {
        campoId: 'loma-alta',
        id,
        fechaHora: new Date().toISOString(),
        autor: 'Pancho',
        texto: 'Entrar a Pastura 1 año, 2,2 ha/día.',
        datos: { fechaRecorrida: '2026-08-08', stockKgMSHa: 1445 },
      },
    });
    assert.equal(reco.estado, 200);

    const listado = await pedir('/api/recomendaciones', { token });
    assert.equal(listado.estado, 200);
    assert.ok(listado.datos.some((r) => r.id === id));
  });

  it('nadie entra a un campo que no tiene asignado', async () => {
    await consultar(
      `insert into cliente (id, organizacion_id, nombre) values ('otro-cliente','biom','Otro')
       on conflict (id) do nothing`,
    );
    await consultar(
      `insert into campo (id, cliente_id, nombre, targets)
       values ('campo-ajeno','otro-cliente','Campo ajeno','{}'::jsonb)
       on conflict (id) do nothing`,
    );
    const token = await ingresar('pancho@biom.test', 'tecnico123');
    const resp = await pedir('/api/campo?campo=campo-ajeno', { token });
    assert.equal(resp.estado, 403);

    const auditado = await consultar(
      `select accion from auditoria where campo_id = 'campo-ajeno' and accion = 'acceso_denegado'`,
    );
    assert.ok(auditado.length > 0, 'el intento tiene que quedar auditado');
  });
});

describe('Sincronización', () => {
  it('es idempotente: reenviar la misma medición no la duplica', async () => {
    const token = await ingresar('benjamin@biom.test', 'medidor123');
    const medicion = nuevaMedicion();
    const paquete = { campoId: 'loma-alta', mediciones: [medicion], eventos: [] };

    await pedir('/api/sync', { metodo: 'POST', token, cuerpo: paquete });
    await pedir('/api/sync', { metodo: 'POST', token, cuerpo: paquete });

    const filas = await consultar('select count(*)::int as n from medicion where id = $1', [medicion.id]);
    assert.equal(filas[0].n, 1);
  });

  it('guarda quién midió, con qué curva y desde qué dispositivo', async () => {
    const token = await ingresar('benjamin@biom.test', 'medidor123');
    const medicion = nuevaMedicion();
    await pedir('/api/sync', {
      metodo: 'POST',
      token,
      cuerpo: { campoId: 'loma-alta', dispositivo: 'Android · Moto G', mediciones: [medicion], eventos: [] },
    });
    const [fila] = await consultar(
      'select usuario_id, usuario_nombre, dispositivo, curva, kg_ms_ha from medicion where id = $1',
      [medicion.id],
    );
    assert.equal(fila.usuario_id, 'u-medidor');
    assert.equal(fila.dispositivo, 'Android · Moto G');
    assert.equal(fila.curva.pendiente, 144);
    assert.equal(Number(fila.kg_ms_ha), 1695);
  });
});

describe('Auditoría', () => {
  it('registra ingresos, sincronizaciones y recomendaciones', async () => {
    const token = await ingresar('cliente@lomaalta.test', 'cliente123');
    const { datos } = await pedir('/api/auditoria', { token });
    const acciones = new Set(datos.map((a) => a.accion));
    for (const esperada of ['ingreso', 'sincronizacion', 'recomendacion']) {
      assert.ok(acciones.has(esperada), `falta la acción ${esperada} en la auditoría`);
    }
    const sinc = datos.find((a) => a.accion === 'sincronizacion');
    assert.equal(sinc.rol, 'medidor');
    assert.ok(sinc.cuando);
  });

  it('deja registrado el intento de ingreso fallido', async () => {
    await pedir('/api/sesion', { metodo: 'POST', cuerpo: { email: 'pancho@biom.test', clave: 'mal' } });
    const filas = await consultar(
      `select count(*)::int as n from auditoria where accion = 'ingreso_fallido'`,
    );
    assert.ok(filas[0].n > 0);
  });
});

function nuevaMedicion() {
  return {
    id: randomUUID(),
    puntoId: 'pastura-1-p1',
    potreroId: 'pastura-1',
    fechaHora: new Date().toISOString(),
    lecturasCm: [13, 13, 13],
    alturaPromedioCm: 13,
    kgMSHa: 1695,
    curva: { pendiente: 144, interseccion: -177, datum: 'ras_suelo' },
    usuario: 'Benjamín (medidor)',
  };
}
