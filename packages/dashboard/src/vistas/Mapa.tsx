/**
 * Mapa de potreros con el semáforo de estado. Se dibuja con los límites que
 * vinieron del KML, sin depender de imágenes de fondo: así funciona igual con
 * mala conexión y no hay que pagar un servicio de mapas.
 */
import type { GeometriaGeoJson } from '@pasto/core';
import type { AnalisisRecorrida, EstadoPotrero } from '../analisis.js';
import type { Potrero } from '../tipos.js';
import { kg, ROTULO_ESTADO } from '../formato.js';

const COLOR: Record<EstadoPotrero, string> = {
  en_pastoreo: 'var(--gris)',
  listo: 'var(--verde)',
  pasado: 'var(--ambar)',
  en_descanso: '#93c5a5',
  sin_datos: 'var(--borde)',
};

type Anillo = [number, number][];

function anillosDe(geometria: GeometriaGeoJson): Anillo[] {
  return geometria.type === 'Polygon'
    ? (geometria.coordinates as Anillo[])
    : (geometria.coordinates as Anillo[][]).flat();
}

export function Mapa({ a }: { a: AnalisisRecorrida }) {
  const conGeometria = a.situaciones.filter(
    (s): s is typeof s & { potrero: Potrero & { geometria: GeometriaGeoJson } } =>
      Boolean((s.potrero as Potrero & { geometria?: GeometriaGeoJson }).geometria),
  );

  if (conGeometria.length === 0) {
    return (
      <div className="panel">
        <h2>Mapa del campo</h2>
        <p className="sub">
          Todavía no están cargados los límites de los potreros. Subí el KML que exportás de
          Google Earth desde <strong>Configuración</strong> y el mapa se arma solo.
        </p>
      </div>
    );
  }

  // Todos los anillos, para calcular el encuadre.
  const todos = conGeometria.flatMap((s) => anillosDe(s.potrero.geometria).flat());
  const lons = todos.map((p) => p[0]);
  const lats = todos.map((p) => p[1]);
  const lonMin = Math.min(...lons);
  const lonMax = Math.max(...lons);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);

  // A esta latitud un grado de longitud mide menos que uno de latitud: se
  // corrige para que el campo no salga estirado a lo ancho.
  const latMedia = ((latMin + latMax) / 2) * (Math.PI / 180);
  const factorLon = Math.cos(latMedia);
  const ancho = Math.max((lonMax - lonMin) * factorLon, 1e-6);
  const alto = Math.max(latMax - latMin, 1e-6);
  const margen = Math.max(ancho, alto) * 0.04;

  const x = (lon: number) => (lon - lonMin) * factorLon + margen;
  const y = (lat: number) => latMax - lat + margen;
  const anchoTotal = ancho + margen * 2;
  const altoTotal = alto + margen * 2;

  const camino = (geometria: GeometriaGeoJson): string =>
    anillosDe(geometria)
      .map((anillo) => `M ${anillo.map(([lo, la]) => `${x(lo)},${y(la)}`).join(' L ')} Z`)
      .join(' ');

  const centro = (geometria: GeometriaGeoJson): [number, number] => {
    const puntos = anillosDe(geometria)[0] ?? [];
    const sx = puntos.reduce((acc, p) => acc + x(p[0]), 0) / (puntos.length || 1);
    const sy = puntos.reduce((acc, p) => acc + y(p[1]), 0) / (puntos.length || 1);
    return [sx, sy];
  };

  const tamTexto = Math.max(anchoTotal, altoTotal) * 0.022;

  return (
    <div className="panel">
      <h2>Mapa del campo</h2>
      <p className="sub">
        Los potreros con sus límites reales, pintados según cómo están hoy.
        {conGeometria.length < a.situaciones.length &&
          ` (${a.situaciones.length - conGeometria.length} potrero(s) todavía sin límites cargados.)`}
      </p>

      <svg
        viewBox={`0 0 ${anchoTotal} ${altoTotal}`}
        className="mapa"
        role="img"
        aria-label="Mapa de los potreros del campo con su estado"
      >
        {conGeometria.map((s) => {
          const [cx, cy] = centro(s.potrero.geometria);
          return (
            <g key={s.potrero.id}>
              <title>
                {s.potrero.nombre} · {ROTULO_ESTADO[s.estado]}
                {s.biomasaKgMSHa !== null ? ` · ${kg(s.biomasaKgMSHa)} kg MS/ha` : ''}
              </title>
              <path
                d={camino(s.potrero.geometria)}
                fill={COLOR[s.estado]}
                fillOpacity={s.estado === 'sin_datos' ? 0.35 : 0.8}
                stroke="var(--tinta)"
                strokeWidth={Math.max(anchoTotal, altoTotal) * 0.0018}
                strokeOpacity="0.5"
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                fontSize={tamTexto}
                fontWeight="700"
                fill="#12210f"
                style={{ pointerEvents: 'none' }}
              >
                {s.potrero.nombre}
              </text>
              {s.biomasaKgMSHa !== null && (
                <text
                  x={cx}
                  y={cy + tamTexto * 1.15}
                  textAnchor="middle"
                  fontSize={tamTexto * 0.85}
                  fill="#12210f"
                  fillOpacity="0.75"
                  style={{ pointerEvents: 'none' }}
                >
                  {kg(s.biomasaKgMSHa)} kg MS/ha
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="leyenda">
        {(['listo', 'pasado', 'en_descanso', 'en_pastoreo', 'sin_datos'] as EstadoPotrero[]).map(
          (estado) => (
            <span key={estado}>
              <i className="muestra" style={{ background: COLOR[estado] }} />
              {ROTULO_ESTADO[estado]}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
