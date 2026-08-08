/**
 * Campo piloto: Loma Alta (Excel · Info Base, tabla de lotes), servido desde
 * el paquete compartido @pasto/campo-demo (misma fuente que el servidor y el
 * dashboard). Puntos de medición: 1 cada ~5 ha de superficie ganadera
 * (minuta), fijos.
 */
import campoJson from '@pasto/campo-demo/loma-alta.json';
import { db, type PotreroLocal, type PuntoLocal, type RecursoLocal, type RodeoLocal } from './db.js';

interface CampoDemo {
  campo: string;
  recursos: RecursoLocal[];
  potreros: PotreroLocal[];
  rodeo: RodeoLocal;
}

const CAMPO = campoJson as unknown as CampoDemo;

export const RECURSOS_LOMA_ALTA: RecursoLocal[] = CAMPO.recursos;
export const POTREROS_LOMA_ALTA: PotreroLocal[] = CAMPO.potreros;
export const RODEO_LOMA_ALTA: RodeoLocal = CAMPO.rodeo;

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

/** Carga Loma Alta en la base local si todavía no está. */
export async function sembrarSiHaceFalta(): Promise<void> {
  const hay = await db.potreros.count();
  if (hay > 0) return;
  await db.transaction('rw', [db.recursos, db.potreros, db.puntos, db.rodeos, db.meta], async () => {
    await db.recursos.bulkPut(RECURSOS_LOMA_ALTA);
    await db.potreros.bulkPut(POTREROS_LOMA_ALTA);
    await db.puntos.bulkPut(generarPuntos(POTREROS_LOMA_ALTA));
    await db.rodeos.put(RODEO_LOMA_ALTA);
    await db.meta.put({ clave: 'campo', valor: CAMPO.campo });
  });
}
