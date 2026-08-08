/**
 * "Mi recorrida": puntos de medición agrupados por potrero, en el orden fijo
 * de la recorrida (Guía §2.2: mismo recorrido, mismo día y hora).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MedicionLocal } from '../db.js';

const DOCE_HORAS_MS = 12 * 60 * 60 * 1000;

function medicionReciente(mediciones: MedicionLocal[], puntoId: string): MedicionLocal | undefined {
  const corte = Date.now() - DOCE_HORAS_MS;
  return mediciones
    .filter((m) => m.puntoId === puntoId && new Date(m.fechaHora).getTime() >= corte)
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))[0];
}

export function Recorrida(props: { abrirPunto: (puntoId: string) => void }) {
  const datos = useLiveQuery(async () => {
    const [potreros, puntos, mediciones] = await Promise.all([
      db.potreros.toArray(),
      db.puntos.where('activo').notEqual('' as never).toArray().catch(() => db.puntos.toArray()),
      db.mediciones.toArray(),
    ]);
    return { potreros, puntos: puntos.filter((p) => p.activo), mediciones };
  });

  if (!datos) return <p className="nota">Cargando…</p>;
  const { puntos, mediciones } = datos;
  const potreros = [...datos.potreros].sort((a, b) => a.orden - b.orden);
  const medidosHoy = puntos.filter((p) => medicionReciente(mediciones, p.id)).length;

  return (
    <div>
      <div className="kpi">
        <div className="celda">
          <div className="valor">{medidosHoy}</div>
          <div className="rotulo">puntos medidos</div>
        </div>
        <div className="celda">
          <div className="valor">{puntos.length - medidosHoy}</div>
          <div className="rotulo">pendientes</div>
        </div>
      </div>
      {potreros.map((potrero) => {
        const propios = puntos
          .filter((p) => p.potreroId === potrero.id)
          .sort((a, b) => a.orden - b.orden);
        if (propios.length === 0) return null;
        return (
          <div key={potrero.id}>
            <p className="titulo-seccion">
              {potrero.nombre} · {potrero.supGanaderaHa} ha
            </p>
            {propios.map((punto) => {
              const med = medicionReciente(mediciones, punto.id);
              return (
                <button
                  key={punto.id}
                  className={`fila-punto${med ? ' medido' : ''}`}
                  onClick={() => props.abrirPunto(punto.id)}
                >
                  <span>{punto.nombre}</span>
                  <span className="estado">
                    {med
                      ? `✔ ${Math.round(med.kgMSHa).toLocaleString('es-AR')} kg MS/ha`
                      : 'sin medir →'}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
