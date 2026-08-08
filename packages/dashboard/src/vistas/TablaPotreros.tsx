/**
 * Semáforo de potreros: estado actual, días de descanso/ocupación y tasa de
 * crecimiento. Permite cerrar/abrir potreros para reservas.
 */
import type { AnalisisRecorrida } from '../analisis.js';
import { dec, kg, ROTULO_ESTADO } from '../formato.js';

export function TablaPotreros({
  a,
  cerrados,
  alternarCerrado,
}: {
  a: AnalisisRecorrida;
  cerrados: Set<string>;
  /** Si no se pasa (perfil cliente), la tabla es de solo lectura. */
  alternarCerrado?: (potreroId: string) => void;
}) {
  const editable = alternarCerrado !== undefined;
  return (
    <div className="panel">
      <h2>Potreros</h2>
      <p className="sub">
        Estado al {a.fecha.split('-').reverse().join('/')}.
        {editable &&
          ' Cerrar un potrero lo saca de la rotación para confección de reservas y lo excluye del cálculo.'}
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Potrero</th>
              <th className="num">ha</th>
              <th className="num">kg MS/ha</th>
              <th className="num">Crecimiento</th>
              <th className="num">Descanso</th>
              <th className="num">Ocupación</th>
              <th>Estado</th>
              {editable && <th>Reservas</th>}
            </tr>
          </thead>
          <tbody>
            {a.situaciones.map((s) => {
              const cerrado = cerrados.has(s.potrero.id);
              const excedido =
                s.diasOcupacion !== null && s.diasOcupacion > s.ocupacionMaximaDias;
              return (
                <tr key={s.potrero.id}>
                  <td>
                    <strong>{s.potrero.nombre}</strong>
                    <div style={{ fontSize: 12, color: 'var(--gris)' }}>
                      {s.potrero.descripcionRecurso}
                    </div>
                  </td>
                  <td className="num">{s.potrero.supGanaderaHa}</td>
                  <td className="num">{s.biomasaKgMSHa === null ? '—' : kg(s.biomasaKgMSHa)}</td>
                  <td className="num">
                    {s.tasaCrecimientoKgMSHaDia === null ? '—' : dec(s.tasaCrecimientoKgMSHaDia)}
                  </td>
                  <td className="num">{s.diasDescanso === null ? '—' : `${s.diasDescanso} d`}</td>
                  <td className="num" style={excedido ? { color: 'var(--rojo)', fontWeight: 700 } : undefined}>
                    {s.diasOcupacion === null
                      ? '—'
                      : `${s.diasOcupacion} d${excedido ? ` (máx ${s.ocupacionMaximaDias})` : ''}`}
                  </td>
                  <td>
                    <span className={`pastilla ${cerrado ? 'cerrado' : s.estado}`}>
                      {cerrado ? 'Cerrado' : ROTULO_ESTADO[s.estado]}
                    </span>
                  </td>
                  {editable && (
                    <td>
                      <button
                        className="boton secundario"
                        style={{ padding: '6px 12px', fontSize: 13 }}
                        onClick={() => alternarCerrado(s.potrero.id)}
                      >
                        {cerrado ? 'Reabrir' : 'Cerrar'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
