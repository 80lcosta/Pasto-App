/**
 * Base de datos local del medidor (IndexedDB vía Dexie).
 * Las mediciones y eventos se crean acá (offline) y son inmutables: la
 * sincronización es una cola de envío, no hay conflictos que resolver.
 */
import Dexie, { type EntityTable } from 'dexie';
import type { CategoriaRodeo, CurvaCalibracion } from '@pasto/core';

export interface PotreroLocal {
  id: string;
  nombre: string;
  /** Posición en el orden fijo de la recorrida (Guía §2.2). */
  orden: number;
  superficieHa: number;
  /** Superficie ganadera efectiva (puede ser menor, ej. verdeo compartido). */
  supGanaderaHa: number;
  recursoId: string;
  descripcionRecurso: string;
}

export interface RecursoLocal {
  id: string;
  nombre: string;
  curva: CurvaCalibracion;
  notaCurva?: string;
}

export interface PuntoLocal {
  id: string;
  potreroId: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface RodeoLocal {
  id: string;
  nombre: string;
  categorias: CategoriaRodeo[];
}

export type EstadoSync = 'pendiente' | 'enviado';

export interface GpsLocal {
  lat: number;
  lon: number;
  precisionM?: number;
}

export interface MedicionLocal {
  id: string;
  puntoId: string;
  potreroId: string;
  /** ISO 8601 local del momento de la medición. */
  fechaHora: string;
  lecturasCm: number[];
  alturaPromedioCm: number;
  kgMSHa: number;
  /** Curva usada para convertir, guardada con la medición (trazabilidad). */
  curva: CurvaCalibracion;
  usuario: string;
  estadoSync: EstadoSync;
  gps?: GpsLocal;
  observaciones?: string;
}

export type TipoEvento = 'entrada' | 'salida';

export interface EventoLocal {
  id: string;
  tipo: TipoEvento;
  potreroId: string;
  rodeoId: string;
  fechaHora: string;
  alturaCm?: number;
  observaciones?: string;
  usuario: string;
  estadoSync: EstadoSync;
}

export interface MetaLocal {
  clave: string;
  valor: string;
}

export const db = new Dexie('pasto-medidor') as Dexie & {
  potreros: EntityTable<PotreroLocal, 'id'>;
  recursos: EntityTable<RecursoLocal, 'id'>;
  puntos: EntityTable<PuntoLocal, 'id'>;
  rodeos: EntityTable<RodeoLocal, 'id'>;
  mediciones: EntityTable<MedicionLocal, 'id'>;
  eventos: EntityTable<EventoLocal, 'id'>;
  meta: EntityTable<MetaLocal, 'clave'>;
};

db.version(1).stores({
  potreros: 'id',
  recursos: 'id',
  puntos: 'id, potreroId',
  rodeos: 'id',
  mediciones: 'id, puntoId, potreroId, estadoSync, fechaHora',
  eventos: 'id, potreroId, estadoSync, fechaHora',
  meta: 'clave',
});

export async function leerMeta(clave: string, porDefecto = ''): Promise<string> {
  const fila = await db.meta.get(clave);
  return fila?.valor ?? porDefecto;
}

export async function escribirMeta(clave: string, valor: string): Promise<void> {
  await db.meta.put({ clave, valor });
}
