/**
 * Demanda de forraje del rodeo.
 * Fuentes: Guía §3 (consumo objetivo) y Excel hojas Demanda / Info Base.
 */
import type { CategoriaRodeo } from './types.js';

/**
 * Coeficiente de consumo default: 3 % del peso vivo, trabajando con biomasa
 * neta (descontando remanente). La nota del Excel indica 6 % si se asigna
 * sobre biomasa total a ras del suelo sin descontar remanente (duda D2:
 * queda como parámetro configurable).
 */
export const COEF_CONSUMO_DEFAULT = 0.03;

/** Consumo objetivo por cabeza (kg MS/día) = peso vivo × coeficiente. */
export function consumoPorCabezaKgMS(pesoKg: number, coefConsumo = COEF_CONSUMO_DEFAULT): number {
  return pesoKg * coefConsumo;
}

/** Demanda del rodeo (kg MS/día) = Σ cabezas × consumo por cabeza. */
export function demandaRodeoKgMSDia(
  categorias: CategoriaRodeo[],
  coefConsumo = COEF_CONSUMO_DEFAULT,
): number {
  return categorias.reduce(
    (a, c) => a + c.cabezas * consumoPorCabezaKgMS(c.pesoKg, coefConsumo),
    0,
  );
}

/**
 * Demanda proyectada a `dias` días: el peso de cada categoría crece con su
 * aumento diario y el consumo se recalcula sobre el peso proyectado.
 *
 * Nota: el Excel (Info Base cols. J–O) suma el aumento de peso del período
 * directamente como kg MS de consumo del rodeo, sin pasar por el coeficiente
 * ni las cabezas; se detectó como inconsistencia dimensional (duda D13) y
 * acá se implementa la versión consistente: consumo = (peso + aumento × días)
 * × coeficiente × cabezas.
 */
export function demandaProyectadaKgMSDia(
  categorias: CategoriaRodeo[],
  dias: number,
  coefConsumo = COEF_CONSUMO_DEFAULT,
): number {
  return categorias.reduce((a, c) => {
    const pesoProyectado = c.pesoKg + (c.aumentoDiarioKg ?? 0) * dias;
    return a + c.cabezas * consumoPorCabezaKgMS(pesoProyectado, coefConsumo);
  }, 0);
}
