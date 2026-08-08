/**
 * El exporte no puede romperse por datos incompletos: un registro viejo sin
 * todos los campos tiene que salir igual, con la celda vacía.
 */
import { describe, expect, it } from 'vitest';
import campoJson from '@pasto/campo-demo/loma-alta.json';
import { agruparRecorridas } from '../src/analisis.js';
import { libroDeExcel } from '../src/exportar.js';
import type { Campo, Evento, Medicion, Recomendacion } from '../src/tipos.js';

const campo = campoJson as unknown as Campo;

const medicion: Medicion = {
  id: 'm1',
  puntoId: 'pastura-1-p1',
  potreroId: 'pastura-1',
  fechaHora: '2026-08-08T12:00:00.000Z',
  lecturasCm: [19, 21],
  alturaPromedioCm: 20,
  kgMSHa: 2703,
  curva: { pendiente: 144, interseccion: -177, datum: 'ras_suelo' },
  usuario: 'Benjamín (medidor)',
};

const evento: Evento = {
  id: 'e1',
  tipo: 'entrada',
  potreroId: 'bulevard',
  rodeoId: 'rodeo-general',
  fechaHora: '2026-08-02T09:30:00.000Z',
  usuario: 'Benjamín (medidor)',
};

const base = {
  campo,
  mediciones: [medicion],
  eventos: [evento],
  recorridas: agruparRecorridas([medicion]),
};

describe('libroDeExcel', () => {
  it('genera un libro válido con las hojas esperadas', () => {
    const bytes = libroDeExcel({ ...base, recomendaciones: [] });
    expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b]); // firma ZIP
    const contenido = new TextDecoder().decode(bytes);
    for (const hoja of ['Stock por recorrida', 'Mediciones', 'Movimientos', 'Recomendaciones', 'Potreros']) {
      expect(contenido).toContain(hoja);
    }
  });

  it('no se rompe con una recomendación sin todos los datos', () => {
    const parcial: Recomendacion = {
      id: 'r1',
      fechaHora: '2026-08-08T13:00:00.000Z',
      autor: 'Pancho',
      texto: 'Entrar a Pastura 1 año.',
      // Falta balanceKgMSDia: pasaba con las recomendaciones cargadas antes.
      datos: { fechaRecorrida: '2026-08-08', stockKgMSHa: 1445 } as Recomendacion['datos'],
    };
    expect(() => libroDeExcel({ ...base, recomendaciones: [parcial] })).not.toThrow();
  });

  it('tampoco se rompe si la recomendación no trae datos de la recorrida', () => {
    const sinDatos: Recomendacion = {
      id: 'r2',
      fechaHora: '2026-08-08T13:00:00.000Z',
      autor: 'Pancho',
      texto: 'Nota suelta.',
    };
    const bytes = libroDeExcel({ ...base, recomendaciones: [sinDatos] });
    expect(new TextDecoder().decode(bytes)).toContain('Nota suelta.');
  });

  it('incluye la hoja de auditoría solo cuando hay registros', () => {
    const sin = new TextDecoder().decode(libroDeExcel({ ...base, recomendaciones: [] }));
    expect(sin).not.toContain('Auditoría');

    const con = new TextDecoder().decode(
      libroDeExcel({
        ...base,
        recomendaciones: [],
        auditoria: [
          {
            cuando: '2026-08-08T13:00:00.000Z',
            usuario: 'Pancho (técnico)',
            rol: 'tecnico',
            accion: 'recomendacion',
            entidad: 'recomendacion',
            entidadId: 'r1',
            detalle: { texto: 'Entrar a Pastura 1 año' },
          },
        ],
      }),
    );
    expect(con).toContain('Auditoría');
  });
});
