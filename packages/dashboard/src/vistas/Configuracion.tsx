/**
 * Configuración del campo: los objetivos (que se van afinando con el uso) y
 * la carga de los límites de los potreros desde un KML de Google Earth.
 */
import { useState } from 'react';
import { leerKml, leerKmz, type PotreroKml } from '@pasto/core';
import { guardarTargets, importarPotreros } from '../api.js';
import type { Campo } from '../tipos.js';
import { dec } from '../formato.js';

export function Configuracion({ campo, alCambiar }: { campo: Campo; alCambiar: () => void }) {
  const [stock, setStock] = useState(String(campo.targets.stockKgMSHa));
  const [entrada, setEntrada] = useState(String(campo.targets.entradaKgMSHa));
  const [salida, setSalida] = useState(String(campo.targets.salidaKgMSHa));
  const [avisoTargets, setAvisoTargets] = useState('');
  const [errorTargets, setErrorTargets] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [leidos, setLeidos] = useState<PotreroKml[] | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [errorKml, setErrorKml] = useState('');
  const [avisoKml, setAvisoKml] = useState('');
  const [importando, setImportando] = useState(false);

  const yaExisten = new Set(campo.potreros.map((p) => p.nombre.trim().toLowerCase()));

  const guardar = async () => {
    setGuardando(true);
    setAvisoTargets('');
    setErrorTargets('');
    const r = await guardarTargets(campo.campoId, {
      stockKgMSHa: Number(stock),
      entradaKgMSHa: Number(entrada),
      salidaKgMSHa: Number(salida),
      datum: campo.targets.datum,
    });
    setGuardando(false);
    if (r.ok) {
      setAvisoTargets('✔ Objetivos guardados. El tablero ya usa los valores nuevos.');
      alCambiar();
    } else {
      setErrorTargets(r.error ?? 'No se pudo guardar');
    }
  };

  const elegirArchivo = async (archivo: File) => {
    setErrorKml('');
    setAvisoKml('');
    setLeidos(null);
    setNombreArchivo(archivo.name);
    try {
      const potreros = archivo.name.toLowerCase().endsWith('.kmz')
        ? await leerKmz(new Uint8Array(await archivo.arrayBuffer()))
        : leerKml(await archivo.text());
      if (potreros.length === 0) {
        setErrorKml('El archivo no tiene ningún potrero dibujado (solo se leen los polígonos).');
        return;
      }
      setLeidos(potreros);
    } catch (e) {
      setErrorKml(e instanceof Error ? e.message : 'No se pudo leer el archivo');
    }
  };

  const confirmar = async () => {
    if (!leidos) return;
    setImportando(true);
    const r = await importarPotreros(campo.campoId, leidos);
    setImportando(false);
    if (!r.ok) {
      setErrorKml(r.error ?? 'No se pudo guardar');
      return;
    }
    const partes = [
      r.creados?.length ? `${r.creados.length} potrero(s) nuevo(s)` : '',
      r.actualizados?.length ? `${r.actualizados.length} actualizado(s)` : '',
      r.omitidos?.length ? `${r.omitidos.length} omitido(s)` : '',
    ].filter(Boolean);
    setAvisoKml(`✔ Listo: ${partes.join(', ')}.`);
    setLeidos(null);
    alCambiar();
  };

  return (
    <>
      <div className="panel">
        <h2>Objetivos del campo</h2>
        <p className="sub">
          Con estos tres números se calcula todo el tablero. Se pueden ir ajustando a medida que
          se conoce el campo: cada cambio queda registrado en la auditoría, con el valor anterior.
        </p>

        {errorTargets && <div className="aviso-error">{errorTargets}</div>}
        {avisoTargets && <div className="aviso-ok">{avisoTargets}</div>}

        <div className="rejilla tres">
          <div>
            <label className="etiqueta" htmlFor="entrada">Biomasa de entrada (kg MS/ha)</label>
            <input id="entrada" className="entrada bloque" inputMode="numeric" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
            <p className="pie">Con cuánto pasto conviene que entren los animales.</p>
          </div>
          <div>
            <label className="etiqueta" htmlFor="stock">Stock objetivo (kg MS/ha)</label>
            <input id="stock" className="entrada bloque" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
            <p className="pie">El promedio que se busca mantener en todo el campo.</p>
          </div>
          <div>
            <label className="etiqueta" htmlFor="salida">Biomasa de salida (kg MS/ha)</label>
            <input id="salida" className="entrada bloque" inputMode="numeric" value={salida} onChange={(e) => setSalida(e.target.value)} />
            <p className="pie">Cuánto remanente hay que dejar al salir.</p>
          </div>
        </div>

        <div className="fila-form">
          <button className="boton" disabled={guardando} onClick={guardar}>
            {guardando ? 'Guardando…' : 'Guardar objetivos'}
          </button>
          <span className="pie">
            Medidos {campo.targets.datum === 'ras_suelo' ? 'desde el ras del suelo' : 'por encima de 5 cm'}.
            Referencia de la Guía INTA: stock 1.500–2.000, entrada 2.000–2.500, salida 1.000–1.500.
          </span>
        </div>
      </div>

      <div className="panel">
        <h2>Límites de los potreros</h2>
        <p className="sub">
          Subí el archivo <strong>KML</strong> (o KMZ) que exportás de Google Earth. Cada potrero
          dibujado se carga con su superficie calculada. Los que ya existen con el mismo nombre
          reciben el límite sin perder sus mediciones.
        </p>

        {errorKml && <div className="aviso-error">{errorKml}</div>}
        {avisoKml && <div className="aviso-ok">{avisoKml}</div>}

        <input
          type="file"
          accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
          className="entrada bloque"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) void elegirArchivo(archivo);
          }}
        />

        {leidos && (
          <>
            <h3 className="subtitulo">
              {leidos.length} potrero(s) en {nombreArchivo} — revisá antes de guardar
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Potrero</th>
                    <th className="num">Superficie calculada</th>
                    <th>Qué va a pasar</th>
                  </tr>
                </thead>
                <tbody>
                  {leidos.map((p) => {
                    const existe = yaExisten.has(p.nombre.trim().toLowerCase());
                    return (
                      <tr key={p.nombre}>
                        <td>{p.nombre}</td>
                        <td className="num">{dec(p.superficieHa, 1)} ha</td>
                        <td>
                          <span className={`pastilla ${existe ? 'en_descanso' : 'listo'}`}>
                            {existe ? 'Actualiza el existente' : 'Se crea nuevo'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="fila-form">
              <button className="boton" disabled={importando} onClick={confirmar}>
                {importando ? 'Guardando…' : 'Guardar estos potreros'}
              </button>
              <button className="boton secundario" onClick={() => setLeidos(null)}>
                Cancelar
              </button>
            </div>
            <p className="pie">
              La superficie se calcula sobre el dibujo. Si no coincide con la que tenías anotada,
              revisá el polígono en Google Earth antes de guardar.
            </p>
          </>
        )}
      </div>
    </>
  );
}
