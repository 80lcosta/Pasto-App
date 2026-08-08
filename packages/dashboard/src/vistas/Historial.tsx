/**
 * Historial por potrero: todas las mediciones y movimientos, con quién los
 * cargó y cuándo. Es la vista de trazabilidad del productor.
 */
import { useState } from 'react';
import type { Campo, Evento, Medicion } from '../tipos.js';
import { dec, kg } from '../formato.js';

export function Historial({
  campo,
  mediciones,
  eventos,
}: {
  campo: Campo;
  mediciones: Medicion[];
  eventos: Evento[];
}) {
  const [potreroId, setPotreroId] = useState('');
  const elegido = potreroId || campo.potreros[0]?.id || '';
  const nombre = new Map(campo.potreros.map((p) => [p.id, p.nombre]));

  const propias = mediciones
    .filter((m) => m.potreroId === elegido)
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
  const movimientos = eventos
    .filter((e) => e.potreroId === elegido)
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));

  return (
    <div className="panel">
      <h2>Historial por potrero</h2>
      <p className="sub">Cada dato registra quién lo cargó, cuándo y con qué curva se calculó.</p>

      <label className="etiqueta" htmlFor="pot">Potrero</label>
      <select
        id="pot"
        className="entrada"
        value={elegido}
        onChange={(e) => setPotreroId(e.target.value)}
      >
        {campo.potreros.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre} · {p.supGanaderaHa} ha
          </option>
        ))}
      </select>

      <h3 className="subtitulo">Mediciones ({propias.length})</h3>
      {propias.length === 0 ? (
        <p className="nota">Todavía no hay mediciones en este potrero.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Punto</th>
                <th className="num">Alturas (cm)</th>
                <th className="num">Promedio</th>
                <th className="num">kg MS/ha</th>
                <th>Midió</th>
              </tr>
            </thead>
            <tbody>
              {propias.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.fechaHora).toLocaleString('es-AR')}</td>
                  <td>{m.puntoId}</td>
                  <td className="num">{m.lecturasCm.join(' · ')}</td>
                  <td className="num">{dec(m.alturaPromedioCm)}</td>
                  <td className="num">
                    <strong>{kg(m.kgMSHa)}</strong>
                  </td>
                  <td>{m.usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="subtitulo">Movimientos de animales ({movimientos.length})</h3>
      {movimientos.length === 0 ? (
        <p className="nota">Sin entradas ni salidas registradas en {nombre.get(elegido)}.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th className="num">Altura (cm)</th>
              <th>Observaciones</th>
              <th>Registró</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.fechaHora).toLocaleString('es-AR')}</td>
                <td>
                  <span className={`pastilla ${e.tipo === 'entrada' ? 'listo' : 'en_descanso'}`}>
                    {e.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                  </span>
                </td>
                <td className="num">{e.alturaCm !== undefined ? dec(e.alturaCm) : '—'}</td>
                <td>{e.observaciones ?? ''}</td>
                <td>{e.usuario}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
