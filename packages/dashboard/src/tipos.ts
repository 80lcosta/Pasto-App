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

export interface Campo {
  campo: string;
  targets: TargetsPlataforma;
  recursos: Recurso[];
  potreros: Potrero[];
  rodeo: Rodeo;
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
