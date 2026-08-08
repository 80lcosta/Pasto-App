import type { AnalisisRecorrida } from '../analisis.js';
import type { Campo } from '../tipos.js';
import { dec, kg } from '../formato.js';

export function Indicadores({ a, campo }: { a: AnalisisRecorrida; campo: Campo }) {
  const deficit = a.balanceKgMSDia < 0;
  const desvioStock = a.stockKgMSHa - campo.targets.stockKgMSHa;

  return (
    <div className="indicadores">
      <div className={`indicador${a.cuna.estadoStock === 'bajo' ? ' alerta' : a.cuna.estadoStock === 'alto' ? ' exceso' : ''}`}>
        <div className="rotulo">Stock de pasto</div>
        <div className="valor">{kg(a.stockKgMSHa)}</div>
        <div className="detalle">
          kg MS/ha · objetivo {kg(campo.targets.stockKgMSHa)} ({desvioStock >= 0 ? '+' : ''}
          {kg(desvioStock)})
        </div>
      </div>

      <div className="indicador">
        <div className="rotulo">Crecimiento</div>
        <div className="valor">{dec(a.tasaPonderadaKgMSHaDia)}</div>
        <div className="detalle">kg MS/ha/día (ponderado)</div>
      </div>

      <div className="indicador">
        <div className="rotulo">Pasto por día</div>
        <div className="valor">{kg(a.pastoPorDiaKgMS)}</div>
        <div className="detalle">kg MS/día para comer</div>
      </div>

      <div className="indicador">
        <div className="rotulo">Demanda</div>
        <div className="valor">{kg(a.demandaKgMSDia)}</div>
        <div className="detalle">
          kg MS/día · {a.cabezas} cabezas
        </div>
      </div>

      <div className={`indicador${deficit ? ' alerta' : ' exceso'}`}>
        <div className="rotulo">Balance</div>
        <div className="valor">
          {deficit ? '−' : '+'}
          {kg(Math.abs(a.balanceKgMSDia))}
        </div>
        <div className="detalle">
          kg MS/día · {deficit ? 'falta pasto' : 'sobra pasto'}
        </div>
      </div>
    </div>
  );
}
