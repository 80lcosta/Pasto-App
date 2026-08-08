/**
 * Modo demostración: el tablero funciona entero dentro del navegador, sin
 * servidor ni base de datos.
 *
 * Sirve para mostrarle la herramienta a un cliente sin pagar hosting: los
 * datos de Loma Alta viajan con la aplicación y los cálculos son los mismos
 * (el mismo motor validado). Lo que se escriba acá queda solo en esa pestaña.
 */
import campoJson from '@pasto/campo-demo/loma-alta.json';
import demoJson from '@pasto/campo-demo/recorridas-demo.json';
import type {
  Auditoria,
  Campo,
  Evento,
  Medicion,
  Recomendacion,
  Usuario,
} from './tipos.js';

export interface RecorridaDemo {
  fecha: string;
  biomasas: Record<string, number>;
  enPastoreo: string[];
}

interface ArchivoDemo {
  recorridas: RecorridaDemo[];
  eventos: Evento[];
}

/** Convierte las recorridas de ejemplo en mediciones con la forma real. */
export function medicionesDeDemo(
  archivo: unknown,
  campo: Campo,
): { mediciones: Medicion[]; eventos: Evento[] } {
  const datos = archivo as ArchivoDemo;
  const porId = new Map(campo.recursos.map((r) => [r.id, r]));
  const mediciones: Medicion[] = [];

  for (const recorrida of datos.recorridas) {
    for (const potrero of campo.potreros) {
      const kgMSHa = recorrida.biomasas[potrero.id];
      if (kgMSHa === undefined) continue;
      const recurso = porId.get(potrero.recursoId);
      if (!recurso) continue;
      const alturaCm =
        Math.round(((kgMSHa - recurso.curva.interseccion) / recurso.curva.pendiente) * 10) / 10;
      mediciones.push({
        id: `demo-${potrero.id}-${recorrida.fecha}`,
        puntoId: `${potrero.id}-p1`,
        potreroId: potrero.id,
        fechaHora: `${recorrida.fecha}T12:00:00.000Z`,
        lecturasCm: [alturaCm],
        alturaPromedioCm: alturaCm,
        kgMSHa,
        curva: recurso.curva,
        usuario: 'Benjamín (medidor)',
      });
    }
  }
  return { mediciones, eventos: datos.eventos ?? [] };
}

/** Cuadrícula de potreros para que la demostración tenga mapa. */
function conGeometrias(campo: Campo): Campo {
  const lat0 = -37.32;
  const lon0 = -59.13;
  const metrosPorGradoLat = 111_320;
  const metrosPorGradoLon = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const ANCHO_M = 500;

  return {
    ...campo,
    potreros: campo.potreros.map((p, i) => {
      const altoM = (p.supGanaderaHa * 10_000) / ANCHO_M;
      const x0 = (i % 3) * (ANCHO_M + 60);
      const y0 = Math.floor(i / 3) * 750;
      const esquinas: [number, number][] = [
        [x0, y0],
        [x0 + ANCHO_M, y0],
        [x0 + ANCHO_M, y0 + altoM],
        [x0, y0 + altoM],
        [x0, y0],
      ];
      return {
        ...p,
        geometria: {
          type: 'Polygon' as const,
          coordinates: [
            esquinas.map(
              ([dx, dy]) =>
                [lon0 + dx / metrosPorGradoLon, lat0 + dy / metrosPorGradoLat] as [number, number],
            ),
          ],
        },
      };
    }),
  };
}

export const USUARIO_DEMO: Usuario = {
  id: 'demo',
  nombre: 'Demostración',
  rol: 'tecnico',
};

export interface DatosDemo {
  campo: Campo;
  mediciones: Medicion[];
  eventos: Evento[];
  recomendaciones: Recomendacion[];
}

/**
 * Estado de la demostración. Vive en memoria: lo que se escribe se ve, pero
 * se pierde al recargar. Es a propósito, para que nadie confunda una
 * demostración con datos reales.
 */
let recomendacionesDemo: Recomendacion[] = [];
let campoDemo: Campo | null = null;

export function cargarDatosDemo(): DatosDemo {
  if (!campoDemo) campoDemo = conGeometrias(campoJson as unknown as Campo);
  const { mediciones, eventos } = medicionesDeDemo(demoJson, campoDemo);
  return { campo: campoDemo, mediciones, eventos, recomendaciones: [...recomendacionesDemo] };
}

export function agregarRecomendacionDemo(r: Recomendacion): void {
  recomendacionesDemo = [...recomendacionesDemo, r];
}

export function guardarTargetsDemo(targets: Campo['targets']): void {
  if (campoDemo) campoDemo = { ...campoDemo, targets };
}

export function importarPotrerosDemo(
  potreros: { nombre: string; superficieHa: number; geometria: unknown }[],
): { creados: string[]; actualizados: string[]; omitidos: string[] } {
  if (!campoDemo) return { creados: [], actualizados: [], omitidos: [] };
  const actualizados: string[] = [];
  const creados: string[] = [];
  const porNombre = new Map(campoDemo.potreros.map((p) => [p.nombre.trim().toLowerCase(), p]));

  const nuevos = [...campoDemo.potreros];
  for (const p of potreros) {
    const existente = porNombre.get(p.nombre.trim().toLowerCase());
    if (existente) {
      const i = nuevos.indexOf(existente);
      nuevos[i] = {
        ...existente,
        superficieHa: p.superficieHa,
        geometria: p.geometria as Campo['potreros'][number]['geometria'],
      };
      actualizados.push(p.nombre);
    } else {
      nuevos.push({
        id: `demo-${nuevos.length}`,
        orden: nuevos.length + 1,
        nombre: p.nombre,
        superficieHa: p.superficieHa,
        supGanaderaHa: p.superficieHa,
        recursoId: campoDemo.recursos[0]!.id,
        descripcionRecurso: '',
        geometria: p.geometria as Campo['potreros'][number]['geometria'],
      });
      creados.push(p.nombre);
    }
  }
  campoDemo = { ...campoDemo, potreros: nuevos };
  return { creados, actualizados, omitidos: [] };
}

/** Auditoría de ejemplo, para que la solapa muestre de qué se trata. */
export function auditoriaDemo(): Auditoria[] {
  const base = new Date('2026-08-08T09:00:00.000Z').getTime();
  const hora = (h: number) => new Date(base + h * 3_600_000).toISOString();
  return [
    { cuando: hora(4), usuario: 'Pancho (técnico)', rol: 'tecnico', accion: 'recomendacion', entidad: 'recomendacion', entidadId: 'demo', detalle: { texto: 'Entrar a Pastura 1 año. Asignar 2,2 ha/día.' } },
    { cuando: hora(3.5), usuario: 'Pancho (técnico)', rol: 'tecnico', accion: 'ingreso', entidad: null, entidadId: null, detalle: null },
    { cuando: hora(2), usuario: 'Benjamín (medidor)', rol: 'medidor', accion: 'sincronizacion', entidad: 'medicion', entidadId: null, detalle: { mediciones: 29, eventos: 1, dispositivo: 'Android · Moto G' } },
    { cuando: hora(0), usuario: 'Benjamín (medidor)', rol: 'medidor', accion: 'ingreso', entidad: null, entidadId: null, detalle: null },
  ];
}
