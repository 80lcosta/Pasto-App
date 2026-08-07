/**
 * Vuelta de pastoreo (tiempo de descanso) por tiempo térmico y por estado foliar.
 * Fuentes: A (5 pasos, paso 1), D (filocrono/VMF/estado foliar), Excel Info Base.
 */
import type { ParametrosEspecie } from './types.js';

/** Grados-día diarios = T media − T base, acotado a ≥ 0 (fuente D). */
export function gradosDiaDiarios(tMediaC: number, tBaseC: number): number {
  return Math.max(0, tMediaC - tBaseC);
}

/**
 * Vuelta de pastoreo (días) = VMF (°Cd) / (T media − T base).
 * Fuentes A y D; Excel Info Base cols. E y G. Devuelve null si la temperatura
 * media no supera la base (crecimiento detenido: la vuelta no está definida).
 */
export function vueltaTermicaDias(vmfGD: number, tMediaC: number, tBaseC: number): number | null {
  const gd = tMediaC - tBaseC;
  if (gd <= 0) return null;
  return vmfGD / gd;
}

/**
 * Estimación operativa a campo por estado foliar (fuente D, "¿Cómo puedo
 * orientarme en el campo?"): días por hoja = días desde la salida / estado
 * foliar actual; días restantes = hojas faltantes × días por hoja.
 * Ej.: salió hace 15 días, estado 1,0, objetivo 2,5 → 22,5 días (~20–25).
 */
export function diasHastaEstadoOptimo(
  diasDesdeSalida: number,
  estadoFoliarActual: number,
  hojasObjetivo: number,
): number {
  if (estadoFoliarActual <= 0) throw new Error('El estado foliar debe ser > 0');
  const diasPorHoja = diasDesdeSalida / estadoFoliarActual;
  return Math.max(0, (hojasObjetivo - estadoFoliarActual) * diasPorHoja);
}

/**
 * Parámetros por especie (fuente D, Tabla 1). GDA con temperatura base 2–4 °C.
 * El default de T base por recurso se define en la configuración del recurso
 * (el Excel usa 4 °C para festuca y 3,5 °C para alfalfa; dentro del rango).
 */
export const PARAMETROS_ESPECIE: Record<string, ParametrosEspecie> = {
  raigras_perenne: { filocronoGD: [100, 115], vmfGD: [300, 350], hojasVivas: 3.0 },
  festuca: { filocronoGD: [180, 220], vmfGD: [450, 550], hojasVivas: 2.5 },
  agropiro: { filocronoGD: [180, 240], vmfGD: [450, 600], hojasVivas: 2.5 },
  pasto_ovillo: { filocronoGD: [105, 125], vmfGD: [420, 500], hojasVivas: 4.0 },
  cebadilla_criolla: { filocronoGD: [75, 90], vmfGD: [300, 350], hojasVivas: 4.0 },
  raigras_anual: { filocronoGD: [90, 120], vmfGD: [350, 390], hojasVivas: 3.8 },
  avena: { filocronoGD: [110, 150], vmfGD: [450, 500], hojasVivas: 3.8 },
};

/**
 * Estado foliar objetivo de festuca según la época (fuente D): 2,5 hojas de
 * noviembre a julio; 1,5–1,7 hojas de agosto a noviembre (control temprano de
 * floración, con pastoreos cada 20–28 días y remanente severo de 3–4 cm).
 * `mes` en 1–12.
 */
export function hojasObjetivoFestuca(mes: number): number {
  if (mes < 1 || mes > 12) throw new Error('Mes inválido');
  return mes >= 8 && mes <= 11 ? 1.6 : 2.5;
}

/** Vueltas orientativas de festuca para Balcarce (fuente D): [mín, máx] días. */
export const VUELTA_ORIENTATIVA_FESTUCA_BALCARCE: { meses: number[]; dias: [number, number] }[] = [
  { meses: [3, 4], dias: [35, 50] },
  { meses: [5, 6, 7], dias: [50, 70] },
  { meses: [8, 9, 10, 11, 12, 1, 2], dias: [25, 35] },
];
