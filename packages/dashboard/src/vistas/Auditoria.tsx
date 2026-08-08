/**
 * Auditoría: quién hizo qué y cuándo. El productor puede revisar todo el
 * movimiento del sistema sobre su campo.
 */
import { useEffect, useState } from 'react';
import { cargarAuditoria } from '../api.js';
import type { Auditoria as Registro } from '../tipos.js';

const ROTULO: Record<string, string> = {
  ingreso: 'Ingresó al sistema',
  ingreso_fallido: 'Intento de ingreso fallido',
  salida: 'Cerró sesión',
  sincronizacion: 'Sincronizó mediciones',
  recomendacion: 'Registró una recomendación',
  acceso_denegado: 'Acceso denegado',
  escritura_denegada: 'Escritura denegada',
};

function describir(r: Registro): string {
  if (r.accion === 'sincronizacion' && r.detalle) {
    const d = r.detalle as { mediciones?: number; eventos?: number; dispositivo?: string };
    const partes = [
      d.mediciones ? `${d.mediciones} mediciones` : '',
      d.eventos ? `${d.eventos} movimientos` : '',
    ].filter(Boolean);
    return `${partes.join(' y ') || 'sin registros'}${d.dispositivo ? ` · ${d.dispositivo}` : ''}`;
  }
  if (r.accion === 'recomendacion' && r.detalle) {
    return String((r.detalle as { texto?: string }).texto ?? '');
  }
  return r.detalle ? JSON.stringify(r.detalle) : '';
}

export function Auditoria() {
  const [registros, setRegistros] = useState<Registro[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarAuditoria()
      .then(setRegistros)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo cargar'));
  }, []);

  return (
    <div className="panel">
      <h2>Auditoría</h2>
      <p className="sub">Registro de todo lo que pasó en el campo: quién, qué y cuándo.</p>
      {error && <div className="aviso-error">{error}</div>}
      {!registros && !error && <p className="nota">Cargando…</p>}
      {registros && registros.length === 0 && <p className="nota">Sin movimientos registrados.</p>}
      {registros && registros.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Quién</th>
                <th>Rol</th>
                <th>Qué hizo</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r, i) => (
                <tr key={`${r.cuando}-${i}`}>
                  <td>{new Date(r.cuando).toLocaleString('es-AR')}</td>
                  <td>{r.usuario ?? '—'}</td>
                  <td>{r.rol ?? '—'}</td>
                  <td>{ROTULO[r.accion] ?? r.accion}</td>
                  <td style={{ fontSize: 13, color: 'var(--gris)' }}>{describir(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
