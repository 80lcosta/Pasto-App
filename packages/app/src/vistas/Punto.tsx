/**
 * Captura de un punto de medición: varias lecturas de altura (plato o regla),
 * promedio y conversión inmediata a kg MS/ha con la curva del recurso.
 * El cero se usa para maleza o suelo desnudo (Guía Anexo 1) con botón propio.
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { alturaABiomasaKgMSHa, promedioAlturasCm } from '@pasto/core';
import { db, type GpsLocal } from '../db.js';
import { leerMeta } from '../db.js';

function gpsActual(): Promise<GpsLocal | undefined> {
  return new Promise((resolver) => {
    if (!('geolocation' in navigator)) return resolver(undefined);
    const timeout = window.setTimeout(() => resolver(undefined), 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timeout);
        resolver({ lat: pos.coords.latitude, lon: pos.coords.longitude, precisionM: pos.coords.accuracy });
      },
      () => {
        window.clearTimeout(timeout);
        resolver(undefined);
      },
      { enableHighAccuracy: true, timeout: 3500, maximumAge: 60_000 },
    );
  });
}

export function Punto(props: { puntoId: string; volver: () => void }) {
  const [tecleado, setTecleado] = useState('');
  const [lecturas, setLecturas] = useState<number[]>([]);
  const [guardado, setGuardado] = useState<number | null>(null);

  const datos = useLiveQuery(async () => {
    const punto = await db.puntos.get(props.puntoId);
    if (!punto) return null;
    const potrero = await db.potreros.get(punto.potreroId);
    const recurso = potrero ? await db.recursos.get(potrero.recursoId) : undefined;
    return { punto, potrero, recurso };
  }, [props.puntoId]);

  if (!datos) return <p className="nota">Cargando…</p>;
  const { punto, potrero, recurso } = datos;
  if (!punto || !potrero || !recurso) return <p className="nota">Punto no encontrado.</p>;

  const alturaTecleada = tecleado === '' ? null : Number(tecleado.replace(',', '.'));
  const promedio = lecturas.length > 0 ? promedioAlturasCm(lecturas) : null;
  const kgMS = promedio !== null ? alturaABiomasaKgMSHa(promedio, recurso.curva) : null;

  const tocarTecla = (t: string) => {
    setGuardado(null);
    if (t === '←') return setTecleado((v) => v.slice(0, -1));
    if (t === ',') return setTecleado((v) => (v.includes(',') || v === '' ? v : `${v},`));
    setTecleado((v) => (v.length >= 5 ? v : `${v}${t}`));
  };

  const agregarLectura = (valor: number) => {
    if (!Number.isFinite(valor) || valor < 0 || valor > 120) return;
    setLecturas((ls) => [...ls, valor]);
    setTecleado('');
  };

  const guardarPunto = async () => {
    if (lecturas.length === 0 || promedio === null || kgMS === null) return;
    const usuario = await leerMeta('usuario', 'medidor');
    const gps = await gpsActual();
    await db.mediciones.add({
      id: crypto.randomUUID(),
      puntoId: punto.id,
      potreroId: potrero.id,
      fechaHora: new Date().toISOString(),
      lecturasCm: lecturas,
      alturaPromedioCm: promedio,
      kgMSHa: kgMS,
      curva: recurso.curva,
      usuario,
      estadoSync: 'pendiente',
      ...(gps ? { gps } : {}),
    });
    setGuardado(kgMS);
    setLecturas([]);
    setTecleado('');
  };

  return (
    <div className="pantalla-punto">
      <div className="tarjeta">
        <h2>
          {potrero.nombre} · {punto.nombre}
        </h2>
        <p className="sub">{recurso.nombre}</p>
      </div>

      {guardado !== null && (
        <div className="aviso-ok">
          ✔ Guardado: {Math.round(guardado).toLocaleString('es-AR')} kg MS/ha. Podés pasar al
          siguiente punto.
        </div>
      )}

      <div className="visor">
        <div className="altura">
          {tecleado !== '' ? tecleado : promedio !== null ? promedio.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '—'}
          <span className="unidad"> cm</span>
        </div>
        <div className="equivalencia">
          {kgMS !== null
            ? `≈ ${Math.round(kgMS).toLocaleString('es-AR')} kg MS/ha (${lecturas.length} lecturas)`
            : 'Cargá lecturas de altura'}
        </div>
        {lecturas.length > 0 && (
          <div className="lecturas">{lecturas.map((l) => l.toLocaleString('es-AR')).join(' · ')}</div>
        )}
      </div>

      <div className="teclado">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', '←'].map((t) => (
          <button key={t} onClick={() => tocarTecla(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="fila-botones">
        <button
          className="boton secundario"
          disabled={alturaTecleada === null || Number.isNaN(alturaTecleada)}
          onClick={() => alturaTecleada !== null && agregarLectura(alturaTecleada)}
        >
          + Agregar lectura
        </button>
        <button className="boton suave" onClick={() => agregarLectura(0)}>
          0 · maleza / suelo desnudo
        </button>
      </div>

      <button className="boton primario" disabled={lecturas.length === 0} onClick={guardarPunto}>
        Guardar punto ({lecturas.length} lecturas)
      </button>
      <button className="boton suave" onClick={props.volver}>
        ← Volver a la recorrida
      </button>
      {recurso.notaCurva && <p className="nota">{recurso.notaCurva}</p>}
    </div>
  );
}
