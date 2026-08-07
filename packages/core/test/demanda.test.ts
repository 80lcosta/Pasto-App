/**
 * Validación de la demanda contra la Guía §3 y el Excel (Info Base, Tabla1).
 */
import { describe, expect, it } from 'vitest';
import {
  consumoPorCabezaKgMS,
  demandaProyectadaKgMSDia,
  demandaRodeoKgMSDia,
  type CategoriaRodeo,
} from '../src/index.js';

describe('Demanda — Guía §3', () => {
  it('consumo objetivo: 250 kg × 3 % = 7,5 kg MS/animal/día; 685 animales → 5.137 kg MS/día', () => {
    expect(consumoPorCabezaKgMS(250)).toBeCloseTo(7.5, 5);
    expect(demandaRodeoKgMSDia([{ cabezas: 685, pesoKg: 250 }])).toBeCloseTo(5137.5, 1);
  });
});

describe('Demanda — Excel Info Base (categorías de Loma Alta)', () => {
  const categorias: CategoriaRodeo[] = [
    { nombre: 'Vaca Preñada H', cabezas: 66, pesoKg: 475 },
    { nombre: 'Vaquillona H', cabezas: 25, pesoKg: 380 },
    { nombre: 'Vaquillona AA', cabezas: 64, pesoKg: 350 },
    { nombre: 'Terneras', cabezas: 60, pesoKg: 220 },
    { nombre: 'Vaquillonas', cabezas: 52, pesoKg: 265 },
    { nombre: 'Vaquillonas AA', cabezas: 79, pesoKg: 265 },
    { nombre: 'Toro AA', cabezas: 3, pesoKg: 800 },
    { nombre: 'Toro H', cabezas: 1, pesoKg: 800 },
    { nombre: 'Toro Descarte', cabezas: 2, pesoKg: 600 },
    { nombre: 'Vacas Vacías', cabezas: 9, pesoKg: 450 },
    { nombre: 'Caballos', cabezas: 12, pesoKg: 500 },
  ];

  it('consumo por categoría: Vaca Preñada H = 66 × (475 × 3 %) = 940,5 kg MS/día (Excel F72)', () => {
    expect(demandaRodeoKgMSDia([categorias[0]!])).toBeCloseTo(940.5, 1);
  });

  it('total por categorías sin superposiciones = 3.768,45 kg MS/día', () => {
    // El total del Excel (J81 = 5.576,4) suma agrupaciones de rodeos que
    // repiten categorías (F73 y F74 comparten "Vaquillona AA", etc.), por lo
    // que cuenta dos veces varias categorías (duda D14 en el documento de
    // validación). El motor suma cada categoría una sola vez.
    expect(demandaRodeoKgMSDia(categorias)).toBeCloseTo(3768.45, 1);
  });

  it('proyección con aumento de peso: el consumo crece vía peso × coeficiente (duda D13)', () => {
    const recria: CategoriaRodeo[] = [{ cabezas: 25, pesoKg: 380, aumentoDiarioKg: 0.5 }];
    // Hoy: 25 × 380 × 3 % = 285. A 15 días: 25 × 387,5 × 3 % = 290,6.
    expect(demandaRodeoKgMSDia(recria)).toBeCloseTo(285, 1);
    expect(demandaProyectadaKgMSDia(recria, 15)).toBeCloseTo(290.6, 1);
    // (El Excel suma 0,5 kg × 15 días = 7,5 "kg MS" directo al rodeo: 292,5 —
    // inconsistencia dimensional detectada, a confirmar con BioM.)
  });

  it('sin aumento diario la proyección es constante', () => {
    const vacas: CategoriaRodeo[] = [{ cabezas: 66, pesoKg: 475 }];
    expect(demandaProyectadaKgMSDia(vacas, 30)).toBeCloseTo(demandaRodeoKgMSDia(vacas), 5);
  });
});
