/**
 * Exportes para trazabilidad: planilla de Excel con todo el historial y
 * versión imprimible (PDF) del informe.
 */
import { generarXlsx, type Hoja } from '@pasto/core';
import type { AnalisisRecorrida, Recorrida } from './analisis.js';
import type { Auditoria, Campo, Evento, Medicion, Recomendacion } from './tipos.js';

const fechaHora = (iso: string): string => new Date(iso).toLocaleString('es-AR');

/**
 * Redondea de forma segura: los registros viejos pueden no traer todos los
 * campos, y un exporte nunca debe romperse por un dato faltante.
 */
const redondear = (v: number | undefined | null, d = 1): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(d)) : null;

export interface DatosExporte {
  campo: Campo;
  mediciones: Medicion[];
  eventos: Evento[];
  recomendaciones: Recomendacion[];
  recorridas: Recorrida[];
  auditoria?: Auditoria[];
}

/** Arma el libro de Excel con una hoja por tipo de registro. */
export function libroDeExcel(datos: DatosExporte): Uint8Array {
  const nombrePotrero = new Map(datos.campo.potreros.map((p) => [p.id, p.nombre]));

  const hojas: Hoja[] = [];

  hojas.push({
    nombre: 'Stock por recorrida',
    filas: [
      ['Fecha', ...datos.campo.potreros.map((p) => `${p.nombre} (kg MS/ha)`), 'Stock promedio'],
      ...datos.recorridas.map((r) => {
        const valores = datos.campo.potreros.map((p) => {
          const v = r.biomasas.get(p.id);
          return v === undefined ? null : redondear(v, 0);
        });
        const presentes = valores.filter((v): v is number => v !== null);
        const promedio = presentes.length
          ? redondear(presentes.reduce((a, b) => a + b, 0) / presentes.length, 0)
          : null;
        return [r.fecha, ...valores, promedio];
      }),
    ],
  });

  hojas.push({
    nombre: 'Mediciones',
    filas: [
      ['Fecha y hora', 'Potrero', 'Punto', 'Alturas (cm)', 'Altura promedio', 'kg MS/ha', 'Curva usada', 'Datum', 'Midió', 'Recibida'],
      ...datos.mediciones.map((m) => [
        fechaHora(m.fechaHora),
        nombrePotrero.get(m.potreroId) ?? m.potreroId,
        m.puntoId,
        m.lecturasCm.join(' · '),
        redondear(m.alturaPromedioCm),
        redondear(m.kgMSHa, 0),
        `kg MS/ha = ${m.curva.interseccion} + ${m.curva.pendiente} × cm`,
        m.curva.datum === 'ras_suelo' ? 'desde el ras del suelo' : 'por encima de 5 cm',
        m.usuario,
        m.recibidaEn ? fechaHora(m.recibidaEn) : '',
      ]),
    ],
  });

  hojas.push({
    nombre: 'Movimientos',
    filas: [
      ['Fecha y hora', 'Tipo', 'Potrero', 'Altura (cm)', 'Observaciones', 'Registró'],
      ...datos.eventos.map((e) => [
        fechaHora(e.fechaHora),
        e.tipo === 'entrada' ? 'Entrada' : 'Salida',
        nombrePotrero.get(e.potreroId) ?? e.potreroId,
        e.alturaCm ?? null,
        e.observaciones ?? '',
        e.usuario,
      ]),
    ],
  });

  hojas.push({
    nombre: 'Recomendaciones',
    filas: [
      ['Fecha y hora', 'Autor', 'Recomendación', 'Recorrida', 'Stock (kg MS/ha)', 'Balance (kg MS/día)'],
      ...datos.recomendaciones.map((r) => [
        fechaHora(r.fechaHora),
        r.autor,
        r.texto,
        r.datos?.fechaRecorrida ?? '',
        redondear(r.datos?.stockKgMSHa, 0),
        redondear(r.datos?.balanceKgMSDia, 0),
      ]),
    ],
  });

  hojas.push({
    nombre: 'Potreros',
    filas: [
      ['Potrero', 'Superficie (ha)', 'Superficie ganadera (ha)', 'Recurso'],
      ...datos.campo.potreros.map((p) => [
        p.nombre,
        p.superficieHa,
        p.supGanaderaHa,
        p.descripcionRecurso,
      ]),
    ],
  });

  if (datos.auditoria && datos.auditoria.length > 0) {
    hojas.push({
      nombre: 'Auditoría',
      filas: [
        ['Cuándo', 'Usuario', 'Rol', 'Acción', 'Entidad', 'Detalle'],
        ...datos.auditoria.map((a) => [
          fechaHora(a.cuando),
          a.usuario ?? '',
          a.rol ?? '',
          a.accion,
          a.entidad ?? '',
          a.detalle ? JSON.stringify(a.detalle) : '',
        ]),
      ],
    });
  }

  return generarXlsx(hojas);
}

/** Dispara la descarga de un archivo en el navegador. */
export function descargar(nombre: string, bytes: Uint8Array, tipo: string): void {
  const copia = new Uint8Array(bytes);
  const url = URL.createObjectURL(new Blob([copia.buffer as ArrayBuffer], { type: tipo }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function descargarExcel(datos: DatosExporte, analisis: AnalisisRecorrida | null): void {
  const sufijo = analisis?.fecha ?? new Date().toISOString().slice(0, 10);
  descargar(
    `pasto-${datos.campo.campo.toLowerCase().replace(/\s+/g, '-')}-${sufijo}.xlsx`,
    libroDeExcel(datos),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}

/**
 * El PDF se hace con la impresión del navegador ("Guardar como PDF"): usa el
 * mismo informe que se ve en pantalla, sin depender de otro programa.
 */
export function imprimirInforme(): void {
  window.print();
}
