/**
 * Análisis de la recorrida para el técnico. Lógica pura (testeable sin
 * navegador): agrupa mediciones en recorridas, deriva el estado de cada
 * potrero de los eventos de entrada/salida y aplica las fórmulas de
 * @pasto/core siguiendo la secuencia de decisión de la Guía INTA §3.
 */
import {
  balanceDiarioKgMS,
  construirCuna,
  demandaRodeoKgMSDia,
  elegirPotreroEntrada,
  hectareasACerrar,
  ocupacionMaximaDias,
  proporcionACerrar,
  resumenCrecimiento,
  stockPromedioKgMSHa,
  suplementoPorAnimalKgMS,
  superficieDiariaPorConsumoHa,
  superficieDiariaPorCrecimientoHa,
  vueltaResultanteDias,
  type Cuna,
  type PotreroMedido,
} from '@pasto/core';
import type { Campo, Evento, Medicion, Potrero } from './tipos.js';

/** Una recorrida: todas las mediciones de una misma fecha, promediadas por potrero. */
export interface Recorrida {
  fecha: string;
  /** kg MS/ha por potrero (promedio de los puntos medidos ese día). */
  biomasas: Map<string, number>;
}

const soloFecha = (iso: string): string => iso.slice(0, 10);

/** Agrupa mediciones por fecha y potrero, promediando los puntos del potrero. */
export function agruparRecorridas(mediciones: Medicion[]): Recorrida[] {
  const porFecha = new Map<string, Map<string, number[]>>();
  for (const m of mediciones) {
    const fecha = soloFecha(m.fechaHora);
    let potreros = porFecha.get(fecha);
    if (!potreros) {
      potreros = new Map();
      porFecha.set(fecha, potreros);
    }
    const lista = potreros.get(m.potreroId) ?? [];
    lista.push(m.kgMSHa);
    potreros.set(m.potreroId, lista);
  }
  return [...porFecha.entries()]
    .map(([fecha, potreros]) => ({
      fecha,
      biomasas: new Map(
        [...potreros.entries()].map(([id, valores]) => [
          id,
          valores.reduce((a, b) => a + b, 0) / valores.length,
        ]),
      ),
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export type EstadoPotrero =
  | 'en_pastoreo'
  | 'listo'      // biomasa en el target de entrada (± tolerancia)
  | 'pasado'     // por encima del target de entrada: candidato a reservas
  | 'en_descanso'
  | 'sin_datos';

export interface SituacionPotrero {
  potrero: Potrero;
  biomasaKgMSHa: number | null;
  estado: EstadoPotrero;
  /** Días desde que salieron los animales (null si nunca salieron o están adentro). */
  diasDescanso: number | null;
  /** Días que llevan los animales adentro (null si no están). */
  diasOcupacion: number | null;
  /** Ocupación máxima recomendada para el mes de la recorrida (Guía §3). */
  ocupacionMaximaDias: number;
  tasaCrecimientoKgMSHaDia: number | null;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Días calendario entre dos momentos (compara solo la fecha, ignorando la
 * hora): si los animales entraron el 2/8 y la recorrida es el 8/8, son 6 días
 * de ocupación, que es como lo cuenta el técnico a campo.
 */
function diasEntre(desdeIso: string, hastaIso: string): number {
  const desde = Date.parse(`${soloFecha(desdeIso)}T00:00:00.000Z`);
  const hasta = Date.parse(`${soloFecha(hastaIso)}T00:00:00.000Z`);
  return Math.max(0, Math.round((hasta - desde) / DIA_MS));
}

/** Último evento de cada potrero hasta una fecha dada. */
function ultimoEventoPorPotrero(eventos: Evento[], hastaIso: string): Map<string, Evento> {
  const ultimo = new Map<string, Evento>();
  for (const e of eventos) {
    if (e.fechaHora > hastaIso) continue;
    const previo = ultimo.get(e.potreroId);
    if (!previo || e.fechaHora > previo.fechaHora) ultimo.set(e.potreroId, e);
  }
  return ultimo;
}

/** Potreros con animales adentro en una fecha dada, según los eventos. */
export function potrerosEnPastoreo(eventos: Evento[], fechaIso: string): Set<string> {
  const ultimo = ultimoEventoPorPotrero(eventos, fechaIso);
  return new Set(
    [...ultimo.entries()].filter(([, e]) => e.tipo === 'entrada').map(([potreroId]) => potreroId),
  );
}

export interface AnalisisRecorrida {
  fecha: string;
  fechaAnterior: string | null;
  diasEntreRecorridas: number;
  situaciones: SituacionPotrero[];
  /** Stock promedio de la plataforma (promedio simple, como los paneles de la Guía). */
  stockKgMSHa: number;
  tasaPonderadaKgMSHaDia: number;
  pastoPorDiaKgMS: number;
  demandaKgMSDia: number;
  balanceKgMSDia: number;
  cabezas: number;
  cuna: Cuna;
  /** Decisiones sugeridas por la Guía §3 para los próximos 7 días. */
  decisiones: Decisiones;
}

export interface Decisiones {
  potreroEntrada: Potrero | null;
  potrerosPasados: Potrero[];
  superficieDiariaHa: number | null;
  /** Si sobra pasto: parcela ajustada al consumo (Guía §3.2). */
  superficieDiariaPorConsumoHa: number | null;
  vueltaResultanteDias: number | null;
  suplementoKgMSPorAnimal: number | null;
  proporcionACerrar: number;
  hectareasACerrar: number;
  ocupacionMaximaDias: number;
}

export interface OpcionesAnalisis {
  /** Potreros cerrados para reservas (fuera de la rotación). */
  cerrados?: Set<string>;
  toleranciaEntrada?: number;
}

/**
 * Analiza la última recorrida contra la anterior siguiendo la Guía §3:
 * TC por potrero → TC ponderada → pasto/día → balance → decisiones.
 */
export function analizarRecorrida(
  campo: Campo,
  recorridas: Recorrida[],
  eventos: Evento[],
  opciones: OpcionesAnalisis = {},
): AnalisisRecorrida | null {
  const actual = recorridas.at(-1);
  const anterior = recorridas.at(-2) ?? null;
  if (!actual) return null;

  const cerrados = opciones.cerrados ?? new Set<string>();
  const tolerancia = opciones.toleranciaEntrada ?? 0.05;
  const fechaIso = `${actual.fecha}T23:59:59.999Z`;
  const enPastoreo = potrerosEnPastoreo(eventos, fechaIso);
  const dias = anterior ? diasEntre(anterior.fecha, actual.fecha) : 0;
  const mes = Number(actual.fecha.slice(5, 7));
  const ocupacionMax = ocupacionMaximaDias(mes);

  // Potreros con biomasa medida en ambas recorridas → entran al cálculo de TC.
  const medidos: PotreroMedido[] = [];
  for (const potrero of campo.potreros) {
    const biomasaActual = actual.biomasas.get(potrero.id);
    if (biomasaActual === undefined) continue;
    const biomasaAnterior = anterior?.biomasas.get(potrero.id);
    medidos.push({
      nombre: potrero.id,
      superficieHa: potrero.supGanaderaHa,
      biomasaAnteriorKgMSHa: biomasaAnterior ?? biomasaActual,
      biomasaActualKgMSHa: biomasaActual,
      enPastoreo: enPastoreo.has(potrero.id) || biomasaAnterior === undefined,
      cerrado: cerrados.has(potrero.id),
    });
  }
  if (medidos.length === 0) return null;

  const resumen = dias > 0 ? resumenCrecimiento(medidos, dias) : null;
  const tcPorPotrero = new Map(
    (resumen?.porPotrero ?? []).map((p) => [p.nombre, p.tasaCrecimientoKgMSHaDia]),
  );

  const ultimoEvento = ultimoEventoPorPotrero(eventos, fechaIso);
  const situaciones: SituacionPotrero[] = campo.potreros.map((potrero) => {
    const biomasa = actual.biomasas.get(potrero.id) ?? null;
    const evento = ultimoEvento.get(potrero.id);
    const adentro = enPastoreo.has(potrero.id);
    let estado: EstadoPotrero;
    if (biomasa === null) estado = 'sin_datos';
    else if (adentro) estado = 'en_pastoreo';
    else if (biomasa > campo.targets.entradaKgMSHa * (1 + tolerancia)) estado = 'pasado';
    else if (biomasa >= campo.targets.entradaKgMSHa * (1 - tolerancia)) estado = 'listo';
    else estado = 'en_descanso';
    return {
      potrero,
      biomasaKgMSHa: biomasa,
      estado,
      diasDescanso: evento && evento.tipo === 'salida' ? diasEntre(evento.fechaHora, fechaIso) : null,
      diasOcupacion: evento && evento.tipo === 'entrada' ? diasEntre(evento.fechaHora, fechaIso) : null,
      ocupacionMaximaDias: ocupacionMax,
      tasaCrecimientoKgMSHaDia: tcPorPotrero.get(potrero.id) ?? null,
    };
  });

  const paraStock = campo.potreros
    .filter((p) => actual.biomasas.has(p.id) && !cerrados.has(p.id))
    .map((p) => ({ superficieHa: p.supGanaderaHa, biomasaKgMSHa: actual.biomasas.get(p.id)! }));
  const stock = stockPromedioKgMSHa(paraStock, { ponderado: false });

  const cabezas = campo.rodeo.categorias.reduce((a, c) => a + c.cabezas, 0);
  const demanda = demandaRodeoKgMSDia(campo.rodeo.categorias);
  const pastoPorDia = resumen?.pastoPorDiaKgMS ?? 0;
  const balance = balanceDiarioKgMS(pastoPorDia, demanda);

  const cuna = construirCuna(
    campo.potreros
      .filter((p) => actual.biomasas.has(p.id))
      .map((p) => ({
        nombre: p.nombre,
        superficieHa: p.supGanaderaHa,
        biomasaKgMSHa: actual.biomasas.get(p.id)!,
        enPastoreo: enPastoreo.has(p.id),
        cerrado: cerrados.has(p.id),
      })),
    campo.targets,
  );

  // Decisiones (Guía §3): a qué potrero entrar, cuánta superficie por día,
  // si alcanza el pasto y cuánto cerrar para reservas.
  const candidatos = campo.potreros
    .filter((p) => actual.biomasas.has(p.id))
    .map((p) => ({
      nombre: p.id,
      superficieHa: p.supGanaderaHa,
      biomasaKgMSHa: actual.biomasas.get(p.id)!,
      enPastoreo: enPastoreo.has(p.id),
      cerrado: cerrados.has(p.id),
    }));
  const eleccion = elegirPotreroEntrada(candidatos, campo.targets.entradaKgMSHa, {
    toleranciaPasado: tolerancia,
  });
  const porId = new Map(campo.potreros.map((p) => [p.id, p]));
  const potreroEntrada = eleccion.elegido ? porId.get(eleccion.elegido.nombre) ?? null : null;
  const biomasaEntrada = eleccion.elegido?.biomasaKgMSHa ?? null;

  let superficieDiaria: number | null = null;
  let superficiePorConsumo: number | null = null;
  if (biomasaEntrada !== null && pastoPorDia > 0 && biomasaEntrada > campo.targets.salidaKgMSHa) {
    superficieDiaria = superficieDiariaPorCrecimientoHa(
      pastoPorDia,
      biomasaEntrada,
      campo.targets.salidaKgMSHa,
    );
    superficiePorConsumo = superficieDiariaPorConsumoHa(
      demanda,
      biomasaEntrada,
      campo.targets.salidaKgMSHa,
    );
  }

  const haPlataforma = resumen?.haPlataforma ?? 0;

  return {
    fecha: actual.fecha,
    fechaAnterior: anterior?.fecha ?? null,
    diasEntreRecorridas: dias,
    situaciones,
    stockKgMSHa: stock,
    tasaPonderadaKgMSHaDia: resumen?.tasaPonderadaKgMSHaDia ?? 0,
    pastoPorDiaKgMS: pastoPorDia,
    demandaKgMSDia: demanda,
    balanceKgMSDia: balance,
    cabezas,
    cuna,
    decisiones: {
      potreroEntrada,
      potrerosPasados: eleccion.pasados
        .map((p) => porId.get(p.nombre))
        .filter((p): p is Potrero => p !== undefined),
      superficieDiariaHa: superficieDiaria,
      superficieDiariaPorConsumoHa: balance > 0 ? superficiePorConsumo : null,
      vueltaResultanteDias:
        superficieDiaria && superficieDiaria > 0 && haPlataforma > 0
          ? vueltaResultanteDias(haPlataforma, superficieDiaria)
          : null,
      suplementoKgMSPorAnimal: balance < 0 ? suplementoPorAnimalKgMS(balance, cabezas) : null,
      proporcionACerrar: proporcionACerrar(demanda, pastoPorDia),
      hectareasACerrar: hectareasACerrar(demanda, pastoPorDia, haPlataforma),
      ocupacionMaximaDias: ocupacionMax,
    },
  };
}

/** Serie de stock promedio por recorrida, para el gráfico de evolución. */
export function serieStock(
  campo: Campo,
  recorridas: Recorrida[],
): { fecha: string; stockKgMSHa: number }[] {
  return recorridas.map((r) => {
    const potreros = campo.potreros
      .filter((p) => r.biomasas.has(p.id))
      .map((p) => ({ superficieHa: p.supGanaderaHa, biomasaKgMSHa: r.biomasas.get(p.id)! }));
    return {
      fecha: r.fecha,
      stockKgMSHa: potreros.length > 0 ? stockPromedioKgMSHa(potreros, { ponderado: false }) : 0,
    };
  });
}
