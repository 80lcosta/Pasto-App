/**
 * Validación contra Guía INTA §3.2 — recorrida del 10 de octubre (mucha
 * producción). Mismos datos que Excel hoja "Oferta (2)".
 */
import { describe, expect, it } from 'vitest';
import {
  balanceDiarioKgMS,
  construirCuna,
  demandaRodeoKgMSDia,
  elegirPotreroEntrada,
  hectareasACerrar,
  proporcionACerrar,
  resumenCrecimiento,
  stockPromedioKgMSHa,
  superficieDiariaPorConsumoHa,
  superficieDiariaPorCrecimientoHa,
  type PotreroMedido,
  type TargetsPlataforma,
} from '../src/index.js';

const DIAS = 7;

const potreros: PotreroMedido[] = [
  { nombre: 'A', superficieHa: 24, biomasaAnteriorKgMSHa: 2000, biomasaActualKgMSHa: 2500 },
  { nombre: 'B', superficieHa: 20, biomasaAnteriorKgMSHa: 1070, biomasaActualKgMSHa: 1245 },
  { nombre: 'C', superficieHa: 22, biomasaAnteriorKgMSHa: 1600, biomasaActualKgMSHa: 1900 },
  { nombre: 'D', superficieHa: 25, biomasaAnteriorKgMSHa: 1550, biomasaActualKgMSHa: 1800 },
  { nombre: 'E', superficieHa: 22, biomasaAnteriorKgMSHa: 1200, biomasaActualKgMSHa: 1700 },
  { nombre: 'F', superficieHa: 24, biomasaAnteriorKgMSHa: 1800, biomasaActualKgMSHa: 1060, enPastoreo: true },
];

const targets: TargetsPlataforma = {
  stockKgMSHa: 1500,
  entradaKgMSHa: 2000,
  salidaKgMSHa: 1000,
  datum: 'ras_suelo',
};

const demanda = demandaRodeoKgMSDia([{ cabezas: 685, pesoKg: 250 }]); // 5.137,5

describe('Guía §3.2 — 10 de octubre (mucha producción de forraje)', () => {
  const r = resumenCrecimiento(potreros, DIAS);

  it('tasas de crecimiento por potrero (tabla de la Guía)', () => {
    const tc = Object.fromEntries(r.porPotrero.map((p) => [p.nombre, p.tasaCrecimientoKgMSHaDia]));
    expect(tc['A']).toBeCloseTo(71.4, 1);
    expect(tc['B']).toBeCloseTo(25.0, 1);
    expect(tc['C']).toBeCloseTo(42.9, 1);
    expect(tc['D']).toBeCloseTo(35.7, 1);
    expect(tc['E']).toBeCloseTo(71.4, 1);
    expect(tc['F']).toBeNull();
  });

  it('biomasa total ≈ 5.621 kg MS/día; TC ponderada ≈ 49,7; pasto/día ≈ 6.809', () => {
    expect(r.biomasaTotalKgMSDia).toBeCloseTo(5621.43, 1);
    expect(r.tasaPonderadaKgMSHaDia).toBeCloseTo(49.75, 2);
    // Guía publica 6.809 (49,7 × 137); exacta: 6.815,4
    expect(r.pastoPorDiaKgMS).toBeCloseTo(6815.36, 1);
    expect(Math.abs(r.pastoPorDiaKgMS - 6809) / 6809).toBeLessThan(0.005);
  });

  it('stock de pasto: 1.537 (3/10) y 1.701 (10/10) kg MS/ha', () => {
    const antes = stockPromedioKgMSHa(
      potreros.map((p) => ({ superficieHa: p.superficieHa, biomasaKgMSHa: p.biomasaAnteriorKgMSHa })),
      { ponderado: false },
    );
    const ahora = stockPromedioKgMSHa(
      potreros.map((p) => ({ superficieHa: p.superficieHa, biomasaKgMSHa: p.biomasaActualKgMSHa })),
      { ponderado: false },
    );
    expect(antes).toBeCloseTo(1536.7, 1);
    expect(ahora).toBeCloseTo(1700.8, 1);
  });

  it('decisión 1: A está pasado (2.500 > 2.000) → se deja para reservas; se entra a C (1.900)', () => {
    const { elegido, pasados } = elegirPotreroEntrada(
      potreros.map((p) => ({
        nombre: p.nombre,
        superficieHa: p.superficieHa,
        biomasaKgMSHa: p.biomasaActualKgMSHa,
        enPastoreo: p.enPastoreo,
      })),
      targets.entradaKgMSHa,
    );
    expect(pasados.map((p) => p.nombre)).toEqual(['A']);
    expect(elegido?.nombre).toBe('C');
  });

  it('decisión 2: superficie diaria ≈ 7,6 ha/día (6.809 / (1.900 − 1.000))', () => {
    expect(superficieDiariaPorCrecimientoHa(6809, 1900, 1000)).toBeCloseTo(7.57, 2);
  });

  it('decisión 3: sobra pasto → parcela por consumo ≈ 5,7 ha/día (5.137 / 900)', () => {
    const balance = balanceDiarioKgMS(6809, demanda);
    expect(balance).toBeGreaterThan(0);
    expect(superficieDiariaPorConsumoHa(demanda, 1900, 1000)).toBeCloseTo(5.71, 2);
  });

  it('cerrar para reservas: 25 % del área ≈ 34 ha (1 − 5.137/6.809)', () => {
    expect(proporcionACerrar(demanda, 6809)).toBeCloseTo(0.2455, 3);
    expect(hectareasACerrar(demanda, 6809, 137)).toBeCloseTo(33.6, 1);
  });

  it('cuña: stock alto (1.701 > 1.500 + 10 %) → lectura "exceso" con cierre de potreros', () => {
    const cuna = construirCuna(
      potreros.map((p) => ({
        nombre: p.nombre,
        superficieHa: p.superficieHa,
        biomasaKgMSHa: p.biomasaActualKgMSHa,
        enPastoreo: p.enPastoreo,
      })),
      targets,
    );
    expect(cuna.estadoStock).toBe('alto');
    expect(cuna.lectura).toBe('exceso');
    expect(cuna.acciones.join(' ')).toContain('reservas');
    expect(cuna.barras.map((b) => b.nombre)).toEqual(['A', 'C', 'D', 'E', 'B', 'F']);
  });
});
