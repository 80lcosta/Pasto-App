/**
 * Recomendaciones del técnico: quedan registradas con el contexto de la
 * recorrida (stock, crecimiento y balance del momento) para trazabilidad.
 */
import { useState } from 'react';
import type { AnalisisRecorrida } from '../analisis.js';
import type { Recomendacion } from '../tipos.js';
import { dec, kg } from '../formato.js';

export function Recomendaciones({
  a,
  recomendaciones,
  publicar,
}: {
  a: AnalisisRecorrida;
  recomendaciones: Recomendacion[];
  publicar: (r: Recomendacion) => Promise<boolean>;
}) {
  const [texto, setTexto] = useState('');
  const [autor, setAutor] = useState('Pancho');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const sugerencia = [
    a.decisiones.potreroEntrada ? `Entrar a ${a.decisiones.potreroEntrada.nombre}.` : '',
    a.decisiones.superficieDiariaHa
      ? `Asignar ${dec(a.decisiones.superficieDiariaHa)} ha/día.`
      : '',
    a.decisiones.suplementoKgMSPorAnimal
      ? `Suplementar ${dec(a.decisiones.suplementoKgMSPorAnimal)} kg MS/animal/día o descargar.`
      : '',
    a.decisiones.hectareasACerrar > 0 && a.balanceKgMSDia > 0
      ? `Cerrar ${dec(a.decisiones.hectareasACerrar, 0)} ha para reservas.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    const ok = await publicar({
      id: crypto.randomUUID(),
      fechaHora: new Date().toISOString(),
      autor: autor.trim() || 'técnico',
      texto: texto.trim(),
      datos: {
        fechaRecorrida: a.fecha,
        stockKgMSHa: a.stockKgMSHa,
        tasaPonderadaKgMSHaDia: a.tasaPonderadaKgMSHaDia,
        balanceKgMSDia: a.balanceKgMSDia,
      },
    });
    setEnviando(false);
    setAviso(ok ? '✔ Recomendación registrada' : 'No se pudo guardar (¿servidor apagado?)');
    if (ok) setTexto('');
  };

  return (
    <div className="panel">
      <h2>Recomendación al productor</h2>
      <p className="sub">
        Queda registrada con la fecha, el autor y los números de esta recorrida.
      </p>

      <textarea
        className="entrada"
        rows={4}
        placeholder="Qué hacer esta semana y por qué…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <div className="fila-form">
        <input
          className="entrada"
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
          aria-label="Autor"
        />
        <button className="boton secundario" onClick={() => setTexto(sugerencia)}>
          Usar las decisiones calculadas
        </button>
        <button className="boton" disabled={enviando || !texto.trim()} onClick={enviar}>
          {enviando ? 'Guardando…' : 'Registrar recomendación'}
        </button>
        {aviso && <span className="pie">{aviso}</span>}
      </div>

      {recomendaciones.length > 0 && (
        <div style={{ marginTop: 18 }}>
          {[...recomendaciones]
            .sort((x, y) => y.fechaHora.localeCompare(x.fechaHora))
            .map((r) => (
              <div className="item-reco" key={r.id}>
                <div className="meta">
                  {new Date(r.fechaHora).toLocaleString('es-AR')} · {r.autor}
                  {r.datos && (
                    <>
                      {' '}· recorrida {r.datos.fechaRecorrida} · stock {kg(r.datos.stockKgMSHa)} kg
                      MS/ha · balance {kg(r.datos.balanceKgMSDia)} kg MS/día
                    </>
                  )}
                </div>
                <div className="texto">{r.texto}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
