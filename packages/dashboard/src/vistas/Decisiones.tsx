/**
 * Secuencia de decisión de la recorrida (Guía INTA §3): a qué potrero entrar,
 * cuánta superficie asignar por día, si alcanza el pasto y cuánto cerrar.
 */
import type { AnalisisRecorrida } from '../analisis.js';
import type { Campo } from '../tipos.js';
import { dec, kg, pct } from '../formato.js';

export function Decisiones({ a, campo }: { a: AnalisisRecorrida; campo: Campo }) {
  const d = a.decisiones;
  const deficit = a.balanceKgMSDia < 0;

  return (
    <div className="panel">
      <h2>Decisiones para los próximos 7 días</h2>
      <p className="sub">Secuencia de la Guía INTA (§3), calculada con la última recorrida.</p>

      <div className="decision">
        <span className="numero">1</span>
        <div>
          <div className="pregunta">¿A qué potrero van los animales?</div>
          <div className="respuesta">
            {d.potreroEntrada
              ? d.potreroEntrada.nombre
              : 'Ningún potrero llegó al objetivo de entrada'}
          </div>
          {d.potreroEntrada && (
            <div className="nota">
              Su biomasa es la más cercana al objetivo de entrada ({kg(campo.targets.entradaKgMSHa)} kg MS/ha).
              {d.potrerosPasados.length > 0 && (
                <>
                  {' '}
                  <strong>{d.potrerosPasados.map((p) => p.nombre).join(', ')}</strong>{' '}
                  {d.potrerosPasados.length === 1 ? 'está pasado' : 'están pasados'}: conviene
                  dejarlo{d.potrerosPasados.length === 1 ? '' : 's'} para reservas.
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="decision">
        <span className="numero">2</span>
        <div>
          <div className="pregunta">¿Qué superficie asignar por día?</div>
          <div className="respuesta">
            {d.superficieDiariaHa === null ? '—' : `${dec(d.superficieDiariaHa, 1)} ha/día`}
          </div>
          <div className="nota">
            {d.superficieDiariaHa !== null && d.potreroEntrada && (
              <>
                Para comer los {kg(a.pastoPorDiaKgMS)} kg MS/día que crecen, con remanente
                objetivo de {kg(campo.targets.salidaKgMSHa)} kg MS/ha.
                {d.vueltaResultanteDias !== null && (
                  <> A ese ritmo la vuelta resulta de {dec(d.vueltaResultanteDias, 0)} días.</>
                )}
                {' '}Ocupación máxima recomendada: {d.ocupacionMaximaDias} días por parcela.
              </>
            )}
          </div>
        </div>
      </div>

      <div className="decision">
        <span className="numero">3</span>
        <div>
          <div className="pregunta">¿Alcanza el pasto para el objetivo de consumo?</div>
          <div className="respuesta" style={{ color: deficit ? 'var(--rojo)' : 'var(--verde-oscuro)' }}>
            {deficit ? 'No — falta pasto' : 'Sí, y sobra'}
          </div>
          <div className="nota">
            {deficit ? (
              <>
                Faltan {kg(Math.abs(a.balanceKgMSDia))} kg MS/día para {a.cabezas} animales.
                Hay que <strong>suplementar {dec(d.suplementoKgMSPorAnimal ?? 0)} kg MS por animal
                y por día</strong>, o bien sacar animales del circuito.
              </>
            ) : (
              <>
                Sobran {kg(a.balanceKgMSDia)} kg MS/día. Para lograr el remanente objetivo conviene{' '}
                <strong>achicar la parcela a {dec(d.superficieDiariaPorConsumoHa ?? 0)} ha/día</strong>{' '}
                y cerrar superficie para reservas.
              </>
            )}
          </div>
        </div>
      </div>

      {!deficit && d.proporcionACerrar > 0 && (
        <div className="decision">
          <span className="numero">4</span>
          <div>
            <div className="pregunta">¿Cuánta superficie cerrar para reservas?</div>
            <div className="respuesta">
              {pct(d.proporcionACerrar)} · {dec(d.hectareasACerrar, 0)} ha
            </div>
            <div className="nota">
              Relación consumo/crecimiento = {dec(a.demandaKgMSDia / a.pastoPorDiaKgMS, 2)}. Empezar
              por los potreros más pasados.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
