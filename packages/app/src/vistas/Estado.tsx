/**
 * Estado de sincronización, datos de la sesión y salida.
 */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { salir, usuarioGuardado, type Usuario } from '../sesion.js';
import { sincronizar, type ResultadoSync } from '../sync.js';

export function Estado({ alSalir }: { alSalir: () => void }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [resultado, setResultado] = useState<ResultadoSync | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    void usuarioGuardado().then(setUsuario);
  }, []);

  const datos = useLiveQuery(async () => ({
    pendMediciones: await db.mediciones.where('estadoSync').equals('pendiente').count(),
    pendEventos: await db.eventos.where('estadoSync').equals('pendiente').count(),
    totalMediciones: await db.mediciones.count(),
    ultimaSync: (await db.meta.get('ultimaSync'))?.valor,
    campo: (await db.meta.get('campo'))?.valor ?? '—',
    servidor: (await db.meta.get('urlServidor'))?.valor ?? '—',
  }));
  if (!datos) return <p className="nota">Cargando…</p>;

  const pendientes = datos.pendMediciones + datos.pendEventos;

  const sincronizarAhora = async () => {
    setSincronizando(true);
    setResultado(await sincronizar());
    setSincronizando(false);
  };

  const cerrarSesion = async () => {
    if (pendientes > 0) {
      const seguro = window.confirm(
        `Tenés ${pendientes} registros sin enviar. Si salís, quedan guardados en el teléfono hasta que vuelvas a ingresar. ¿Salir igual?`,
      );
      if (!seguro) return;
    }
    await salir();
    alSalir();
  };

  return (
    <div>
      <div className="kpi">
        <div className="celda">
          <div className="valor">{pendientes}</div>
          <div className="rotulo">sin sincronizar</div>
        </div>
        <div className="celda">
          <div className="valor">{datos.totalMediciones}</div>
          <div className="rotulo">mediciones en el equipo</div>
        </div>
      </div>

      {resultado?.error && <div className="aviso-error">No se pudo sincronizar: {resultado.error}</div>}
      {resultado && !resultado.error && resultado.enviadas > 0 && (
        <div className="aviso-ok">✔ Se sincronizaron {resultado.enviadas} registros</div>
      )}

      <div className="tarjeta">
        <h2>Sincronización</h2>
        <p className="sub">
          Campo: {datos.campo} · Última sincronización:{' '}
          {datos.ultimaSync ? new Date(datos.ultimaSync).toLocaleString('es-AR') : 'nunca'}
        </p>
        <button className="boton primario" disabled={sincronizando || pendientes === 0} onClick={sincronizarAhora}>
          {sincronizando ? 'Sincronizando…' : `Sincronizar ahora (${pendientes})`}
        </button>
        <p className="nota">
          Los datos se guardan en el teléfono y se envían solos cuando hay señal. No hace falta
          hacer nada: este botón es solo para forzar el envío.
        </p>
      </div>

      <div className="tarjeta">
        <h2>Sesión</h2>
        <p className="sub">
          {usuario ? `${usuario.nombre} · ${usuario.rol}` : 'Sin datos'} · Servidor: {datos.servidor}
        </p>
        <p className="nota">
          Cada medición queda registrada con tu nombre y la fecha y hora en que la cargaste.
        </p>
        <div style={{ height: 10 }} />
        <button className="boton suave" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
