/**
 * Validación contra Guía INTA §3.1 — recorrida del 8 de junio (poca producción).
 * Mismos datos que Excel hoja "Oferta". La Guía redondea intermedios (14,3;
 * 1.959); acá se valida la fórmula exacta y que el resultado quede a menos de
 * 0,5 % del valor publicado.
 */
import { describe, expect, it } from 'vitest';
import {
  balanceDiarioKgMS,
  construirCuna,
  demandaRodeoKgMSDia,
  elegirPotreroEntrada,
  resumenCrecimiento,
  stockPromedioKgMSHa,
  suplementoPorAnimalKgMS,
  superficieDiariaPorCrecimientoHa,
  vueltaResultanteDias,
  type PotreroMedido,
  type TargetsPlataforma,
} from '../src/index.js';

const DIAS = 7;

const potreros: PotreroMedido[] = [
  { nombre: 'A', superficieHa: 24, biomasaAnteriorKgMSHa: 1800, biomasaActualKgMSHa: 1970 },
  { nombre: 'B', superficieHa: 20, biomasaAnteriorKgMSHa: 1070, biomasaActualKgMSHa: 1150 },
  { nombre: 'C', superficieHa: 22, biomasaAnteriorKgMSHa: 1600, biomasaActualKgMSHa: 1700 },
  { nombre: 'D', superficieHa: 25, biomasaAnteriorKgMSHa: 1450, biomasaActualKgMSHa: 1500 },
  { nombre: 'E', superficieHa: 22, biomasaAnteriorKgMSHa: 1200, biomasaActualKgMSHa: 1300 },
  { nombre: 'F', superficieHa: 24, biomasaAnteriorKgMSHa: 1750, biomasaActualKgMSHa: 1050, enPastoreo: true },
];

const targets: TargetsPlataforma = {
  stockKgMSHa: 1500,
  entradaKgMSHa: 2000,
  salidaKgMSHa: 1000,
  datum: 'ras_suelo',
};

describe('Guía §3.1 — 8 de junio (poca producción de forraje)', () => {
  const r = resumenCrecimiento(potreros, DIAS);

  it('tasas de crecimiento por potrero (tabla de la Guía)', () => {
    const tc = Object.fromEntries(r.porPotrero.map((p) => [p.nombre, p.tasaCrecimientoKgMSHaDia]));
    expect(tc['A']).toBeCloseTo(24.3, 1);
    expect(tc['B']).toBeCloseTo(11.4, 1);
    expect(tc['C']).toBeCloseTo(14.3, 1);
    expect(tc['D']).toBeCloseTo(7.1, 1);
    expect(tc['E']).toBeCloseTo(14.3, 1);
    expect(tc['F']).toBeNull(); // en pastoreo: no se calcula
  });

  it('biomasa total producida ≈ 1.619 kg MS/día', () => {
    expect(r.biomasaTotalKgMSDia).toBeCloseTo(1618.57, 1);
  });

  it('TC ponderada = biomasa total / 113 ha no pastoreadas ≈ 14,3', () => {
    expect(r.haNoPastoreadas).toBe(113);
    expect(r.tasaPonderadaKgMSHaDia).toBeCloseTo(14.32, 2);
  });

  it('pasto para comer por día = TC ponderada × 137 ha ≈ 1.959 kg MS/día', () => {
    expect(r.haPlataforma).toBe(137);
    // Guía publica 1.959 (redondea 14,3 × 137); fórmula exacta: 1.962,3
    expect(r.pastoPorDiaKgMS).toBeCloseTo(1962.34, 1);
    expect(Math.abs(r.pastoPorDiaKgMS - 1959) / 1959).toBeLessThan(0.005);
  });

  it('stock de pasto: 1.478 (1/6) y 1.445 (8/6) kg MS/ha — promedio simple de la Guía', () => {
    const stockAntes = stockPromedioKgMSHa(
      potreros.map((p) => ({ superficieHa: p.superficieHa, biomasaKgMSHa: p.biomasaAnteriorKgMSHa })),
      { ponderado: false },
    );
    const stockAhora = stockPromedioKgMSHa(
      potreros.map((p) => ({ superficieHa: p.superficieHa, biomasaKgMSHa: p.biomasaActualKgMSHa })),
      { ponderado: false },
    );
    expect(stockAntes).toBeCloseTo(1478.3, 1);
    expect(stockAhora).toBeCloseTo(1445, 0);
  });

  it('decisión 1: entrar al potrero A (1.970 ≈ target de entrada 2.000)', () => {
    const { elegido, pasados } = elegirPotreroEntrada(
      potreros.map((p) => ({
        nombre: p.nombre,
        superficieHa: p.superficieHa,
        biomasaKgMSHa: p.biomasaActualKgMSHa,
        enPastoreo: p.enPastoreo,
      })),
      targets.entradaKgMSHa,
    );
    expect(elegido?.nombre).toBe('A');
    expect(pasados).toHaveLength(0);
  });

  it('decisión 2: superficie diaria ≈ 2,0 ha/día (1.959 / (1.970 − 1.000))', () => {
    // Con el valor redondeado de la Guía:
    expect(superficieDiariaPorCrecimientoHa(1959, 1970, 1000)).toBeCloseTo(2.02, 2);
    // Con el valor exacto del motor:
    expect(superficieDiariaPorCrecimientoHa(r.pastoPorDiaKgMS, 1970, 1000)).toBeCloseTo(2.02, 2);
  });

  it('decisión 3: balance negativo ≈ −3.178 → suplementar 4,6 kg/animal/día o remover animales', () => {
    const demanda = demandaRodeoKgMSDia([{ cabezas: 685, pesoKg: 250 }]);
    expect(demanda).toBeCloseTo(5137.5, 1);
    const balance = balanceDiarioKgMS(1959, demanda);
    expect(balance).toBeCloseTo(-3178.5, 1);
    expect(suplementoPorAnimalKgMS(balance, 685)).toBeCloseTo(4.6, 1);
  });

  it('vuelta resultante ≈ 68 días (137 ha / 2,0 ha/día) — la vuelta es un resultado', () => {
    expect(vueltaResultanteDias(137, 2.0)).toBeCloseTo(68.5, 1);
  });

  it('cuña: stock ok y lectura "seguir" (§3.3, panel del 8 de junio: OK)', () => {
    const cuna = construirCuna(
      potreros.map((p) => ({
        nombre: p.nombre,
        superficieHa: p.superficieHa,
        biomasaKgMSHa: p.biomasaActualKgMSHa,
        enPastoreo: p.enPastoreo,
      })),
      targets,
    );
    expect(cuna.estadoStock).toBe('ok');
    expect(cuna.lectura).toBe('seguir');
    // Orden de mayor a menor del panel: A, C, D, E, B, F
    expect(cuna.barras.map((b) => b.nombre)).toEqual(['A', 'C', 'D', 'E', 'B', 'F']);
  });
});
