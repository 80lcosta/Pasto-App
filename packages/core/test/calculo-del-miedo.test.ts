/**
 * Validación contra fuente E (Tuñón & Berone, Visión Rural Nº 143):
 * "El cálculo del miedo" — Tabla 1 completa (septiembre, octubre, noviembre).
 */
import { describe, expect, it } from 'vitest';
import { calculoDelMiedo } from '../src/index.js';

describe('Fuente E — cálculo del miedo (Tabla 1)', () => {
  it('septiembre: cerrar 21 % ≈ 52 ha; 10,0 ha/día sin cierre, 7,9 con cierre', () => {
    const r = calculoDelMiedo({
      superficieHa: 250,
      animales: 350,
      consumoPorAnimalKgMS: 14.1,
      tasaCrecimientoKgMSHaDia: 25,
      vueltaDias: 25,
    });
    expect(r.cargaAnimalesHa).toBeCloseTo(1.4, 1);            // C
    expect(r.consumoPorHaKgMSDia).toBeCloseTo(19.7, 1);       // E (publicado 20)
    expect(r.proporcionSuperficieNecesaria).toBeCloseTo(0.79, 2); // G 79 %
    expect(r.proporcionACerrar).toBeCloseTo(0.21, 2);         // H 21 %
    expect(r.hectareasACerrar).toBeCloseTo(52.6, 0);          // I (publicado 52)
    expect(r.haPorDiaSinCierre).toBeCloseTo(10.0, 1);         // K
    expect(r.haPorDiaConCierre).toBeCloseTo(7.9, 1);          // L
  });

  it('octubre: cerrar 39 % ≈ 97 ha; 12,5 ha/día sin cierre, 7,7 con cierre', () => {
    const r = calculoDelMiedo({
      superficieHa: 250,
      animales: 380,
      consumoPorAnimalKgMS: 14.1,
      tasaCrecimientoKgMSHaDia: 35,
      vueltaDias: 20,
    });
    expect(r.cargaAnimalesHa).toBeCloseTo(1.52, 2);
    expect(r.consumoPorHaKgMSDia).toBeCloseTo(21.4, 1);       // publicado 21
    expect(r.proporcionACerrar).toBeCloseTo(0.39, 2);
    expect(r.hectareasACerrar).toBeCloseTo(96.9, 0);          // publicado 97
    expect(r.haPorDiaSinCierre).toBeCloseTo(12.5, 1);
    expect(r.haPorDiaConCierre).toBeCloseTo(7.7, 1);
  });

  it('noviembre: cerrar 30 % ≈ 51 ha; 8,5 ha/día sin cierre, 6,0 con cierre', () => {
    const r = calculoDelMiedo({
      superficieHa: 170,
      animales: 380,
      consumoPorAnimalKgMS: 14.1,
      tasaCrecimientoKgMSHaDia: 45,
      vueltaDias: 20,
    });
    expect(r.cargaAnimalesHa).toBeCloseTo(2.24, 2);
    expect(r.consumoPorHaKgMSDia).toBeCloseTo(31.5, 1);       // publicado 32
    expect(r.proporcionACerrar).toBeCloseTo(0.3, 2);
    expect(r.hectareasACerrar).toBeCloseTo(51, 0);
    expect(r.haPorDiaSinCierre).toBeCloseTo(8.5, 1);
    expect(r.haPorDiaConCierre).toBeCloseTo(6.0, 1);
  });

  it('si la demanda supera la oferta no se cierra nada (proporción 0)', () => {
    const r = calculoDelMiedo({
      superficieHa: 100,
      animales: 300,
      consumoPorAnimalKgMS: 14,
      tasaCrecimientoKgMSHaDia: 20,
      vueltaDias: 30,
    });
    expect(r.proporcionACerrar).toBe(0);
    expect(r.hectareasACerrar).toBe(0);
    expect(r.haPorDiaConCierre).toBeCloseTo(r.haPorDiaSinCierre, 5);
  });
});
