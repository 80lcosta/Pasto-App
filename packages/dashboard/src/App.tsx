import { useCallback, useEffect, useMemo, useState } from 'react';
import { agruparRecorridas, analizarRecorrida, serieStock } from './analisis.js';
import {
  cargarDatos,
  enModoDemo,
  publicarRecomendacion,
  SOLO_DEMO,
  salir,
  usuarioGuardado,
  type DatosDashboard,
} from './api.js';
import { descargarExcel, imprimirInforme } from './exportar.js';
import type { Recomendacion, Usuario } from './tipos.js';
import { fecha } from './formato.js';
import { Ingreso } from './vistas/Ingreso.js';
import { Indicadores } from './vistas/Indicadores.js';
import { Cuna } from './vistas/Cuna.js';
import { Decisiones } from './vistas/Decisiones.js';
import { TablaPotreros } from './vistas/TablaPotreros.js';
import { Evolucion } from './vistas/Evolucion.js';
import { Recomendaciones } from './vistas/Recomendaciones.js';
import { Historial } from './vistas/Historial.js';
import { Auditoria } from './vistas/Auditoria.js';
import { Informes } from './vistas/Informes.js';
import { Mapa } from './vistas/Mapa.js';
import { Configuracion } from './vistas/Configuracion.js';

type Seccion = 'estado' | 'historial' | 'informes' | 'auditoria' | 'configuracion';

export function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(usuarioGuardado());
  const [datos, setDatos] = useState<DatosDashboard | null>(null);
  const [error, setError] = useState('');
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([]);
  const [seccion, setSeccion] = useState<Seccion>('estado');

  const cargar = useCallback(() => {
    setError('');
    cargarDatos()
      .then((d) => {
        setDatos(d);
        setRecomendaciones(d.recomendaciones);
      })
      .catch((e: unknown) => {
        const mensaje = e instanceof Error ? e.message : 'No se pudo cargar';
        setError(mensaje);
        setDatos(null);
      });
  }, []);

  useEffect(() => {
    if (usuario) cargar();
  }, [usuario, cargar]);

  const recorridas = useMemo(() => (datos ? agruparRecorridas(datos.mediciones) : []), [datos]);
  const analisis = useMemo(
    () => (datos ? analizarRecorrida(datos.campo, recorridas, datos.eventos, { cerrados }) : null),
    [datos, recorridas, cerrados],
  );
  const serie = useMemo(() => (datos ? serieStock(datos.campo, recorridas) : []), [datos, recorridas]);

  if (!usuario) return <Ingreso alIngresar={setUsuario} />;

  const demo = enModoDemo();
  const esCliente = usuario.rol === 'cliente';

  const cerrarSesion = async () => {
    await salir();
    setUsuario(null);
    setDatos(null);
  };

  const alternarCerrado = (potreroId: string) => {
    setCerrados((previos) => {
      const nuevos = new Set(previos);
      if (nuevos.has(potreroId)) nuevos.delete(potreroId);
      else nuevos.add(potreroId);
      return nuevos;
    });
  };

  const guardarRecomendacion = async (r: Recomendacion) => {
    if (!datos) return false;
    const ok = await publicarRecomendacion(r, datos.campo.campoId);
    if (ok) setRecomendaciones((previas) => [...previas, r]);
    return ok;
  };

  const exportar = () => {
    if (!datos) return;
    descargarExcel(
      { campo: datos.campo, mediciones: datos.mediciones, eventos: datos.eventos, recomendaciones, recorridas },
      analisis,
    );
  };

  const secciones: { id: Seccion; rotulo: string }[] = [
    { id: 'estado', rotulo: esCliente ? 'Estado del campo' : 'Recorrida' },
    { id: 'historial', rotulo: 'Historial' },
    { id: 'informes', rotulo: 'Informes' },
    { id: 'auditoria', rotulo: 'Auditoría' },
    ...(esCliente ? [] : [{ id: 'configuracion' as const, rotulo: 'Configuración' }]),
  ];

  return (
    <>
      <header className="cabecera sin-imprimir">
        <div className="interior">
          <h1>Pasto · {esCliente ? 'Seguimiento del campo' : 'Tablero del técnico'}</h1>
          <span className="meta">
            {datos?.campo.campo ?? ''}
            {analisis && ` · recorrida del ${fecha(analisis.fecha)}`} · {usuario.nombre}{' '}
            {demo && (
              <>
                ·{' '}
                <button
                  className="boton-enlace"
                  onClick={() =>
                    setUsuario({
                      ...usuario,
                      rol: esCliente ? 'tecnico' : 'cliente',
                      nombre: esCliente ? 'Demostración · técnico' : 'Demostración · dueño',
                    })
                  }
                >
                  ver como {esCliente ? 'técnico' : 'dueño del campo'}
                </button>{' '}
              </>
            )}
            {!SOLO_DEMO && (
              <button className="boton-enlace" onClick={cerrarSesion}>
                salir
              </button>
            )}
          </span>
        </div>
        <nav className="interior solapas">
          {secciones.map((s) => (
            <button
              key={s.id}
              className={seccion === s.id ? 'activa' : ''}
              onClick={() => setSeccion(s.id)}
            >
              {s.rotulo}
            </button>
          ))}
        </nav>
      </header>

      <div className="tablero">
        {demo && (
          <div className="aviso-demo">
            <strong>Demostración</strong> — campo y mediciones de ejemplo, funcionando dentro de
            este navegador. Lo que cargues acá no se guarda en ningún lado y se pierde al
            recargar la página.
          </div>
        )}

        {error && (
          <div className="aviso-error">
            {error}{' '}
            <button className="boton-enlace" onClick={cargar}>
              reintentar
            </button>
          </div>
        )}

        {!datos && !error && <div className="cargando">Cargando…</div>}

        {datos && !analisis && (
          <div className="aviso-demo">
            Todavía no hay mediciones cargadas en este campo. Cuando el medidor sincronice su
            primera recorrida, el tablero se arma solo.
          </div>
        )}

        {datos && analisis && seccion === 'estado' && (
          <>
            {analisis.diasEntreRecorridas === 0 && (
              <div className="aviso-demo">
                Primera recorrida cargada: ya se ve el stock de cada potrero, pero todavía no se
                puede calcular la tasa de crecimiento. Hace falta una segunda recorrida (7 a 15
                días después) para saber cuánto crece el pasto y cuánto se puede comer por día.
              </div>
            )}

            <Indicadores a={analisis} campo={datos.campo} />

            <div className="rejilla dos">
              <Cuna a={analisis} campo={datos.campo} />
              <Decisiones a={analisis} campo={datos.campo} />
            </div>

            <TablaPotreros
              a={analisis}
              cerrados={cerrados}
              alternarCerrado={esCliente ? undefined : alternarCerrado}
            />
            <Mapa a={analisis} />
            <Evolucion serie={serie} campo={datos.campo} />

            {!esCliente && (
              <Recomendaciones
                a={analisis}
                recomendaciones={recomendaciones}
                publicar={guardarRecomendacion}
              />
            )}
          </>
        )}

        {datos && seccion === 'historial' && (
          <Historial campo={datos.campo} mediciones={datos.mediciones} eventos={datos.eventos} />
        )}

        {datos && seccion === 'informes' && (
          <Informes
            recomendaciones={recomendaciones}
            exportarExcel={exportar}
            imprimir={imprimirInforme}
          />
        )}

        {datos && seccion === 'auditoria' && <Auditoria />}

        {datos && seccion === 'configuracion' && !esCliente && (
          <Configuracion campo={datos.campo} alCambiar={cargar} />
        )}

        <p className="pie">
          Metodología: Guía para el manejo de pasturas en función del stock de pasto y la tasa
          de crecimiento (Berone et al., INTA Balcarce, 2022) y material del curso. Todos los
          cálculos se hacen con el motor validado del proyecto.
        </p>
      </div>
    </>
  );
}
