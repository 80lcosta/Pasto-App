/**
 * Stock de pasto y stock objetivo.
 * Fuentes: Guía INTA §2.1 y §3; método de 5 pasos (fuente A).
 */

export interface PotreroConBiomasa {
  superficieHa: number;
  biomasaKgMSHa: number;
}

/**
 * Stock de pasto de la plataforma = promedio de biomasa de toda la superficie
 * bajo pastoreo, incluido el potrero en pastoreo (Guía §2.1 y §3.1).
 *
 * `ponderado: true` (default) pondera por superficie — coherente con la
 * definición de "promedio de biomasa de toda la superficie" para potreros de
 * tamaño dispar. `ponderado: false` reproduce el promedio simple del ejemplo
 * de la Guía y del Excel (duda D6, pendiente de confirmación).
 */
export function stockPromedioKgMSHa(
  potreros: PotreroConBiomasa[],
  opciones: { ponderado?: boolean } = {},
): number {
  if (potreros.length === 0) throw new Error('Sin potreros');
  const ponderado = opciones.ponderado ?? true;
  if (!ponderado) {
    return potreros.reduce((a, p) => a + p.biomasaKgMSHa, 0) / potreros.length;
  }
  const ha = potreros.reduce((a, p) => a + p.superficieHa, 0);
  if (ha === 0) throw new Error('Superficie total nula');
  return potreros.reduce((a, p) => a + p.biomasaKgMSHa * p.superficieHa, 0) / ha;
}

/**
 * Método de 5 pasos (fuente A) — pasos 4 y 5 para un recurso en una estación:
 * biomasa de entrada = TC × vuelta (paso 4; sin sumar remanente — duda D3);
 * stock objetivo del recurso = (entrada + remanente) / 2 (paso 5).
 * Valores expresados > 5 cm en la fuente.
 */
export function stockObjetivoRecurso(parametros: {
  vueltaDias: number;
  tasaCrecimientoKgMSHaDia: number;
  remanenteKgMSHa: number;
}): { entradaKgMSHa: number; stockObjetivoKgMSHa: number } {
  const entrada = parametros.tasaCrecimientoKgMSHaDia * parametros.vueltaDias;
  return {
    entradaKgMSHa: entrada,
    stockObjetivoKgMSHa: (entrada + parametros.remanenteKgMSHa) / 2,
  };
}

/**
 * Stock objetivo del módulo: promedio de los stocks por recurso ponderado por
 * superficie, sobre la superficie total de la plataforma (fuente A, paso 5).
 * `superficieTotalHa` permite usar como base la superficie anual completa
 * (los recursos ausentes en la estación aportan 0), que es lo que reproduce
 * el valor DEF de la tabla del artículo. Duda D4 pendiente para MAM/JJA/SON.
 */
export function stockObjetivoModulo(
  recursos: { stockObjetivoKgMSHa: number; superficieHa: number }[],
  superficieTotalHa?: number,
): number {
  const base = superficieTotalHa ?? recursos.reduce((a, r) => a + r.superficieHa, 0);
  if (base === 0) throw new Error('Superficie total nula');
  return recursos.reduce((a, r) => a + r.stockObjetivoKgMSHa * r.superficieHa, 0) / base;
}
