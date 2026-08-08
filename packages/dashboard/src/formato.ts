export const kg = (v: number): string => Math.round(v).toLocaleString('es-AR');

export const dec = (v: number, decimales = 1): string =>
  v.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export const pct = (v: number): string => `${Math.round(v * 100)} %`;

export const fecha = (iso: string): string =>
  new Date(`${iso.slice(0, 10)}T12:00:00.000Z`).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
  });

export const ROTULO_ESTADO: Record<string, string> = {
  en_pastoreo: 'En pastoreo',
  listo: 'Listo para entrar',
  pasado: 'Pasado',
  en_descanso: 'En descanso',
  sin_datos: 'Sin datos',
};
