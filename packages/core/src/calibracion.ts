/**
 * Estimación de biomasa disponible y calibración de curvas altura → kg MS/ha.
 * Fuente: Guía INTA Anexo 1 (mismo procedimiento y datos que Excel hoja Curva).
 */
import type { CurvaCalibracion, Datum, MuestraCalibracion } from './types.js';

export const LADO_MARCO_DEFAULT_M = 0.4;

/**
 * Convierte una muestra de corte en kg MS/ha (Guía Anexo 1, paso 2; Excel hoja Curva):
 * peso seco = peso húmedo × %MS · g MS/m² = peso seco / superficie del marco ·
 * kg MS/ha = g MS/m² × 10.
 */
export function biomasaDeMuestraKgMSHa(m: MuestraCalibracion): number {
  const lado = m.ladoMarcoM ?? LADO_MARCO_DEFAULT_M;
  const pesoSecoG = m.pesoHumedoG * m.proporcionMS;
  const gMSPorM2 = pesoSecoG / (lado * lado);
  return gMSPorM2 * 10;
}

/**
 * Ajusta la curva lineal altura (cm) → kg MS/ha por cuadrados mínimos
 * (Guía Anexo 1, paso 4). Con los datos del ejemplo de la Guía reproduce
 * kg MS/ha = −177 + 144 × cm, R² 0,86.
 */
export function ajustarCurva(muestras: MuestraCalibracion[], datum: Datum): CurvaCalibracion {
  if (muestras.length < 2) {
    throw new Error('Se necesitan al menos 2 muestras para ajustar la curva');
  }
  const puntos = muestras.map((m) => ({ x: m.alturaCm, y: biomasaDeMuestraKgMSHa(m) }));
  const n = puntos.length;
  const sumX = puntos.reduce((a, p) => a + p.x, 0);
  const sumY = puntos.reduce((a, p) => a + p.y, 0);
  const mediaX = sumX / n;
  const mediaY = sumY / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of puntos) {
    sxx += (p.x - mediaX) ** 2;
    sxy += (p.x - mediaX) * (p.y - mediaY);
    syy += (p.y - mediaY) ** 2;
  }
  if (sxx === 0) throw new Error('Todas las muestras tienen la misma altura');
  const pendiente = sxy / sxx;
  const interseccion = mediaY - pendiente * mediaX;
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { pendiente, interseccion, datum, r2 };
}

/**
 * Transforma una altura medida en biomasa con la curva del recurso
 * (Guía Anexo 1, "Usando la curva en el monitoreo"). El resultado se
 * acota a ≥ 0 (la recta puede dar negativo con alturas muy bajas).
 */
export function alturaABiomasaKgMSHa(alturaCm: number, curva: CurvaCalibracion): number {
  return Math.max(0, curva.interseccion + curva.pendiente * alturaCm);
}

/**
 * Promedio de las lecturas de altura de un potrero o punto de medición.
 * Las lecturas sobre maleza o suelo desnudo se registran como CERO y
 * entran al promedio (Guía Anexo 1, nota del monitoreo).
 */
export function promedioAlturasCm(lecturas: number[]): number {
  if (lecturas.length === 0) throw new Error('Sin lecturas de altura');
  return lecturas.reduce((a, b) => a + b, 0) / lecturas.length;
}

/**
 * Porcentaje de materia seca por recurso y estación, región pampeana
 * (Guía Anexo 1, tabla del laboratorio de INTA Balcarce). Valores como
 * proporción [mín, máx]; null = sin dato en la fuente.
 */
export const PROPORCION_MS: Record<
  string,
  { otono: [number, number] | null; invierno: [number, number] | null; primavera: [number, number] | null; verano: [number, number] | null }
> = {
  alfalfa: { otono: [0.18, 0.2], invierno: [0.18, 0.2], primavera: [0.2, 0.24], verano: [0.2, 0.26] },
  festuca_alta: { otono: [0.17, 0.2], invierno: [0.18, 0.2], primavera: [0.2, 0.24], verano: [0.2, 0.24] },
  raigras_anual: { otono: [0.13, 0.18], invierno: [0.13, 0.18], primavera: [0.18, 0.24], verano: null },
  avena: { otono: [0.14, 0.18], invierno: [0.15, 0.18], primavera: [0.2, 0.24], verano: null },
  sorgo_forrajero: { otono: [0.2, 0.24], invierno: null, primavera: null, verano: [0.2, 0.24] },
};

/**
 * Curva default de festuca del sudeste bonaerense (Guía Anexo 1, ejemplo;
 * mismos datos que la hoja Curva del Excel): kg MS/ha = −177 + 144 × cm.
 * Usar hasta reemplazarla por la curva calibrada propia del recurso.
 */
export const CURVA_FESTUCA_SUDESTE: CurvaCalibracion = {
  pendiente: 144,
  interseccion: -177,
  datum: 'ras_suelo',
  r2: 0.8623,
};
