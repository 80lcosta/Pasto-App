/**
 * Tasa de crecimiento y "pasto para comer por día".
 * Fuente: Guía INTA §3.1–3.2 (idéntico a Excel hoja Oferta).
 */
import type { PotreroMedido } from './types.js';

export interface CrecimientoPotrero {
  nombre: string;
  superficieHa: number;
  /** kg MS/ha/día; null si el potrero está en pastoreo (no se calcula, Guía §3.1). */
  tasaCrecimientoKgMSHaDia: number | null;
  /** kg MS/día del potrero = TC × superficie; null si no se calcula TC. */
  biomasaTotalKgMSDia: number | null;
}

export interface ResumenCrecimiento {
  porPotrero: CrecimientoPotrero[];
  /** Σ de la biomasa producida por día en los potreros con TC calculada. */
  biomasaTotalKgMSDia: number;
  /** Hectáreas de los potreros NO pastoreados (con TC calculada). */
  haNoPastoreadas: number;
  /** Hectáreas de toda la plataforma en rotación (incluye el potrero en pastoreo, excluye cerrados). */
  haPlataforma: number;
  /** TC ponderada = biomasa total / ha no pastoreadas (Guía §3.1). */
  tasaPonderadaKgMSHaDia: number;
  /** Pasto para comer por día = TC ponderada × ha de toda la plataforma (Guía §3.1). */
  pastoPorDiaKgMS: number;
}

/**
 * TC (kg MS/ha/día) = (biomasa fecha₂ − biomasa fecha₁) / días entre mediciones.
 * Guía §3.1; Excel hoja Oferta col. F.
 */
export function tasaCrecimiento(
  biomasaAnteriorKgMSHa: number,
  biomasaActualKgMSHa: number,
  diasEntreMediciones: number,
): number {
  if (diasEntreMediciones <= 0) throw new Error('Los días entre mediciones deben ser > 0');
  return (biomasaActualKgMSHa - biomasaAnteriorKgMSHa) / diasEntreMediciones;
}

/**
 * Resumen de crecimiento de la plataforma para una recorrida (Guía §3.1–3.2).
 * Los potreros cerrados para reservas quedan fuera de la rotación: no aportan
 * crecimiento "para comer" ni superficie de plataforma.
 */
export function resumenCrecimiento(
  potreros: PotreroMedido[],
  diasEntreMediciones: number,
): ResumenCrecimiento {
  const activos = potreros.filter((p) => !p.cerrado);
  const porPotrero: CrecimientoPotrero[] = activos.map((p) => {
    if (p.enPastoreo) {
      return {
        nombre: p.nombre,
        superficieHa: p.superficieHa,
        tasaCrecimientoKgMSHaDia: null,
        biomasaTotalKgMSDia: null,
      };
    }
    const tc = tasaCrecimiento(p.biomasaAnteriorKgMSHa, p.biomasaActualKgMSHa, diasEntreMediciones);
    return {
      nombre: p.nombre,
      superficieHa: p.superficieHa,
      tasaCrecimientoKgMSHaDia: tc,
      biomasaTotalKgMSDia: tc * p.superficieHa,
    };
  });

  const conTC = porPotrero.filter((p) => p.biomasaTotalKgMSDia !== null);
  const biomasaTotal = conTC.reduce((a, p) => a + (p.biomasaTotalKgMSDia ?? 0), 0);
  const haNoPastoreadas = conTC.reduce((a, p) => a + p.superficieHa, 0);
  const haPlataforma = activos.reduce((a, p) => a + p.superficieHa, 0);
  if (haNoPastoreadas === 0) throw new Error('No hay potreros con tasa de crecimiento calculable');
  const tasaPonderada = biomasaTotal / haNoPastoreadas;
  return {
    porPotrero,
    biomasaTotalKgMSDia: biomasaTotal,
    haNoPastoreadas,
    haPlataforma,
    tasaPonderadaKgMSHaDia: tasaPonderada,
    pastoPorDiaKgMS: tasaPonderada * haPlataforma,
  };
}
