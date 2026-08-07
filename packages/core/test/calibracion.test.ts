/**
 * Validación contra Guía INTA Anexo 1 (calibración de la curva altura → kg MS/ha).
 * Mismos datos que Excel hoja "Curva".
 */
import { describe, expect, it } from 'vitest';
import {
  ajustarCurva,
  alturaABiomasaKgMSHa,
  biomasaDeMuestraKgMSHa,
  CURVA_FESTUCA_SUDESTE,
  promedioAlturasCm,
  type MuestraCalibracion,
} from '../src/index.js';

/** Las 10 muestras del ejemplo del Anexo 1 (festuca alta, sudeste bonaerense). */
const muestras: MuestraCalibracion[] = [
  { alturaCm: 4, pesoHumedoG: 70, proporcionMS: 0.2 },
  { alturaCm: 5, pesoHumedoG: 85, proporcionMS: 0.2 },
  { alturaCm: 15, pesoHumedoG: 130, proporcionMS: 0.2 },
  { alturaCm: 17, pesoHumedoG: 160, proporcionMS: 0.2 },
  { alturaCm: 22, pesoHumedoG: 160, proporcionMS: 0.2 },
  { alturaCm: 23, pesoHumedoG: 220, proporcionMS: 0.2 },
  { alturaCm: 30, pesoHumedoG: 350, proporcionMS: 0.2 },
  { alturaCm: 30, pesoHumedoG: 400, proporcionMS: 0.2 },
  { alturaCm: 40, pesoHumedoG: 350, proporcionMS: 0.2 },
  { alturaCm: 45, pesoHumedoG: 600, proporcionMS: 0.2 },
];

describe('Guía Anexo 1 — calibración', () => {
  it('muestra → kg MS/ha: 70 g × 20 % / 0,16 m² × 10 = 875 (la Guía redondea 880)', () => {
    expect(biomasaDeMuestraKgMSHa(muestras[0]!)).toBeCloseTo(875, 0);
    expect(biomasaDeMuestraKgMSHa(muestras[9]!)).toBeCloseTo(7500, 0);
    expect(biomasaDeMuestraKgMSHa(muestras[3]!)).toBeCloseTo(2000, 0);
  });

  it('regresión reproduce la curva publicada: y = 144,3x − 177,1 con R² 0,86', () => {
    const curva = ajustarCurva(muestras, 'ras_suelo');
    expect(curva.pendiente).toBeCloseTo(144.3, 0);
    expect(curva.interseccion).toBeCloseTo(-177.1, 0);
    expect(curva.r2 ?? 0).toBeCloseTo(0.862, 2);
  });

  it('uso de la curva en monitoreo: 13 cm → 1.695; 8 cm → 975; 17 cm → 2.271', () => {
    expect(alturaABiomasaKgMSHa(13, CURVA_FESTUCA_SUDESTE)).toBe(1695);
    expect(alturaABiomasaKgMSHa(8, CURVA_FESTUCA_SUDESTE)).toBe(975);
    expect(alturaABiomasaKgMSHa(17, CURVA_FESTUCA_SUDESTE)).toBe(2271);
  });

  it('altura por debajo del cero de la recta se acota a 0 kg MS/ha', () => {
    expect(alturaABiomasaKgMSHa(1, CURVA_FESTUCA_SUDESTE)).toBe(0);
  });

  it('promedio de alturas incluye los ceros de maleza/suelo desnudo', () => {
    expect(promedioAlturasCm([10, 12, 0, 14, 0])).toBeCloseTo(7.2, 5);
  });
});
