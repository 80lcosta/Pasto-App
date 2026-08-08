/**
 * Lógica pura de la cola de sincronización (append-only, idempotente).
 */
import { describe, expect, it } from 'vitest';
import type { EventoLocal, MedicionLocal } from '../src/db.js';
import { armarPaqueteSync, hayAlgoParaSincronizar, idsConfirmados } from '../src/sync-nucleo.js';

const medicion = (id: string, estadoSync: 'pendiente' | 'enviado'): MedicionLocal => ({
  id,
  puntoId: 'p1',
  potreroId: 'pot1',
  fechaHora: '2026-08-08T10:00:00.000Z',
  lecturasCm: [12, 14, 0],
  alturaPromedioCm: 8.7,
  kgMSHa: 1069,
  curva: { pendiente: 144, interseccion: -177, datum: 'ras_suelo' },
  usuario: 'benja',
  estadoSync,
});

const evento = (id: string, estadoSync: 'pendiente' | 'enviado'): EventoLocal => ({
  id,
  tipo: 'entrada',
  potreroId: 'pot1',
  rodeoId: 'r1',
  fechaHora: '2026-08-08T09:00:00.000Z',
  usuario: 'benja',
  estadoSync,
});

describe('sync-nucleo', () => {
  it('el paquete solo lleva registros pendientes', () => {
    const p = armarPaqueteSync(
      [medicion('m1', 'pendiente'), medicion('m2', 'enviado')],
      [evento('e1', 'enviado'), evento('e2', 'pendiente')],
      'benja',
      'test',
    );
    expect(p.mediciones.map((m) => m.id)).toEqual(['m1']);
    expect(p.eventos.map((e) => e.id)).toEqual(['e2']);
    expect(hayAlgoParaSincronizar(p)).toBe(true);
  });

  it('sin pendientes no hay nada para sincronizar', () => {
    const p = armarPaqueteSync([medicion('m1', 'enviado')], [], 'benja', 'test');
    expect(hayAlgoParaSincronizar(p)).toBe(false);
  });

  it('solo se marcan como enviados los ids que el servidor confirmó', () => {
    const p = armarPaqueteSync(
      [medicion('m1', 'pendiente'), medicion('m2', 'pendiente')],
      [evento('e1', 'pendiente')],
      'benja',
      'test',
    );
    const ok = idsConfirmados(p, { aceptadas: ['m1', 'e1', 'otro-desconocido'] });
    expect(ok.mediciones).toEqual(['m1']);
    expect(ok.eventos).toEqual(['e1']);
    // m2 queda pendiente para el próximo intento
  });
});
