/**
 * Lectura de archivos KML (los que se exportan de Google Earth) para levantar
 * los límites de los potreros, y cálculo de la superficie de cada uno.
 *
 * Sin dependencias: corre igual en el navegador y en el servidor. Se lee el
 * subconjunto de KML que exporta Google Earth (Placemark con Polygon o
 * MultiGeometry), que es regular y generado por máquina.
 */

/** Un punto del alambrado: [longitud, latitud] en grados. */
export type Coordenada = [number, number];

/** Un polígono: el anillo exterior y, si tiene, los huecos. */
export interface Poligono {
  exterior: Coordenada[];
  huecos: Coordenada[][];
}

export interface PotreroKml {
  nombre: string;
  poligonos: Poligono[];
  /** Superficie calculada sobre el elipsoide, en hectáreas. */
  superficieHa: number;
  /** GeoJSON listo para guardar (Polygon o MultiPolygon). */
  geometria: GeometriaGeoJson;
}

export type GeometriaGeoJson =
  | { type: 'Polygon'; coordinates: Coordenada[][] }
  | { type: 'MultiPolygon'; coordinates: Coordenada[][][] };

/** Radio medio terrestre (IUGG), en metros. */
const RADIO_TIERRA_M = 6_371_008.8;
const aRadianes = (grados: number) => (grados * Math.PI) / 180;

/**
 * Superficie de un anillo sobre la esfera, en m² (fórmula del exceso
 * esférico). Devuelve el valor absoluto: no importa si el anillo viene en
 * sentido horario o antihorario.
 */
export function superficieM2(anillo: Coordenada[]): number {
  if (anillo.length < 3) return 0;
  // Si el anillo viene cerrado (último punto igual al primero), se ignora el repetido.
  const puntos =
    anillo.length > 3 &&
    anillo[0]![0] === anillo[anillo.length - 1]![0] &&
    anillo[0]![1] === anillo[anillo.length - 1]![1]
      ? anillo.slice(0, -1)
      : anillo;
  if (puntos.length < 3) return 0;

  let total = 0;
  for (let i = 0; i < puntos.length; i++) {
    const [lon1, lat1] = puntos[i]!;
    const [lon2, lat2] = puntos[(i + 1) % puntos.length]!;
    total +=
      aRadianes(lon2 - lon1) * (2 + Math.sin(aRadianes(lat1)) + Math.sin(aRadianes(lat2)));
  }
  return Math.abs((total * RADIO_TIERRA_M * RADIO_TIERRA_M) / 2);
}

/** Superficie de un polígono con sus huecos, en hectáreas. */
export function superficieHa(poligono: Poligono): number {
  const bruta = superficieM2(poligono.exterior);
  const huecos = poligono.huecos.reduce((a, h) => a + superficieM2(h), 0);
  return Math.max(0, (bruta - huecos) / 10_000);
}

/** Convierte el bloque de texto `<coordinates>` de KML en una lista de puntos. */
export function leerCoordenadas(texto: string): Coordenada[] {
  const puntos: Coordenada[] = [];
  for (const trozo of texto.trim().split(/\s+/)) {
    if (!trozo) continue;
    const partes = trozo.split(',');
    if (partes.length < 2) continue;
    const lon = Number(partes[0]);
    const lat = Number(partes[1]);
    // KML usa longitud,latitud (al revés que lo habitual): se valida el rango.
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    puntos.push([lon, lat]);
  }
  return puntos;
}

const limpiar = (texto: string): string =>
  texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

/** Extrae los bloques de un mismo elemento, sin anidamiento. */
function bloques(texto: string, etiqueta: string): string[] {
  const patron = new RegExp(`<${etiqueta}\\b[^>]*>([\\s\\S]*?)</${etiqueta}>`, 'gi');
  return [...texto.matchAll(patron)].map((m) => m[1] ?? '');
}

function primerBloque(texto: string, etiqueta: string): string | null {
  const patron = new RegExp(`<${etiqueta}\\b[^>]*>([\\s\\S]*?)</${etiqueta}>`, 'i');
  return patron.exec(texto)?.[1] ?? null;
}

function leerPoligono(xml: string): Poligono | null {
  const exteriorXml = primerBloque(xml, 'outerBoundaryIs');
  const coordsXml = exteriorXml ? primerBloque(exteriorXml, 'coordinates') : null;
  if (!coordsXml) return null;
  const exterior = leerCoordenadas(coordsXml);
  if (exterior.length < 3) return null;

  const huecos: Coordenada[][] = [];
  for (const interiorXml of bloques(xml, 'innerBoundaryIs')) {
    const c = primerBloque(interiorXml, 'coordinates');
    if (!c) continue;
    const anillo = leerCoordenadas(c);
    if (anillo.length >= 3) huecos.push(anillo);
  }
  return { exterior, huecos };
}

/** Cierra el anillo si viene abierto, como pide GeoJSON. */
function cerrar(anillo: Coordenada[]): Coordenada[] {
  const primero = anillo[0]!;
  const ultimo = anillo[anillo.length - 1]!;
  return primero[0] === ultimo[0] && primero[1] === ultimo[1] ? anillo : [...anillo, primero];
}

function aGeoJson(poligonos: Poligono[]): GeometriaGeoJson {
  const anillos = poligonos.map((p) => [cerrar(p.exterior), ...p.huecos.map(cerrar)]);
  return anillos.length === 1
    ? { type: 'Polygon', coordinates: anillos[0]! }
    : { type: 'MultiPolygon', coordinates: anillos };
}

/**
 * Lee un KML y devuelve un potrero por cada Placemark que tenga polígono.
 * Los Placemark sin polígono (marcadores, líneas) se ignoran.
 */
export function leerKml(texto: string): PotreroKml[] {
  const potreros: PotreroKml[] = [];
  let sinNombre = 0;

  for (const marca of bloques(texto, 'Placemark')) {
    const poligonos: Poligono[] = [];
    for (const poliXml of bloques(marca, 'Polygon')) {
      const p = leerPoligono(poliXml);
      if (p) poligonos.push(p);
    }
    if (poligonos.length === 0) continue;

    const nombreXml = primerBloque(marca, 'name');
    sinNombre += nombreXml ? 0 : 1;
    const nombre = nombreXml ? limpiar(nombreXml) : `Potrero sin nombre ${sinNombre}`;

    potreros.push({
      nombre: nombre || `Potrero sin nombre ${++sinNombre}`,
      poligonos,
      superficieHa: Number(poligonos.reduce((a, p) => a + superficieHa(p), 0).toFixed(2)),
      geometria: aGeoJson(poligonos),
    });
  }
  return potreros;
}

/**
 * Un KMZ es un ZIP con el KML adentro. Se descomprime con la API del
 * navegador (DecompressionStream), sin librerías.
 */
export async function leerKmz(datos: Uint8Array): Promise<PotreroKml[]> {
  const texto = await extraerKmlDeKmz(datos);
  return leerKml(texto);
}

/** Saca el primer archivo .kml de un ZIP (soporta guardado y desinflado). */
export async function extraerKmlDeKmz(datos: Uint8Array): Promise<string> {
  const vista = new DataView(datos.buffer, datos.byteOffset, datos.byteLength);
  let posicion = 0;

  while (posicion + 30 <= datos.length && vista.getUint32(posicion, true) === 0x04034b50) {
    const metodo = vista.getUint16(posicion + 8, true);
    const banderas = vista.getUint16(posicion + 6, true);
    const tamComprimido = vista.getUint32(posicion + 18, true);
    const largoNombre = vista.getUint16(posicion + 26, true);
    const largoExtra = vista.getUint16(posicion + 28, true);
    const nombre = new TextDecoder().decode(
      datos.subarray(posicion + 30, posicion + 30 + largoNombre),
    );
    const inicioDatos = posicion + 30 + largoNombre + largoExtra;

    if (banderas & 0x08) {
      // El tamaño va en un descriptor posterior: no se puede recorrer así.
      throw new Error('El KMZ usa un formato que no se puede leer. Descomprimilo y subí el .kml.');
    }

    if (nombre.toLowerCase().endsWith('.kml')) {
      const crudo = datos.subarray(inicioDatos, inicioDatos + tamComprimido);
      if (metodo === 0) return new TextDecoder().decode(crudo);
      if (metodo === 8) {
        if (typeof DecompressionStream === 'undefined') {
          throw new Error('Este navegador no puede abrir KMZ. Subí el archivo .kml.');
        }
        const flujo = new Blob([crudo as unknown as BlobPart])
          .stream()
          .pipeThrough(new DecompressionStream('deflate-raw'));
        return new TextDecoder().decode(await new Response(flujo).arrayBuffer());
      }
      throw new Error('El KMZ está comprimido de una forma que no se puede leer.');
    }
    posicion = inicioDatos + tamComprimido;
  }
  throw new Error('El archivo no tiene ningún .kml adentro.');
}
