const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Los formateadores toleran datos faltantes: muestran "—", nunca "NaN". */
export const kg = (v: number | undefined | null): string =>
  esNumero(v) ? Math.round(v).toLocaleString('es-AR') : '—';

export const dec = (v: number | undefined | null, decimales = 1): string =>
  esNumero(v)
    ? v.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    : '—';

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
