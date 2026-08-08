/**
 * Campo piloto: Loma Alta (Excel · Info Base, tabla de lotes).
 * Puntos de medición: 1 cada ~5 ha de superficie ganadera (minuta), fijos.
 * La curva es provisoria (festuca sudeste, Guía Anexo 1) hasta calibrar las
 * propias; para mezclas con alfalfa corresponde curva de alfalfa en oct–mar.
 */
import { CURVA_FESTUCA_SUDESTE } from '@pasto/core';
import { db, type PotreroLocal, type PuntoLocal, type RecursoLocal, type RodeoLocal } from './db.js';

const NOTA_CURVA_PROVISORIA =
  'Curva provisoria (festuca sudeste bonaerense, Guía INTA Anexo 1). Reemplazar por la curva calibrada del recurso; en mezclas con alfalfa usar curva de alfalfa entre octubre y marzo.';

export const RECURSOS_LOMA_ALTA: RecursoLocal[] = [
  { id: 'pastura-base-alfalfa', nombre: 'Pastura base alfalfa', curva: CURVA_FESTUCA_SUDESTE, notaCurva: NOTA_CURVA_PROVISORIA },
  { id: 'verdeo-invierno', nombre: 'Verdeo de invierno (avena y vicia)', curva: CURVA_FESTUCA_SUDESTE, notaCurva: NOTA_CURVA_PROVISORIA },
  { id: 'pasto-natural', nombre: 'Pasto natural', curva: CURVA_FESTUCA_SUDESTE, notaCurva: NOTA_CURVA_PROVISORIA },
];

export const POTREROS_LOMA_ALTA: PotreroLocal[] = [
  { id: 'pastura-1', orden: 1, nombre: 'Pastura 1 año', superficieHa: 30, supGanaderaHa: 30, recursoId: 'pastura-base-alfalfa', descripcionRecurso: 'Alfalfa, festuca mediterránea, cebadilla, pasto ovillo y trébol blanco' },
  { id: 'pastura-2', orden: 2, nombre: 'Pastura 2 años', superficieHa: 22, supGanaderaHa: 22, recursoId: 'pastura-base-alfalfa', descripcionRecurso: 'Alfalfa, festuca mediterránea, cebadilla, pasto ovillo y trébol blanco' },
  { id: 'pastura-3', orden: 3, nombre: 'Pastura 3 años', superficieHa: 30, supGanaderaHa: 30, recursoId: 'pastura-base-alfalfa', descripcionRecurso: 'Alfalfa, festuca mediterránea, cebadilla, pasto ovillo, achicoria y trébol blanco' },
  { id: 'pastura-4', orden: 4, nombre: 'Pastura 4 años', superficieHa: 24, supGanaderaHa: 24, recursoId: 'pastura-base-alfalfa', descripcionRecurso: 'Alfalfa, festuca mediterránea, festuca continental, trébol blanco' },
  { id: 'verdeo', orden: 5, nombre: 'Verdeo Invierno', superficieHa: 30, supGanaderaHa: 15, recursoId: 'verdeo-invierno', descripcionRecurso: 'Avena y vicia villosa' },
  { id: 'bulevard', orden: 6, nombre: 'Bulevard', superficieHa: 25, supGanaderaHa: 25, recursoId: 'pasto-natural', descripcionRecurso: 'Pasto natural' },
];

/** 1 punto cada ~5 ha de superficie ganadera, mínimo 2 por potrero (minuta). */
export function cantidadPuntos(supGanaderaHa: number): number {
  return Math.max(2, Math.round(supGanaderaHa / 5));
}

export function generarPuntos(potreros: PotreroLocal[]): PuntoLocal[] {
  const puntos: PuntoLocal[] = [];
  for (const p of potreros) {
    const n = cantidadPuntos(p.supGanaderaHa);
    for (let i = 1; i <= n; i++) {
      puntos.push({ id: `${p.id}-p${i}`, potreroId: p.id, nombre: `Punto ${i}`, orden: i, activo: true });
    }
  }
  return puntos;
}

/** Categorías del Excel (cada una una sola vez — ver duda D14). */
export const RODEO_LOMA_ALTA: RodeoLocal = {
  id: 'rodeo-general',
  nombre: 'Rodeo Loma Alta',
  categorias: [
    { nombre: 'Vaca Preñada H', cabezas: 66, pesoKg: 475 },
    { nombre: 'Vaquillona H', cabezas: 25, pesoKg: 380 },
    { nombre: 'Vaquillona AA', cabezas: 64, pesoKg: 350 },
    { nombre: 'Terneras', cabezas: 60, pesoKg: 220 },
    { nombre: 'Vaquillonas', cabezas: 52, pesoKg: 265 },
    { nombre: 'Vaquillonas AA', cabezas: 79, pesoKg: 265 },
    { nombre: 'Toro AA', cabezas: 3, pesoKg: 800 },
    { nombre: 'Toro H', cabezas: 1, pesoKg: 800 },
    { nombre: 'Toro Descarte', cabezas: 2, pesoKg: 600 },
    { nombre: 'Vacas Vacías', cabezas: 9, pesoKg: 450 },
    { nombre: 'Caballos', cabezas: 12, pesoKg: 500 },
  ],
};

/** Carga Loma Alta en la base local si todavía no está. */
export async function sembrarSiHaceFalta(): Promise<void> {
  const hay = await db.potreros.count();
  if (hay > 0) return;
  await db.transaction('rw', [db.recursos, db.potreros, db.puntos, db.rodeos, db.meta], async () => {
    await db.recursos.bulkPut(RECURSOS_LOMA_ALTA);
    await db.potreros.bulkPut(POTREROS_LOMA_ALTA);
    await db.puntos.bulkPut(generarPuntos(POTREROS_LOMA_ALTA));
    await db.rodeos.put(RODEO_LOMA_ALTA);
    await db.meta.put({ clave: 'campo', valor: 'Loma Alta' });
  });
}
