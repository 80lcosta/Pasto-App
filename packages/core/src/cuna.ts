/**
 * Gráfico de cuña (feed wedge) y elección del potrero de entrada.
 * Fuente: Guía INTA §3 y §3.3.
 */
import type { TargetsPlataforma } from './types.js';
import { stockPromedioKgMSHa, type PotreroConBiomasa } from './stock.js';

export interface PotreroCuna extends PotreroConBiomasa {
  nombre: string;
  enPastoreo?: boolean;
  cerrado?: boolean;
}

export type PosicionRespectoLinea = 'encima' | 'sobre_linea' | 'debajo';
export type EstadoStock = 'ok' | 'bajo' | 'alto';
export type LecturaCuna = 'seguir' | 'deficit' | 'exceso';

export interface BarraCuna {
  nombre: string;
  biomasaKgMSHa: number;
  superficieHa: number;
  /** Valor de la línea de targets en la posición de esta barra. */
  lineaKgMSHa: number;
  posicion: PosicionRespectoLinea;
}

export interface Cuna {
  /** Potreros ordenados de mayor a menor biomasa (Guía §3). */
  barras: BarraCuna[];
  stockKgMSHa: number;
  estadoStock: EstadoStock;
  lectura: LecturaCuna;
  /** Acciones sugeridas, textual, según Guía §3.3. */
  acciones: string[];
}

/** Acciones sugeridas por lectura (Guía §3.3, textos de las tres situaciones). */
export const ACCIONES_POR_LECTURA: Record<LecturaCuna, string[]> = {
  seguir: ['Seguimos haciendo lo que hacíamos'],
  deficit: [
    'Déficit de forraje: desacelerar la rotación',
    'Bajar carga',
    'Aumentar suplementación',
  ],
  exceso: [
    'Exceso de forraje: acelerar la rotación',
    'Sacar suplemento',
    'Aumentar carga',
    'Cerrar potreros para reservas',
  ],
};

/**
 * Construye el gráfico de cuña: potreros ordenados de mayor a menor biomasa y
 * línea recta que une el target de entrada (primera posición) con el target de
 * salida (última posición) (Guía §3).
 *
 * La lectura global sigue §3.3: stock bajo → déficit; stock alto → exceso;
 * stock ok → decide la mayoría de potreros claramente fuera de la línea
 * (si no hay mayoría, seguir igual).
 */
export function construirCuna(
  potreros: PotreroCuna[],
  targets: TargetsPlataforma,
  opciones: { toleranciaLinea?: number; ponderarStock?: boolean } = {},
): Cuna {
  const activos = potreros.filter((p) => !p.cerrado);
  if (activos.length === 0) throw new Error('Sin potreros activos');
  const tolLinea = opciones.toleranciaLinea ?? 0.1;
  const tolStock = targets.toleranciaStock ?? 0.1;

  const ordenados = [...activos].sort((a, b) => b.biomasaKgMSHa - a.biomasaKgMSHa);
  const n = ordenados.length;
  const barras: BarraCuna[] = ordenados.map((p, i) => {
    const frac = n === 1 ? 0 : i / (n - 1);
    const linea = targets.entradaKgMSHa + (targets.salidaKgMSHa - targets.entradaKgMSHa) * frac;
    const desvio = (p.biomasaKgMSHa - linea) / linea;
    const posicion: PosicionRespectoLinea =
      desvio > tolLinea ? 'encima' : desvio < -tolLinea ? 'debajo' : 'sobre_linea';
    return {
      nombre: p.nombre,
      biomasaKgMSHa: p.biomasaKgMSHa,
      superficieHa: p.superficieHa,
      lineaKgMSHa: linea,
      posicion,
    };
  });

  const stock = stockPromedioKgMSHa(activos, { ponderado: opciones.ponderarStock ?? false });
  const desvioStock = (stock - targets.stockKgMSHa) / targets.stockKgMSHa;
  const estadoStock: EstadoStock =
    desvioStock > tolStock ? 'alto' : desvioStock < -tolStock ? 'bajo' : 'ok';

  let lectura: LecturaCuna;
  if (estadoStock === 'bajo') lectura = 'deficit';
  else if (estadoStock === 'alto') lectura = 'exceso';
  else {
    const debajo = barras.filter((b) => b.posicion === 'debajo').length;
    const encima = barras.filter((b) => b.posicion === 'encima').length;
    if (debajo > n / 2) lectura = 'deficit';
    else if (encima > n / 2) lectura = 'exceso';
    else lectura = 'seguir';
  }

  return { barras, stockKgMSHa: stock, estadoStock, lectura, acciones: ACCIONES_POR_LECTURA[lectura] };
}

export interface EleccionEntrada {
  /** Potrero elegido para entrar, o null si no hay candidatos. */
  elegido: PotreroCuna | null;
  /** Potreros pasados del target de entrada: candidatos a cerrar para reservas. */
  pasados: PotreroCuna[];
}

/**
 * Elección del potrero de entrada (Guía §3.1–3.2): el de biomasa más cercana
 * al target de entrada sin estar pasado. Un potrero "pasado" (biomasa por
 * encima del target + tolerancia) se deja para reservas (ej. §3.2: A con
 * 2.500 ante target 2.000 se cierra; se entra a C con 1.900).
 * Si todos están pasados, se devuelve el menos pasado como elegido.
 */
export function elegirPotreroEntrada(
  potreros: PotreroCuna[],
  targetEntradaKgMSHa: number,
  opciones: { toleranciaPasado?: number } = {},
): EleccionEntrada {
  const tol = opciones.toleranciaPasado ?? 0.05;
  const limite = targetEntradaKgMSHa * (1 + tol);
  const disponibles = potreros.filter((p) => !p.enPastoreo && !p.cerrado);
  const pasados = disponibles.filter((p) => p.biomasaKgMSHa > limite);
  const candidatos = disponibles.filter((p) => p.biomasaKgMSHa <= limite);
  if (candidatos.length > 0) {
    const elegido = candidatos.reduce((a, b) => (b.biomasaKgMSHa > a.biomasaKgMSHa ? b : a));
    return { elegido, pasados };
  }
  if (pasados.length > 0) {
    const menosPasado = pasados.reduce((a, b) => (b.biomasaKgMSHa < a.biomasaKgMSHa ? b : a));
    return { elegido: menosPasado, pasados };
  }
  return { elegido: null, pasados: [] };
}
