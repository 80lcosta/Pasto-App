/**
 * Registro rápido de entrada/salida de animales por potrero (hoja Registro
 * del Excel: fecha/hora + altura de entrada y de salida).
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, leerMeta, type TipoEvento } from '../db.js';

export function Eventos() {
  const [tipo, setTipo] = useState<TipoEvento>('entrada');
  const [potreroId, setPotreroId] = useState('');
  const [rodeoId, setRodeoId] = useState('');
  const [altura, setAltura] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [confirmacion, setConfirmacion] = useState('');

  const datos = useLiveQuery(async () => ({
    potreros: (await db.potreros.toArray()).sort((a, b) => a.orden - b.orden),
    rodeos: await db.rodeos.toArray(),
    ultimos: await db.eventos.orderBy('fechaHora').reverse().limit(5).toArray(),
  }));
  if (!datos) return <p className="nota">Cargando…</p>;

  const potrero = potreroId || datos.potreros[0]?.id || '';
  const rodeo = rodeoId || datos.rodeos[0]?.id || '';

  const guardar = async () => {
    if (!potrero || !rodeo) return;
    const alturaCm = altura === '' ? undefined : Number(altura.replace(',', '.'));
    await db.eventos.add({
      id: crypto.randomUUID(),
      tipo,
      potreroId: potrero,
      rodeoId: rodeo,
      fechaHora: new Date().toISOString(),
      ...(alturaCm !== undefined && Number.isFinite(alturaCm) ? { alturaCm } : {}),
      ...(observaciones ? { observaciones } : {}),
      usuario: await leerMeta('usuario', 'medidor'),
      estadoSync: 'pendiente',
    });
    const nombrePotrero = datos.potreros.find((p) => p.id === potrero)?.nombre ?? potrero;
    setConfirmacion(`✔ ${tipo === 'entrada' ? 'Entrada a' : 'Salida de'} ${nombrePotrero} registrada`);
    setAltura('');
    setObservaciones('');
  };

  return (
    <div>
      {confirmacion && <div className="aviso-ok">{confirmacion}</div>}
      <div className="tarjeta">
        <h2>Movimiento de animales</h2>
        <p className="sub">Registrá la entrada o salida del rodeo en el momento</p>

        <div className="alternar">
          <button className={tipo === 'entrada' ? 'activo' : ''} onClick={() => setTipo('entrada')}>
            ➜ Entrada
          </button>
          <button className={tipo === 'salida' ? 'activo' : ''} onClick={() => setTipo('salida')}>
            Salida ➜
          </button>
        </div>

        <label className="etiqueta" htmlFor="potrero">Potrero</label>
        <select id="potrero" className="entrada" value={potrero} onChange={(e) => setPotreroId(e.target.value)}>
          {datos.potreros.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} · {p.supGanaderaHa} ha
            </option>
          ))}
        </select>

        <label className="etiqueta" htmlFor="rodeo">Rodeo</label>
        <select id="rodeo" className="entrada" value={rodeo} onChange={(e) => setRodeoId(e.target.value)}>
          {datos.rodeos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre} ({r.categorias.reduce((a, c) => a + c.cabezas, 0)} cab)
            </option>
          ))}
        </select>

        <label className="etiqueta" htmlFor="altura">
          Altura del pasto ({tipo === 'entrada' ? 'entrada' : 'salida'}) — opcional, cm
        </label>
        <input
          id="altura"
          className="entrada"
          inputMode="decimal"
          placeholder="ej.: 18"
          value={altura}
          onChange={(e) => setAltura(e.target.value)}
        />

        <label className="etiqueta" htmlFor="obs">Observaciones — opcional</label>
        <textarea
          id="obs"
          className="entrada"
          rows={2}
          placeholder="manchones, malezas, suelo desnudo…"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />

        <div style={{ height: 12 }} />
        <button className="boton primario" onClick={guardar}>
          Guardar {tipo === 'entrada' ? 'entrada' : 'salida'}
        </button>
      </div>

      {datos.ultimos.length > 0 && (
        <>
          <p className="titulo-seccion">Últimos movimientos</p>
          {datos.ultimos.map((e) => (
            <div className="tarjeta" key={e.id}>
              <h2>
                {e.tipo === 'entrada' ? '➜ Entrada' : 'Salida ➜'} ·{' '}
                {datos.potreros.find((p) => p.id === e.potreroId)?.nombre ?? e.potreroId}
              </h2>
              <p className="sub">
                {new Date(e.fechaHora).toLocaleString('es-AR')}
                {e.alturaCm !== undefined ? ` · altura ${e.alturaCm} cm` : ''}
                {e.estadoSync === 'pendiente' ? ' · ⏳ sin sincronizar' : ' · ✔ sincronizado'}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
