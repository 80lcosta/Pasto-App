/**
 * Estado de sincronización y configuración mínima del dispositivo.
 */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, escribirMeta, leerMeta } from '../db.js';
import { sincronizar, URL_SERVIDOR_DEFAULT, type ResultadoSync } from '../sync.js';

export function Estado() {
  const [usuario, setUsuario] = useState('');
  const [urlServidor, setUrlServidor] = useState('');
  const [resultado, setResultado] = useState<ResultadoSync | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    void leerMeta('usuario', 'medidor').then(setUsuario);
    void leerMeta('urlServidor', URL_SERVIDOR_DEFAULT).then(setUrlServidor);
  }, []);

  const datos = useLiveQuery(async () => ({
    pendMediciones: await db.mediciones.where('estadoSync').equals('pendiente').count(),
    pendEventos: await db.eventos.where('estadoSync').equals('pendiente').count(),
    totalMediciones: await db.mediciones.count(),
    ultimaSync: (await db.meta.get('ultimaSync'))?.valor,
    campo: (await db.meta.get('campo'))?.valor ?? '—',
  }));
  if (!datos) return <p className="nota">Cargando…</p>;

  const pendientes = datos.pendMediciones + datos.pendEventos;

  const sincronizarAhora = async () => {
    setSincronizando(true);
    setResultado(await sincronizar());
    setSincronizando(false);
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
        <h2>Este equipo</h2>
        <label className="etiqueta" htmlFor="usuario">Quién mide (queda registrado en cada dato)</label>
        <input
          id="usuario"
          className="entrada"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          onBlur={() => escribirMeta('usuario', usuario.trim() || 'medidor')}
        />
        <label className="etiqueta" htmlFor="servidor">Servidor de sincronización</label>
        <input
          id="servidor"
          className="entrada"
          value={urlServidor}
          onChange={(e) => setUrlServidor(e.target.value)}
          onBlur={() => escribirMeta('urlServidor', urlServidor.trim() || URL_SERVIDOR_DEFAULT)}
        />
      </div>
    </div>
  );
}
