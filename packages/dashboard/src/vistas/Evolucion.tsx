/**
 * Evolución del stock promedio recorrida a recorrida, contra el objetivo
 * (la figura del "cálculo del miedo": mantener el stock cerca del objetivo).
 */
import type { Campo } from '../tipos.js';
import { fecha, kg } from '../formato.js';

export function Evolucion({
  serie,
  campo,
}: {
  serie: { fecha: string; stockKgMSHa: number }[];
  campo: Campo;
}) {
  if (serie.length < 2) return null;

  const ancho = 600;
  const alto = 190;
  const margen = { arriba: 20, abajo: 26, izq: 30, der: 74 };
  const maximo = Math.max(campo.targets.entradaKgMSHa, ...serie.map((s) => s.stockKgMSHa)) * 1.1;

  const x = (i: number) =>
    margen.izq + (i / (serie.length - 1)) * (ancho - margen.izq - margen.der);
  const y = (v: number) =>
    margen.arriba + (1 - v / maximo) * (alto - margen.arriba - margen.abajo);

  const linea = serie.map((s, i) => `${x(i)},${y(s.stockKgMSHa)}`).join(' ');
  const yObjetivo = y(campo.targets.stockKgMSHa);

  return (
    <div className="panel">
      <h2>Evolución del stock</h2>
      <p className="sub">
        Promedio del campo en cada recorrida, contra el objetivo de{' '}
        {kg(campo.targets.stockKgMSHa)} kg MS/ha.
      </p>
      <svg className="grafico-linea" viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Evolución del stock de pasto">
        <line x1={margen.izq} y1={y(0)} x2={ancho - margen.der} y2={y(0)} stroke="#d8e0d4" />
        <line
          x1={margen.izq}
          y1={yObjetivo}
          x2={ancho - margen.der + 8}
          y2={yObjetivo}
          stroke="#b91c1c"
          strokeDasharray="5 4"
        />
        <text x={ancho - margen.der + 14} y={yObjetivo + 4} fontSize="11" fill="#b91c1c">
          objetivo {kg(campo.targets.stockKgMSHa)}
        </text>
        <polyline points={linea} fill="none" stroke="#2e7d32" strokeWidth="2.5" />
        {serie.map((s, i) => (
          <g key={s.fecha}>
            <circle cx={x(i)} cy={y(s.stockKgMSHa)} r="4" fill="#1b5e20" />
            <text x={x(i)} y={y(s.stockKgMSHa) - 10} textAnchor="middle" fontSize="11" fill="#12210f" fontWeight="700">
              {kg(s.stockKgMSHa)}
            </text>
            <text x={x(i)} y={alto - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
              {fecha(s.fecha)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
