/**
 * Gráfico de cuña (feed wedge): potreros ordenados de mayor a menor biomasa
 * con la línea que une el target de entrada con el de salida (Guía §3), y la
 * lectura sugerida (§3.3).
 */
import type { AnalisisRecorrida } from '../analisis.js';
import type { Campo } from '../tipos.js';
import { kg } from '../formato.js';

const TITULO_LECTURA: Record<string, string> = {
  seguir: 'Seguimos haciendo lo que hacíamos',
  deficit: 'Déficit de forraje',
  exceso: 'Exceso de forraje',
};

export function Cuna({ a, campo }: { a: AnalisisRecorrida; campo: Campo }) {
  const barras = a.cuna.barras;
  const maximo = Math.max(
    campo.targets.entradaKgMSHa * 1.25,
    ...barras.map((b) => b.biomasaKgMSHa),
  );
  const alturaPct = (v: number) => `${Math.max(2, (v / maximo) * 100)}%`;
  const enPastoreo = new Set(
    a.situaciones.filter((s) => s.estado === 'en_pastoreo').map((s) => s.potrero.nombre),
  );

  // Línea de targets: del objetivo de entrada (primera barra) al de salida
  // (última), anclada al centro de cada barra.
  const n = barras.length;
  const puntos = barras
    .map((b, i) => {
      const x = ((i + 0.5) / n) * 100;
      const y = 100 - (b.lineaKgMSHa / maximo) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="panel">
      <h2>Gráfico de cuña</h2>
      <p className="sub">
        Potreros de mayor a menor pasto. La línea roja va del objetivo de entrada (
        {kg(campo.targets.entradaKgMSHa)}) al de salida ({kg(campo.targets.salidaKgMSHa)} kg MS/ha).
      </p>

      <div className="cuna">
        <div className="cuna-area">
          <svg className="linea-targets" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
              points={puntos}
              fill="none"
              stroke="#b91c1c"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {barras.map((b) => (
            <div className="barra-col" key={b.nombre}>
              <div
                className={`barra ${enPastoreo.has(b.nombre) ? 'pastoreo' : b.posicion}`}
                style={{ height: alturaPct(b.biomasaKgMSHa) }}
              >
                <span className="valor-barra">{kg(b.biomasaKgMSHa)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="cuna-nombres">
          {barras.map((b) => (
            <div className="nombre-barra" key={b.nombre}>
              {b.nombre}
            </div>
          ))}
        </div>
      </div>

      <div className="leyenda">
        <span><i className="muestra" style={{ background: '#2e7d32' }} /> sobre la línea</span>
        <span><i className="muestra" style={{ background: '#b45309' }} /> por encima</span>
        <span><i className="muestra" style={{ background: '#93c5a5' }} /> por debajo</span>
        <span><i className="muestra" style={{ background: '#9ca3af' }} /> en pastoreo</span>
      </div>

      <div className={`lectura ${a.cuna.lectura}`}>
        {TITULO_LECTURA[a.cuna.lectura]}
        {a.cuna.lectura !== 'seguir' && (
          <ul>
            {a.cuna.acciones.map((accion) => (
              <li key={accion}>{accion}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
