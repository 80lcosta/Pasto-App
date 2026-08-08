/**
 * Lectura de KML y cálculo de superficies.
 *
 * La superficie se contrasta contra valores conocidos: un cuadrado de 1 km de
 * lado tiene 100 ha, y un grado de latitud son ~111,2 km.
 */
import { describe, expect, it } from 'vitest';
import { leerCoordenadas, leerKml, superficieHa, superficieM2, type Coordenada } from '../src/index.js';

/**
 * El cuadrado de prueba se arma con una aproximación plana (111.320 m por
 * grado de latitud), así que sobre el elipsoide su superficie no da exacta:
 * se compara con tolerancia relativa del 0,5 %.
 */
function cercaDe(valor: number, esperado: number, tolerancia = 0.005): void {
  expect(Math.abs(valor - esperado) / esperado).toBeLessThan(tolerancia);
}

/** Cuadrado aproximado de `lados` metros centrado en Tandil. */
function cuadrado(lados: number, latCentro = -37.32, lonCentro = -59.13): Coordenada[] {
  const dLat = lados / 2 / 111_320;
  const dLon = lados / 2 / (111_320 * Math.cos((latCentro * Math.PI) / 180));
  return [
    [lonCentro - dLon, latCentro - dLat],
    [lonCentro + dLon, latCentro - dLat],
    [lonCentro + dLon, latCentro + dLat],
    [lonCentro - dLon, latCentro + dLat],
    [lonCentro - dLon, latCentro - dLat],
  ];
}

const kmlDeEjemplo = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
  <name>Loma Alta</name>
  <Folder><name>Potreros</name>
    <Placemark>
      <name><![CDATA[Pastura 1 año]]></name>
      <Polygon><outerBoundaryIs><LinearRing><coordinates>
        ${cuadrado(1000).map(([lo, la]) => `${lo},${la},0`).join(' ')}
      </coordinates></LinearRing></outerBoundaryIs></Polygon>
    </Placemark>
    <Placemark>
      <name>Aguada</name>
      <Point><coordinates>-59.13,-37.32,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>Bulevard &amp; cía</name>
      <Polygon>
        <outerBoundaryIs><LinearRing><coordinates>
          ${cuadrado(2000).map(([lo, la]) => `${lo},${la},0`).join(' ')}
        </coordinates></LinearRing></outerBoundaryIs>
        <innerBoundaryIs><LinearRing><coordinates>
          ${cuadrado(1000).map(([lo, la]) => `${lo},${la},0`).join(' ')}
        </coordinates></LinearRing></innerBoundaryIs>
      </Polygon>
    </Placemark>
  </Folder>
</Document></kml>`;

describe('Superficie', () => {
  it('un cuadrado de 1 km de lado da 100 ha', () => {
    cercaDe(superficieM2(cuadrado(1000)) / 10_000, 100);
  });

  it('un cuadrado de 2 km de lado da 400 ha', () => {
    cercaDe(superficieM2(cuadrado(2000)) / 10_000, 400);
  });

  it('no importa el sentido en que venga dibujado el alambrado', () => {
    const derecho = cuadrado(1000);
    const alReves = [...derecho].reverse();
    expect(superficieM2(alReves)).toBeCloseTo(superficieM2(derecho), 3);
  });

  it('los huecos se descuentan', () => {
    const conHueco = { exterior: cuadrado(2000), huecos: [cuadrado(1000)] };
    cercaDe(superficieHa(conHueco), 300); // 400 − 100
  });

  it('un anillo con menos de 3 puntos no tiene superficie', () => {
    expect(superficieM2([[-59, -37], [-59.1, -37.1]])).toBe(0);
  });
});

describe('leerCoordenadas', () => {
  it('lee longitud,latitud,altura separadas por espacios o saltos', () => {
    const puntos = leerCoordenadas('-59.1,-37.3,0\n  -59.2,-37.4,0   -59.3,-37.5');
    expect(puntos).toEqual([
      [-59.1, -37.3],
      [-59.2, -37.4],
      [-59.3, -37.5],
    ]);
  });

  it('descarta coordenadas fuera de rango o rotas', () => {
    expect(leerCoordenadas('-59.1,-37.3,0 999,999,0 basura')).toEqual([[-59.1, -37.3]]);
  });
});

describe('leerKml', () => {
  const potreros = leerKml(kmlDeEjemplo);

  it('toma solo los Placemark que tienen polígono (ignora aguadas y marcas)', () => {
    expect(potreros).toHaveLength(2);
    expect(potreros.map((p) => p.nombre)).toEqual(['Pastura 1 año', 'Bulevard & cía']);
  });

  it('resuelve los nombres con CDATA y con caracteres escapados', () => {
    expect(potreros[0]!.nombre).toBe('Pastura 1 año');
    expect(potreros[1]!.nombre).toBe('Bulevard & cía');
  });

  it('calcula la superficie de cada potrero, descontando huecos', () => {
    cercaDe(potreros[0]!.superficieHa, 100);
    cercaDe(potreros[1]!.superficieHa, 300);
  });

  it('devuelve GeoJSON con el anillo cerrado', () => {
    const g = potreros[0]!.geometria;
    expect(g.type).toBe('Polygon');
    const anillo = (g as { coordinates: Coordenada[][] }).coordinates[0]!;
    expect(anillo[0]).toEqual(anillo[anillo.length - 1]);
  });

  it('un archivo sin polígonos devuelve la lista vacía, no un error', () => {
    expect(leerKml('<kml><Document></Document></kml>')).toEqual([]);
  });

  it('los Placemark sin nombre reciben uno provisorio', () => {
    const sinNombre = `<kml><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>
      ${cuadrado(500).map(([lo, la]) => `${lo},${la},0`).join(' ')}
    </coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>`;
    expect(leerKml(sinNombre)[0]!.nombre).toMatch(/sin nombre/i);
  });
});
