import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.js';
import { enModoDemo, tokenGuardado } from './sesion.js';
import { iniciarSyncAutomatica } from './sync.js';
import { Ingreso } from './vistas/Ingreso.js';
import { Recorrida } from './vistas/Recorrida.js';
import { Punto } from './vistas/Punto.js';
import { Eventos } from './vistas/Eventos.js';
import { Estado } from './vistas/Estado.js';

type Vista = 'recorrida' | 'eventos' | 'estado';

export function App() {
  const [vista, setVista] = useState<Vista>('recorrida');
  const [puntoAbierto, setPuntoAbierto] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [conSesion, setConSesion] = useState<boolean | null>(null);

  const revisarSesion = useCallback(() => {
    void Promise.all([tokenGuardado(), enModoDemo()]).then(([t, demo]) =>
      setConSesion(Boolean(t) || demo),
    );
  }, []);

  useEffect(revisarSesion, [revisarSesion]);

  useEffect(() => {
    const marcar = () => setOnline(navigator.onLine);
    window.addEventListener('online', marcar);
    window.addEventListener('offline', marcar);
    const detener = iniciarSyncAutomatica();
    return () => {
      window.removeEventListener('online', marcar);
      window.removeEventListener('offline', marcar);
      detener();
    };
  }, []);

  const pendientes = useLiveQuery(async () => {
    const [m, e] = await Promise.all([
      db.mediciones.where('estadoSync').equals('pendiente').count(),
      db.eventos.where('estadoSync').equals('pendiente').count(),
    ]);
    return m + e;
  });

  const campo = useLiveQuery(async () => (await db.meta.get('campo'))?.valor ?? '');
  const demo = useLiveQuery(async () => (await db.meta.get('modoDemo'))?.valor === 'si');

  if (conSesion === null) return <div className="cargando">Cargando…</div>;

  if (!conSesion) {
    return (
      <div className="app">
        <header className="cabecera">
          <h1>Pasto · Medidor</h1>
        </header>
        <main className="contenido">
          <Ingreso alIngresar={revisarSesion} />
        </main>
      </div>
    );
  }

  const bandaClase = demo ? 'pendiente' : !online ? 'offline' : (pendientes ?? 0) > 0 ? 'pendiente' : 'ok';
  const bandaTexto = demo
    ? '🎓 Demostración — los datos quedan solo en este equipo'
    : !online
    ? `⛰ Sin señal — todo se guarda en el teléfono${(pendientes ?? 0) > 0 ? ` (${pendientes} para enviar)` : ''}`
    : (pendientes ?? 0) > 0
      ? `⏳ ${pendientes} registros esperando sincronizar`
      : '✔ Todo sincronizado';

  return (
    <div className="app">
      <header className="cabecera">
        <h1>Pasto · Medidor</h1>
        <span className="campo">{campo}</span>
      </header>
      <div className={`banda-sync ${bandaClase}`}>{bandaTexto}</div>
      <main className="contenido">
        {vista === 'recorrida' && puntoAbierto === null && <Recorrida abrirPunto={setPuntoAbierto} />}
        {vista === 'recorrida' && puntoAbierto !== null && (
          <Punto puntoId={puntoAbierto} volver={() => setPuntoAbierto(null)} />
        )}
        {vista === 'eventos' && <Eventos />}
        {vista === 'estado' && <Estado alSalir={revisarSesion} />}
      </main>
      <nav className="nav">
        <button
          className={vista === 'recorrida' ? 'activo' : ''}
          onClick={() => {
            setVista('recorrida');
            setPuntoAbierto(null);
          }}
        >
          <span className="icono">📏</span>
          Recorrida
        </button>
        <button className={vista === 'eventos' ? 'activo' : ''} onClick={() => setVista('eventos')}>
          <span className="icono">🐮</span>
          Animales
        </button>
        <button className={vista === 'estado' ? 'activo' : ''} onClick={() => setVista('estado')}>
          <span className="icono">☁️</span>
          Estado
        </button>
      </nav>
    </div>
  );
}
