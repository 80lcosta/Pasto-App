/**
 * Tests del pipeline del dashboard: mediciones → recorridas → análisis.
 * Incluye una corrida con la geometría exacta de la Guía INTA §3.1 para
 * verificar que el tablero reproduce el caso publicado de punta a punta.
 */
import { describe, expect, it } from 'vitest';
import campoJson from '@pasto/campo-demo/loma-alta.json';
import demoJson from '@pasto/campo-demo/recorridas-demo.json';
import { agruparRecorridas, analizarRecorrida, potrerosEnPastoreo, serieStock } from '../src/analisis.js';
import { medicionesDeDemo } from '../src/demo.js';
import type { Campo, Evento, Medicion } from '../src/tipos.js';

const campo = campoJson as unknown as Campo;

function medicion(potreroId: string, fecha: string, kgMSHa: number): Medicion {
  return {
    id: `${potreroId}-${fecha}`,
    puntoId: `${potreroId}-p1`,
    potreroId,
    fechaHora: `${fecha}T12:00:00.000Z`,
    lecturasCm: [10],
    alturaPromedioCm: 10,
    kgMSHa,
    curva: { pendiente: 144, interseccion: -177, datum: 'ras_suelo' },
    usuario: 'test',
  };
}

describe('agruparRecorridas', () => {
  it('promedia los puntos de un mismo potrero y ordena por fecha', () => {
    const recorridas = agruparRecorridas([
      { ...medicion('p1', '2026-08-08', 1000), puntoId: 'p1-p1' },
      { ...medicion('p1', '2026-08-08', 1400), id: 'otro', puntoId: 'p1-p2' },
      medicion('p1', '2026-08-01', 900),
    ]);
    expect(recorridas.map((r) => r.fecha)).toEqual(['2026-08-01', '2026-08-08']);
    expect(recorridas[1]!.biomasas.get('p1')).toBe(1200);
  });
});

describe('potrerosEnPastoreo', () => {
  const eventos: Evento[] = [
    { id: '1', tipo: 'entrada', potreroId: 'a', rodeoId: 'r', fechaHora: '2026-08-01T09:00:00.000Z', usuario: 'u' },
    { id: '2', tipo: 'salida', potreroId: 'a', rodeoId: 'r', fechaHora: '2026-08-05T09:00:00.000Z', usuario: 'u' },
    { id: '3', tipo: 'entrada', potreroId: 'b', rodeoId: 'r', fechaHora: '2026-08-05T10:00:00.000Z', usuario: 'u' },
  ];

  it('toma el último evento de cada potrero hasta la fecha', () => {
    expect([...potrerosEnPastoreo(eventos, '2026-08-10T00:00:00.000Z')]).toEqual(['b']);
    // El 3 de agosto los animales todavía estaban en "a"
    expect([...potrerosEnPastoreo(eventos, '2026-08-03T00:00:00.000Z')]).toEqual(['a']);
  });
});

describe('Análisis de la recorrida de demostración (Loma Alta, 8 de agosto)', () => {
  const { mediciones, eventos } = medicionesDeDemo(demoJson, campo);
  const recorridas = agruparRecorridas(mediciones);
  const a = analizarRecorrida(campo, recorridas, eventos)!;

  it('usa la última recorrida contra la anterior (7 días)', () => {
    expect(a.fecha).toBe('2026-08-08');
    expect(a.fechaAnterior).toBe('2026-08-01');
    expect(a.diasEntreRecorridas).toBe(7);
  });

  it('Bulevard está en pastoreo (evento de entrada) y no computa tasa de crecimiento', () => {
    const bulevard = a.situaciones.find((s) => s.potrero.id === 'bulevard')!;
    expect(bulevard.estado).toBe('en_pastoreo');
    expect(bulevard.tasaCrecimientoKgMSHaDia).toBeNull();
    expect(bulevard.diasOcupacion).toBe(6); // entró el 2/8
  });

  it('TC ponderada sobre las 121 ha no pastoreadas y pasto/día sobre las 146 ha', () => {
    // Σ biomasa: 24,29×30 + 11,43×22 + 14,29×30 + 7,14×24 + 14,29×15 = 1.794,3
    expect(a.tasaPonderadaKgMSHaDia).toBeCloseTo(14.83, 2);
    expect(a.pastoPorDiaKgMS).toBeCloseTo(2165.0, 0);
  });

  it('stock promedio = 1.445 kg MS/ha (mismas biomasas que el caso de la Guía)', () => {
    expect(a.stockKgMSHa).toBeCloseTo(1445, 0);
    expect(a.cuna.estadoStock).toBe('ok');
    expect(a.cuna.lectura).toBe('seguir');
  });

  it('déficit → suplementar: balance negativo repartido entre las 373 cabezas', () => {
    expect(a.cabezas).toBe(373);
    expect(a.demandaKgMSDia).toBeCloseTo(3768.45, 1);
    expect(a.balanceKgMSDia).toBeCloseTo(-1603.4, 0);
    expect(a.decisiones.suplementoKgMSPorAnimal).toBeCloseTo(4.3, 1);
    expect(a.decisiones.superficieDiariaPorConsumoHa).toBeNull(); // no sobra pasto
  });

  it('entrar a Pastura 1 año (1.970 ≈ target 2.000), sin potreros pasados', () => {
    expect(a.decisiones.potreroEntrada?.id).toBe('pastura-1');
    expect(a.decisiones.potrerosPasados).toHaveLength(0);
    expect(a.decisiones.superficieDiariaHa).toBeCloseTo(2.23, 2);
    expect(a.decisiones.vueltaResultanteDias).toBeCloseTo(65.4, 1);
  });

  it('ocupación máxima de 7 días en agosto (otoño-invierno, Guía §3.1)', () => {
    expect(a.decisiones.ocupacionMaximaDias).toBe(7);
  });

  it('la serie de stock tiene una entrada por recorrida y termina en 1.445', () => {
    const serie = serieStock(campo, recorridas);
    expect(serie).toHaveLength(5);
    expect(serie.at(-1)!.stockKgMSHa).toBeCloseTo(1445, 0);
  });
});

describe('Equivalencia punta a punta con el caso publicado (Guía §3.1)', () => {
  // Geometría exacta de la Guía: potreros A–F, 137 ha, rodeo de 685 × 250 kg.
  const campoGuia: Campo = {
    campo: 'Guía §3.1',
    targets: { stockKgMSHa: 1500, entradaKgMSHa: 2000, salidaKgMSHa: 1000, datum: 'ras_suelo' },
    recursos: campo.recursos,
    potreros: [
      { id: 'A', orden: 1, nombre: 'A', superficieHa: 24, supGanaderaHa: 24, recursoId: 'pasto-natural', descripcionRecurso: '' },
      { id: 'B', orden: 2, nombre: 'B', superficieHa: 20, supGanaderaHa: 20, recursoId: 'pasto-natural', descripcionRecurso: '' },
      { id: 'C', orden: 3, nombre: 'C', superficieHa: 22, supGanaderaHa: 22, recursoId: 'pasto-natural', descripcionRecurso: '' },
      { id: 'D', orden: 4, nombre: 'D', superficieHa: 25, supGanaderaHa: 25, recursoId: 'pasto-natural', descripcionRecurso: '' },
      { id: 'E', orden: 5, nombre: 'E', superficieHa: 22, supGanaderaHa: 22, recursoId: 'pasto-natural', descripcionRecurso: '' },
      { id: 'F', orden: 6, nombre: 'F', superficieHa: 24, supGanaderaHa: 24, recursoId: 'pasto-natural', descripcionRecurso: '' },
    ],
    rodeo: { id: 'r', nombre: 'Recría', categorias: [{ cabezas: 685, pesoKg: 250 }] },
  };

  const previa = { A: 1800, B: 1070, C: 1600, D: 1450, E: 1200, F: 1750 };
  const actual = { A: 1970, B: 1150, C: 1700, D: 1500, E: 1300, F: 1050 };
  const mediciones: Medicion[] = [
    ...Object.entries(previa).map(([id, kg]) => medicion(id, '2026-06-01', kg)),
    ...Object.entries(actual).map(([id, kg]) => medicion(id, '2026-06-08', kg)),
  ];
  const eventos: Evento[] = [
    { id: 'e1', tipo: 'entrada', potreroId: 'F', rodeoId: 'r', fechaHora: '2026-06-05T09:00:00.000Z', usuario: 'test' },
  ];

  const a = analizarRecorrida(campoGuia, agruparRecorridas(mediciones), eventos)!;

  it('reproduce los valores publicados de la Guía §3.1', () => {
    expect(a.stockKgMSHa).toBeCloseTo(1445, 0);           // publicado 1.445
    expect(a.tasaPonderadaKgMSHaDia).toBeCloseTo(14.32, 2); // publicado 14,3
    expect(a.pastoPorDiaKgMS).toBeCloseTo(1962.3, 0);      // publicado 1.959 (redondeo)
    expect(a.demandaKgMSDia).toBeCloseTo(5137.5, 1);       // publicado 5.137
    expect(a.balanceKgMSDia).toBeCloseTo(-3175.2, 0);      // publicado −3.178 (redondeo)
    expect(a.decisiones.potreroEntrada?.id).toBe('A');     // publicado: potrero A
    expect(a.decisiones.superficieDiariaHa).toBeCloseTo(2.02, 2); // publicado 2,0 ha/día
    expect(a.decisiones.suplementoKgMSPorAnimal).toBeCloseTo(4.6, 1); // publicado 4,6
    expect(a.decisiones.vueltaResultanteDias).toBeCloseTo(67.7, 1);   // publicado ~68 días
  });

  it('el potrero en pastoreo se detecta por el evento de entrada', () => {
    const f = a.situaciones.find((s) => s.potrero.id === 'F')!;
    expect(f.estado).toBe('en_pastoreo');
    expect(f.tasaCrecimientoKgMSHaDia).toBeNull();
  });
});

describe('Recorrida con exceso de forraje (Guía §3.2)', () => {
  const campoGuia: Campo = {
    campo: 'Guía §3.2',
    targets: { stockKgMSHa: 1500, entradaKgMSHa: 2000, salidaKgMSHa: 1000, datum: 'ras_suelo' },
    recursos: campo.recursos,
    potreros: [
      { id: 'A', orden: 1, nombre: 'A', superficieHa: 24, supGanaderaHa: 24, recursoId: 'pasto-natural', descripcionRecurso: '' },
      { id: 'B', orden: 2, nombre: 'B', superficieHa: 20, supGanaderaHa: 20, recursoId: 'pasto-natural', descripcionRecurso: '' },
      { id: 'C', orden: 3, nombre: 'C', superficieHa: 22, supGanaderaHa: 22, recursoId: 'pasto-natural', descripcionRecurso: '' },
      { id: 'D', orden: 4, nombre: 'D', superficieHa: 25, supGanaderaHa: 25, recursoId: 'pasto-natural', descripcionRecurso: '' },
      { id: 'E', orden: 5, nombre: 'E', superficieHa: 22, supGanaderaHa: 22, recursoId: 'pasto-natural', descripcionRecurso: '' },
      { id: 'F', orden: 6, nombre: 'F', superficieHa: 24, supGanaderaHa: 24, recursoId: 'pasto-natural', descripcionRecurso: '' },
    ],
    rodeo: { id: 'r', nombre: 'Recría', categorias: [{ cabezas: 685, pesoKg: 250 }] },
  };
  const previa = { A: 2000, B: 1070, C: 1600, D: 1550, E: 1200, F: 1800 };
  const actual = { A: 2500, B: 1245, C: 1900, D: 1800, E: 1700, F: 1060 };
  const mediciones: Medicion[] = [
    ...Object.entries(previa).map(([id, kg]) => medicion(id, '2026-10-03', kg)),
    ...Object.entries(actual).map(([id, kg]) => medicion(id, '2026-10-10', kg)),
  ];
  const eventos: Evento[] = [
    { id: 'e1', tipo: 'entrada', potreroId: 'F', rodeoId: 'r', fechaHora: '2026-10-07T09:00:00.000Z', usuario: 'test' },
  ];
  const a = analizarRecorrida(campoGuia, agruparRecorridas(mediciones), eventos)!;

  it('A queda "pasado" y se entra a C; sobra pasto y se sugiere cerrar ~25 %', () => {
    expect(a.situaciones.find((s) => s.potrero.id === 'A')!.estado).toBe('pasado');
    expect(a.decisiones.potreroEntrada?.id).toBe('C');
    expect(a.decisiones.potrerosPasados.map((p) => p.id)).toEqual(['A']);
    expect(a.balanceKgMSDia).toBeGreaterThan(0);
    expect(a.decisiones.superficieDiariaPorConsumoHa).toBeCloseTo(5.71, 2);
    expect(a.decisiones.proporcionACerrar).toBeCloseTo(0.246, 2);
    expect(a.decisiones.hectareasACerrar).toBeCloseTo(33.7, 0);
    expect(a.cuna.lectura).toBe('exceso');
  });

  it('en octubre la ocupación máxima baja a 4 días (primavera-verano)', () => {
    expect(a.decisiones.ocupacionMaximaDias).toBe(4);
  });
});
