/**
 * Integridad del campo piloto Loma Alta (Excel · Info Base, tabla de lotes).
 */
import { describe, expect, it } from 'vitest';
import { cantidadPuntos, generarPuntos, POTREROS_LOMA_ALTA, RECURSOS_LOMA_ALTA, RODEO_LOMA_ALTA } from '../src/seed.js';

describe('Seed Loma Alta', () => {
  it('superficie ganadera total = 146 ha (Excel C68)', () => {
    const total = POTREROS_LOMA_ALTA.reduce((a, p) => a + p.supGanaderaHa, 0);
    expect(total).toBe(146);
  });

  it('superficie física total = 161 ha (Excel B88: suma de lotes)', () => {
    const total = POTREROS_LOMA_ALTA.reduce((a, p) => a + p.superficieHa, 0);
    expect(total).toBe(161);
  });

  it('1 punto cada ~5 ha de superficie ganadera, mínimo 2 (minuta)', () => {
    expect(cantidadPuntos(30)).toBe(6);
    expect(cantidadPuntos(15)).toBe(3);
    expect(cantidadPuntos(6)).toBe(2); // mínimo para tener curva propia
  });

  it('todos los puntos referencian potreros existentes y recursos válidos', () => {
    const puntos = generarPuntos(POTREROS_LOMA_ALTA);
    const idsPotreros = new Set(POTREROS_LOMA_ALTA.map((p) => p.id));
    const idsRecursos = new Set(RECURSOS_LOMA_ALTA.map((r) => r.id));
    expect(puntos.length).toBe(29);
    for (const punto of puntos) expect(idsPotreros.has(punto.potreroId)).toBe(true);
    for (const potrero of POTREROS_LOMA_ALTA) expect(idsRecursos.has(potrero.recursoId)).toBe(true);
  });

  it('el rodeo suma 373 cabezas (Excel C83) sin duplicar categorías', () => {
    const cabezas = RODEO_LOMA_ALTA.categorias.reduce((a, c) => a + c.cabezas, 0);
    expect(cabezas).toBe(373);
  });
});
