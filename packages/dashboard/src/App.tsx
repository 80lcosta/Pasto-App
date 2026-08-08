import { useEffect, useMemo, useState } from 'react';
import { agruparRecorridas, analizarRecorrida, serieStock } from './analisis.js';
import { cargarDatos, publicarRecomendacion, type DatosDashboard } from './api.js';
import type { Recomendacion } from './tipos.js';
import { fecha } from './formato.js';
import { Indicadores } from './vistas/Indicadores.js';
import { Cuna } from './vistas/Cuna.js';
import { Decisiones } from './vistas/Decisiones.js';
import { TablaPotreros } from './vistas/TablaPotreros.js';
import { Evolucion } from './vistas/Evolucion.js';
import { Recomendaciones } from './vistas/Recomendaciones.js';

export function App() {
  const [datos, setDatos] = useState<DatosDashboard | null>(null);
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([]);

  useEffect(() => {
    void cargarDatos().then((d) => {
      setDatos(d);
      setRecomendaciones(d.recomendaciones);
    });
  }, []);

  const recorridas = useMemo(
    () => (datos ? agruparRecorridas(datos.mediciones) : []),
    [datos],
  );
  const analisis = useMemo(
    () => (datos ? analizarRecorrida(datos.campo, recorridas, datos.eventos, { cerrados }) : null),
    [datos, recorridas, cerrados],
  );
  const serie = useMemo(
    () => (datos ? serieStock(datos.campo, recorridas) : []),
    [datos, recorridas],
  );

  if (!datos) return <div className="cargando">Cargando el tablero…</div>;
  if (!analisis) {
    return (
      <div className="cargando">
        Todavía no hay mediciones cargadas. Cuando el medidor sincronice su primera recorrida,
        el tablero se arma solo.
      </div>
    );
  }

  const alternarCerrado = (potreroId: string) => {
    setCerrados((previos) => {
      const nuevos = new Set(previos);
      if (nuevos.has(potreroId)) nuevos.delete(potreroId);
      else nuevos.add(potreroId);
      return nuevos;
    });
  };

  const guardar = async (r: Recomendacion) => {
    const ok = await publicarRecomendacion(r);
    if (ok) setRecomendaciones((previas) => [...previas, r]);
    return ok;
  };

  return (
    <>
      <header className="cabecera">
        <div className="interior">
          <h1>Pasto · Tablero del técnico</h1>
          <span className="meta">
            {datos.campo.campo} · recorrida del {fecha(analisis.fecha)}
            {analisis.fechaAnterior && ` (${analisis.diasEntreRecorridas} días desde la anterior)`}
          </span>
        </div>
      </header>

      <div className="tablero">
        {datos.modoDemo && (
          <div className="aviso-demo">
            Datos de demostración: no hay mediciones sincronizadas todavía. Los números se
            calculan igual que con datos reales.
          </div>
        )}

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

        <TablaPotreros a={analisis} cerrados={cerrados} alternarCerrado={alternarCerrado} />
        <Evolucion serie={serie} campo={datos.campo} />
        <Recomendaciones a={analisis} recomendaciones={recomendaciones} publicar={guardar} />

        <p className="pie">
          Metodología: Guía para el manejo de pasturas en función del stock de pasto y la tasa
          de crecimiento (Berone et al., INTA Balcarce, 2022) y material del curso. Todos los
          cálculos se hacen con el motor validado del proyecto.
        </p>
      </div>
    </>
  );
}
