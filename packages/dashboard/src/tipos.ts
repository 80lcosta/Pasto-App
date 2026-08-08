/**
 * Tipos del dashboard: lo que devuelve la API de desarrollo y lo que el
 * técnico consume en pantalla.
 */
import type { CategoriaRodeo, CurvaCalibracion, Datum, TargetsPlataforma } from '@pasto/core';

export interface Recurso {
  id: string;
  nombre: string;
  curva: CurvaCalibracion;
  notaCurva?: string;
}

export interface Potrero {
  id: string;
  /** Límites del potrero en GeoJSON, si se cargaron desde un KML. */
  geometria?: import('@pasto/core').GeometriaGeoJson;
  orden: number;
  nombre: string;
  superficieHa: number;
  supGanaderaHa: number;
  recursoId: string;
  descripcionRecurso: string;
}

export interface Rodeo {
  id: string;
  nombre: string;
  categorias: CategoriaRodeo[];
}

export interface Punto {
  id: string;
  potreroId: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface Campo {
  campoId: string;
  campo: string;
  targets: TargetsPlataforma;
  recursos: Recurso[];
  potreros: Potrero[];
  puntos?: Punto[];
  rodeo: Rodeo;
}

export interface Usuario {
  id: string;
  nombre: string;
  email?: string;
  rol: 'medidor' | 'tecnico' | 'cliente';
}

export interface Auditoria {
  cuando: string;
  usuario: string | null;
  rol: string | null;
  accion: string;
  entidad: string | null;
  entidadId: string | null;
  detalle: Record<string, unknown> | null;
}

export interface Medicion {
  id: string;
  puntoId: string;
  potreroId: string;
  fechaHora: string;
  lecturasCm: number[];
  alturaPromedioCm: number;
  kgMSHa: number;
  curva: CurvaCalibracion & { datum: Datum };
  usuario: string;
  observaciones?: string;
  /** Momento en que el servidor la recibió (puede diferir de la medición). */
  recibidaEn?: string;
}

export interface Evento {
  id: string;
  tipo: 'entrada' | 'salida';
  potreroId: string;
  rodeoId: string;
  fechaHora: string;
  alturaCm?: number;
  observaciones?: string;
  usuario: string;
}

export interface Recomendacion {
  id: string;
  fechaHora: string;
  autor: string;
  texto: string;
  /** Contexto de la recorrida en la que se emitió (auditoría). */
  datos?: {
    fechaRecorrida: string;
    stockKgMSHa: number;
    tasaPonderadaKgMSHaDia: number;
    balanceKgMSDia: number;
  };
}
