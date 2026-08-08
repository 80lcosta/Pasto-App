/**
 * Cliente de la API de desarrollo. Si el servidor no está disponible, el
 * dashboard cae a los datos de demostración del paquete compartido para que
 * se pueda mostrar/demostrar sin backend.
 */
import campoJson from '@pasto/campo-demo/loma-alta.json';
import demoJson from '@pasto/campo-demo/recorridas-demo.json';
import type { Campo, Evento, Medicion, Recomendacion } from './tipos.js';
import { medicionesDeDemo } from './demo.js';

export const URL_SERVIDOR =
  (import.meta.env['VITE_URL_SERVIDOR'] as string | undefined) ?? 'http://localhost:8787';

export interface DatosDashboard {
  campo: Campo;
  mediciones: Medicion[];
  eventos: Evento[];
  recomendaciones: Recomendacion[];
  /** true si no se pudo hablar con el servidor y se usan datos de demostración. */
  modoDemo: boolean;
}

async function traer<T>(ruta: string): Promise<T> {
  const resp = await fetch(`${URL_SERVIDOR}${ruta}`);
  if (!resp.ok) throw new Error(`${ruta}: ${resp.status}`);
  return (await resp.json()) as T;
}

export async function cargarDatos(): Promise<DatosDashboard> {
  const campoDemo = campoJson as unknown as Campo;
  try {
    const [campo, mediciones, eventos, recomendaciones] = await Promise.all([
      traer<Campo>('/api/campo'),
      traer<Medicion[]>('/api/mediciones'),
      traer<Evento[]>('/api/eventos'),
      traer<Recomendacion[]>('/api/recomendaciones'),
    ]);
    // Sin mediciones cargadas todavía, el tablero no tiene nada que mostrar:
    // se completa con la recorrida de demostración.
    if (mediciones.length === 0) {
      const demo = medicionesDeDemo(demoJson, campo);
      return {
        campo,
        mediciones: demo.mediciones,
        eventos: [...demo.eventos, ...eventos],
        recomendaciones,
        modoDemo: true,
      };
    }
    return { campo, mediciones, eventos, recomendaciones, modoDemo: false };
  } catch {
    const demo = medicionesDeDemo(demoJson, campoDemo);
    return {
      campo: campoDemo,
      mediciones: demo.mediciones,
      eventos: demo.eventos,
      recomendaciones: [],
      modoDemo: true,
    };
  }
}

export async function publicarRecomendacion(r: Recomendacion): Promise<boolean> {
  try {
    const resp = await fetch(`${URL_SERVIDOR}/api/recomendaciones`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(r),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
