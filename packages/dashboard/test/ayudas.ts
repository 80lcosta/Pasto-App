/**
 * Convierte las recorridas de demostración (biomasa por potrero y fecha) en
 * mediciones con la misma forma que las que carga el medidor, para que el
 * dashboard procese siempre la misma estructura de datos.
 */
import type { Campo, Evento, Medicion } from '../src/tipos.js';

export interface RecorridaDemo {
  fecha: string;
  biomasas: Record<string, number>;
  enPastoreo: string[];
}

export interface ArchivoDemo {
  recorridas: RecorridaDemo[];
  eventos: Evento[];
}

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
      const alturaCm = (kgMSHa - recurso.curva.interseccion) / recurso.curva.pendiente;
      mediciones.push({
        id: `demo-${potrero.id}-${recorrida.fecha}`,
        puntoId: `${potrero.id}-p1`,
        potreroId: potrero.id,
        fechaHora: `${recorrida.fecha}T12:00:00.000Z`,
        lecturasCm: [Math.round(alturaCm * 10) / 10],
        alturaPromedioCm: Math.round(alturaCm * 10) / 10,
        kgMSHa,
        curva: recurso.curva,
        usuario: 'demo',
      });
    }
  }
  return { mediciones, eventos: datos.eventos ?? [] };
}

/** Potreros que la demo marca en pastoreo en su última recorrida. */
export function enPastoreoUltimaRecorrida(archivo: unknown): string[] {
  const datos = archivo as ArchivoDemo;
  return datos.recorridas.at(-1)?.enPastoreo ?? [];
}
