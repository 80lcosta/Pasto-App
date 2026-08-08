/**
 * Campo de demostración para mostrar la app sin servidor. Es el mismo Loma
 * Alta del paquete compartido, con los puntos de medición generados con la
 * regla de la minuta (1 cada ~5 ha de superficie ganadera, mínimo 2).
 */
import campoJson from '@pasto/campo-demo/loma-alta.json';
import type { PotreroLocal, PuntoLocal, RecursoLocal, RodeoLocal } from './db.js';

interface CampoDemo {
  campo: string;
  recursos: RecursoLocal[];
  potreros: PotreroLocal[];
  rodeo: RodeoLocal;
}

const CAMPO = campoJson as unknown as CampoDemo;

export const cantidadPuntos = (supGanaderaHa: number): number =>
  Math.max(2, Math.round(supGanaderaHa / 5));

export const campo = `${CAMPO.campo} (demostración)`;
export const recursos = CAMPO.recursos;
export const potreros = CAMPO.potreros;
export const rodeo = CAMPO.rodeo;

export const puntos: PuntoLocal[] = CAMPO.potreros.flatMap((p) =>
  Array.from({ length: cantidadPuntos(p.supGanaderaHa) }, (_, i) => ({
    id: `${p.id}-p${i + 1}`,
    potreroId: p.id,
    nombre: `Punto ${i + 1}`,
    orden: i + 1,
    activo: true,
  })),
);
