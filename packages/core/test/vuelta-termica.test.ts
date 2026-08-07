/**
 * Validación contra Excel "Info Base" (vuelta térmica mensual, Tandil) y
 * fuente D (estado foliar operativo, festuca).
 */
import { describe, expect, it } from 'vitest';
import {
  diasHastaEstadoOptimo,
  gradosDiaDiarios,
  hojasObjetivoFestuca,
  PARAMETROS_ESPECIE,
  vueltaTermicaDias,
} from '../src/index.js';

// Parámetros del Excel: festuca VMF 500 / Tbase 4; alfalfa VMF 350 / Tbase 3,5.
const FESTUCA = { vmf: 500, tBase: 4 };
const ALFALFA = { vmf: 350, tBase: 3.5 };

describe('Excel Info Base — vuelta por tiempo térmico (T medias de Tandil)', () => {
  const casos: { mes: string; tMedia: number; festuca: number; alfalfa: number }[] = [
    { mes: 'Ene', tMedia: 21, festuca: 29.4, alfalfa: 20.0 },
    { mes: 'Abr', tMedia: 14, festuca: 50.0, alfalfa: 33.3 },
    { mes: 'Jul', tMedia: 6, festuca: 250.0, alfalfa: 140.0 },
    { mes: 'Oct', tMedia: 13, festuca: 55.6, alfalfa: 36.8 },
  ];
  for (const c of casos) {
    it(`${c.mes} (T media ${c.tMedia} °C): festuca ${c.festuca} días, alfalfa ${c.alfalfa} días`, () => {
      expect(vueltaTermicaDias(FESTUCA.vmf, c.tMedia, FESTUCA.tBase)).toBeCloseTo(c.festuca, 1);
      expect(vueltaTermicaDias(ALFALFA.vmf, c.tMedia, ALFALFA.tBase)).toBeCloseTo(c.alfalfa, 1);
    });
  }

  it('temperatura media ≤ T base → vuelta indefinida (null), no infinita', () => {
    expect(vueltaTermicaDias(500, 4, 4)).toBeNull();
    expect(vueltaTermicaDias(500, 2, 4)).toBeNull();
    expect(gradosDiaDiarios(2, 4)).toBe(0);
  });
});

describe('Fuente D — estado foliar y VMF de festuca', () => {
  it('VMF de festuca 450–550 °Cd: el valor del Excel (500) está dentro del rango', () => {
    const f = PARAMETROS_ESPECIE['festuca']!;
    expect(FESTUCA.vmf).toBeGreaterThanOrEqual(f.vmfGD[0]);
    expect(FESTUCA.vmf).toBeLessThanOrEqual(f.vmfGD[1]);
  });

  it('ejemplo operativo: salió hace 15 días con estado 1,0 → faltan ~23 días para 2,5 hojas', () => {
    // El artículo: 15 días/hoja × 1,5 hojas = 23 días → armar la vuelta en 20–25 días.
    expect(diasHastaEstadoOptimo(15, 1.0, 2.5)).toBeCloseTo(22.5, 1);
  });

  it('hojas objetivo de festuca: 2,5 nov–jul y 1,5–1,7 ago–nov (control temprano de floración)', () => {
    expect(hojasObjetivoFestuca(12)).toBe(2.5);
    expect(hojasObjetivoFestuca(5)).toBe(2.5);
    expect(hojasObjetivoFestuca(9)).toBeGreaterThanOrEqual(1.5);
    expect(hojasObjetivoFestuca(9)).toBeLessThanOrEqual(1.7);
  });
});
