/**
 * Informes del técnico recibidos por el productor (solo lectura) y exportes.
 */
import type { Recomendacion } from '../tipos.js';
import { kg } from '../formato.js';

export function Informes({
  recomendaciones,
  exportarExcel,
  imprimir,
}: {
  recomendaciones: Recomendacion[];
  exportarExcel: () => void;
  imprimir: () => void;
}) {
  return (
    <div className="panel">
      <h2>Informes y recomendaciones del técnico</h2>
      <p className="sub">
        Todo lo que se recomendó, con la fecha y los números en los que se basó.
      </p>

      <div className="fila-form sin-imprimir">
        <button className="boton secundario" onClick={exportarExcel}>
          ⬇ Descargar planilla de Excel
        </button>
        <button className="boton secundario" onClick={imprimir}>
          🖨 Imprimir o guardar en PDF
        </button>
      </div>

      {recomendaciones.length === 0 ? (
        <p className="nota">Todavía no hay recomendaciones registradas.</p>
      ) : (
        <div style={{ marginTop: 14 }}>
          {[...recomendaciones]
            .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
            .map((r) => (
              <div className="item-reco" key={r.id}>
                <div className="meta">
                  {new Date(r.fechaHora).toLocaleString('es-AR')} · {r.autor}
                  {r.datos && (
                    <>
                      {' '}· recorrida {r.datos.fechaRecorrida} · stock{' '}
                      {kg(r.datos.stockKgMSHa)} kg MS/ha · balance {kg(r.datos.balanceKgMSDia)} kg
                      MS/día
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
