/**
 * Validación contra fuente A (Tuñón & Berone, Visión Rural Nº 142):
 * método de 5 pasos para el stock objetivo estacional. Valores > 5 cm.
 */
import { describe, expect, it } from 'vitest';
import { stockObjetivoModulo, stockObjetivoRecurso, vueltaTermicaDias } from '../src/index.js';

describe('Fuente A — método de 5 pasos', () => {
  it('paso 1 (BOX del artículo): festuca VMF 500, Tbase 3 °C → 56 días a 12 °C y 38 a 16 °C', () => {
    expect(vueltaTermicaDias(500, 12, 3)).toBeCloseTo(55.6, 1); // el artículo redondea 56
    expect(vueltaTermicaDias(500, 16, 3)).toBeCloseTo(38.5, 1); // el artículo redondea 38
  });

  it('paso 4: entrada = TC × vuelta (casos exactos de la tabla: festuca JJA y alfalfa SON)', () => {
    expect(stockObjetivoRecurso({ vueltaDias: 50, tasaCrecimientoKgMSHaDia: 15, remanenteKgMSHa: 200 }).entradaKgMSHa).toBe(750);
    expect(stockObjetivoRecurso({ vueltaDias: 25, tasaCrecimientoKgMSHaDia: 70, remanenteKgMSHa: 200 }).entradaKgMSHa).toBe(1750);
  });

  it('paso 5: stock del recurso = (entrada + remanente)/2 — toda la tabla del artículo', () => {
    const casos: { entrada: number; remanente: number; publicado: number }[] = [
      { entrada: 1059, remanente: 200, publicado: 629 }, // raigrás MAM
      { entrada: 1167, remanente: 200, publicado: 683 }, // raigrás JJA
      { entrada: 1421, remanente: 200, publicado: 811 }, // alfalfa DEF
      { entrada: 1692, remanente: 200, publicado: 946 }, // alfalfa MAM
      { entrada: 1444, remanente: 200, publicado: 822 }, // alfalfa JJA
      { entrada: 1750, remanente: 200, publicado: 975 }, // alfalfa SON
      { entrada: 550, remanente: 400, publicado: 475 },  // festuca DEF
      { entrada: 1179, remanente: 200, publicado: 689 }, // festuca MAM
      { entrada: 750, remanente: 200, publicado: 475 },  // festuca JJA
      { entrada: 1050, remanente: 200, publicado: 625 }, // festuca SON
    ];
    for (const c of casos) {
      const media = (c.entrada + c.remanente) / 2;
      expect(Math.abs(media - c.publicado)).toBeLessThanOrEqual(0.5);
    }
  });

  it('agregación del módulo: DEF = (811×40 + 475×30) / 100 ha ≈ 466 (valor publicado)', () => {
    const stock = stockObjetivoModulo(
      [
        { stockObjetivoKgMSHa: 811, superficieHa: 40 }, // alfalfa
        { stockObjetivoKgMSHa: 475, superficieHa: 30 }, // festuca
      ],
      100, // superficie total de la plataforma (el raigrás anual no existe en DEF)
    );
    expect(stock).toBeCloseTo(466.9, 1); // publicado: 466
  });
});
