/**
 * Balance oferta–demanda y decisiones de la recorrida.
 * Fuentes: Guía §3.1–3.2, Excel hojas Oferta / Info Base, fuente E (cálculo del miedo).
 */

/** Balance diario (kg MS/día) = pasto para comer por día − demanda (Guía §3.1). */
export function balanceDiarioKgMS(pastoPorDiaKgMS: number, demandaKgMSDia: number): number {
  return pastoPorDiaKgMS - demandaKgMSDia;
}

/**
 * Suplementación equivalente ante déficit (kg MS/animal/día) = déficit / cabezas.
 * Guía §3.1 (ej.: 3.178 / 685 = 4,6); Excel Oferta B18.
 */
export function suplementoPorAnimalKgMS(deficitKgMSDia: number, cabezas: number): number {
  if (cabezas <= 0) throw new Error('Cabezas debe ser > 0');
  return Math.abs(deficitKgMSDia) / cabezas;
}

/** Forraje consumible del potrero de entrada (kg MS/ha) = biomasa − remanente objetivo. */
export function consumibleKgMSHa(biomasaKgMSHa: number, remanenteKgMSHa: number): number {
  const c = biomasaKgMSHa - remanenteKgMSHa;
  if (c <= 0) throw new Error('El potrero no tiene forraje consumible por encima del remanente objetivo');
  return c;
}

/**
 * Superficie diaria a asignar para comer el crecimiento (ha/día) =
 * pasto para comer por día / consumible del potrero de entrada.
 * Guía §3.1–3.2 (ej.: 1.959/970 = 2,0; 6.809/900 = 7,6); Excel Oferta B14.
 */
export function superficieDiariaPorCrecimientoHa(
  pastoPorDiaKgMS: number,
  biomasaEntradaKgMSHa: number,
  remanenteKgMSHa: number,
): number {
  return pastoPorDiaKgMS / consumibleKgMSHa(biomasaEntradaKgMSHa, remanenteKgMSHa);
}

/**
 * Superficie diaria ajustada al consumo cuando sobra pasto (ha/día) =
 * demanda / consumible. Guía §3.2 (ej.: 5.137/900 = 5,7); Excel Oferta (2) B20.
 */
export function superficieDiariaPorConsumoHa(
  demandaKgMSDia: number,
  biomasaEntradaKgMSHa: number,
  remanenteKgMSHa: number,
): number {
  return demandaKgMSDia / consumibleKgMSHa(biomasaEntradaKgMSHa, remanenteKgMSHa);
}

/**
 * Proporción de la superficie que se puede cerrar para reservas =
 * 1 − (demanda / crecimiento), acotada a [0, 1].
 * Guía §3.2 (ej.: 1 − 5.137/6.809 = 25 %); Excel Oferta (2) B21 e Info Base B104.
 */
export function proporcionACerrar(demandaKgMSDia: number, crecimientoKgMSDia: number): number {
  if (crecimientoKgMSDia <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - demandaKgMSDia / crecimientoKgMSDia));
}

/** Hectáreas a cerrar para reservas = proporción × superficie de la plataforma. */
export function hectareasACerrar(
  demandaKgMSDia: number,
  crecimientoKgMSDia: number,
  superficieHa: number,
): number {
  return proporcionACerrar(demandaKgMSDia, crecimientoKgMSDia) * superficieHa;
}

/**
 * Vuelta de pastoreo resultante (días) = superficie de la plataforma / (ha/día).
 * En el manejo por stock la vuelta es un RESULTADO, no una variable de manejo
 * (Guía §3.1, ej.: 137 / 2,0 = 68 días). Excel Info Base A87:G89 usa la inversa.
 */
export function vueltaResultanteDias(superficieHa: number, haPorDia: number): number {
  if (haPorDia <= 0) throw new Error('ha/día debe ser > 0');
  return superficieHa / haPorDia;
}

/** Tiempo de ocupación máximo recomendado por parcela (días). */
export function ocupacionMaximaDias(mes: number): number {
  if (mes < 1 || mes > 12) throw new Error('Mes inválido');
  // Primavera–verano: parcela diaria o ≤ 3–4 días; otoño–invierno: ≤ 7 días
  // (Guía §3.1–3.2; alfalfa 3–5 días, fuente B).
  const primaveraVerano = mes >= 9 || mes <= 2;
  return primaveraVerano ? 4 : 7;
}

/** Entrada del "cálculo del miedo" (fuente E, Tabla 1). */
export interface EntradaMiedo {
  /** A — superficie en pastoreo del mes (ha). */
  superficieHa: number;
  /** B — animales pastoreando. */
  animales: number;
  /** D — consumo esperado por animal (kg MS/día). */
  consumoPorAnimalKgMS: number;
  /** F — tasa de crecimiento esperada (kg MS/ha/día). */
  tasaCrecimientoKgMSHaDia: number;
  /** J — vuelta de pastoreo del mes (días). */
  vueltaDias: number;
}

/** Resultado del "cálculo del miedo" con las filas A–L de la fuente E. */
export interface ResultadoMiedo {
  cargaAnimalesHa: number;              // C = B/A
  consumoPorHaKgMSDia: number;          // E = C × D
  proporcionSuperficieNecesaria: number; // G = E/F
  proporcionACerrar: number;            // H = 1 − G
  hectareasACerrar: number;             // I = H × A
  haPorDiaSinCierre: number;            // K = A/J
  haPorDiaConCierre: number;            // L = (A − I)/J
}

/**
 * "Cálculo del miedo" (fuente E): cuánta superficie cerrar para reservas antes
 * de que el pasto de primavera se dispare. Formaliza Excel Info Base B104:B105.
 */
export function calculoDelMiedo(e: EntradaMiedo): ResultadoMiedo {
  if (e.superficieHa <= 0) throw new Error('Superficie debe ser > 0');
  if (e.tasaCrecimientoKgMSHaDia <= 0) throw new Error('La tasa de crecimiento debe ser > 0');
  const carga = e.animales / e.superficieHa;
  const consumoPorHa = carga * e.consumoPorAnimalKgMS;
  const propNecesaria = Math.min(1, consumoPorHa / e.tasaCrecimientoKgMSHaDia);
  const propCerrar = 1 - propNecesaria;
  const haCerrar = propCerrar * e.superficieHa;
  return {
    cargaAnimalesHa: carga,
    consumoPorHaKgMSDia: consumoPorHa,
    proporcionSuperficieNecesaria: propNecesaria,
    proporcionACerrar: propCerrar,
    hectareasACerrar: haCerrar,
    haPorDiaSinCierre: e.superficieHa / e.vueltaDias,
    haPorDiaConCierre: (e.superficieHa - haCerrar) / e.vueltaDias,
  };
}
