/**
 * Generador de archivos .xlsx sin dependencias, para los exportes.
 *
 * Un .xlsx es un ZIP con XML adentro. Se escriben las entradas del ZIP sin
 * comprimir (método "stored", 0), que es válido según la especificación y
 * Excel/LibreOffice lo aceptan; así el mismo código corre en el navegador y
 * en el servidor sin depender de zlib.
 */

export type Celda = string | number | null | undefined;

export interface Hoja {
  /** Nombre de la solapa (Excel: máx. 31 caracteres, sin : \ / ? * [ ]). */
  nombre: string;
  /** Primera fila = encabezados. */
  filas: Celda[][];
}

const CODIGOS_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[i] = c >>> 0;
  }
  return tabla;
})();

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = CODIGOS_CRC[(c ^ datos[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function texto(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function escapar(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Excel rechaza los caracteres de control salvo tab, salto y retorno.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** Nombre de columna de Excel: 1 → A, 27 → AA. */
export function columnaExcel(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const resto = (x - 1) % 26;
    s = String.fromCharCode(65 + resto) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

/** Excel limita los nombres de solapa a 31 caracteres y prohíbe : \ / ? * [ ] */
export function nombreHojaValido(nombre: string): string {
  const limpio = nombre.replace(/[:\\/?*[\]]/g, ' ').trim() || 'Hoja';
  return limpio.slice(0, 31);
}

function hojaXml(hoja: Hoja): string {
  const filas = hoja.filas
    .map((fila, i) => {
      const nf = i + 1;
      const celdas = fila
        .map((valor, j) => {
          if (valor === null || valor === undefined || valor === '') return '';
          const ref = `${columnaExcel(j + 1)}${nf}`;
          if (typeof valor === 'number' && Number.isFinite(valor)) {
            return `<c r="${ref}"><v>${valor}</v></c>`;
          }
          const estilo = i === 0 ? ' s="1"' : '';
          return `<c r="${ref}" t="inlineStr"${estilo}><is><t xml:space="preserve">${escapar(String(valor))}</t></is></c>`;
        })
        .join('');
      return `<row r="${nf}">${celdas}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${filas}</sheetData></worksheet>`;
}

interface EntradaZip {
  nombre: string;
  datos: Uint8Array;
}

function armarZip(entradas: EntradaZip[]): Uint8Array {
  const locales: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const entrada of entradas) {
    const nombre = texto(entrada.nombre);
    const crc = crc32(entrada.datos);
    const tam = entrada.datos.length;

    const encabezado = new Uint8Array(30 + nombre.length);
    const vista = new DataView(encabezado.buffer);
    vista.setUint32(0, 0x04034b50, true); // firma local
    vista.setUint16(4, 20, true); // versión necesaria
    vista.setUint16(6, 0, true); // banderas
    vista.setUint16(8, 0, true); // método: stored
    vista.setUint16(10, 0, true); // hora
    vista.setUint16(12, 0x0021, true); // fecha (1980-01-01)
    vista.setUint32(14, crc, true);
    vista.setUint32(18, tam, true); // comprimido
    vista.setUint32(22, tam, true); // sin comprimir
    vista.setUint16(26, nombre.length, true);
    vista.setUint16(28, 0, true); // extra
    encabezado.set(nombre, 30);

    locales.push(encabezado, entrada.datos);

    const dirEntrada = new Uint8Array(46 + nombre.length);
    const vd = new DataView(dirEntrada.buffer);
    vd.setUint32(0, 0x02014b50, true); // firma central
    vd.setUint16(4, 20, true); // versión creador
    vd.setUint16(6, 20, true); // versión necesaria
    vd.setUint16(8, 0, true);
    vd.setUint16(10, 0, true); // stored
    vd.setUint16(12, 0, true);
    vd.setUint16(14, 0x0021, true);
    vd.setUint32(16, crc, true);
    vd.setUint32(20, tam, true);
    vd.setUint32(24, tam, true);
    vd.setUint16(28, nombre.length, true);
    vd.setUint16(30, 0, true); // extra
    vd.setUint16(32, 0, true); // comentario
    vd.setUint16(34, 0, true); // disco
    vd.setUint16(36, 0, true); // atributos internos
    vd.setUint32(38, 0, true); // atributos externos
    vd.setUint32(42, desplazamiento, true);
    dirEntrada.set(nombre, 46);
    central.push(dirEntrada);

    desplazamiento += encabezado.length + tam;
  }

  const tamCentral = central.reduce((a, b) => a + b.length, 0);
  const fin = new Uint8Array(22);
  const vf = new DataView(fin.buffer);
  vf.setUint32(0, 0x06054b50, true);
  vf.setUint16(8, entradas.length, true);
  vf.setUint16(10, entradas.length, true);
  vf.setUint32(12, tamCentral, true);
  vf.setUint32(16, desplazamiento, true);

  const partes = [...locales, ...central, fin];
  const total = partes.reduce((a, p) => a + p.length, 0);
  const salida = new Uint8Array(total);
  let pos = 0;
  for (const parte of partes) {
    salida.set(parte, pos);
    pos += parte.length;
  }
  return salida;
}

/** Arma un libro de Excel (.xlsx) con una o más hojas. */
export function generarXlsx(hojas: Hoja[]): Uint8Array {
  if (hojas.length === 0) throw new Error('El libro necesita al menos una hoja');
  const nombres = hojas.map((h) => nombreHojaValido(h.nombre));

  const tiposContenido = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${nombres
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')}</Types>`;

  const relacionesRaiz = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const libro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nombres
    .map((n, i) => `<sheet name="${escapar(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('')}</sheets></workbook>`;

  const relacionesLibro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${nombres
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join('')}<Relationship Id="rId${nombres.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  // Dos estilos: 0 normal, 1 negrita (encabezados). Excel espera al menos dos
  // rellenos (none y gray125) y el estilo de celda "Normal" declarado.
  const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  const entradas: EntradaZip[] = [
    { nombre: '[Content_Types].xml', datos: texto(tiposContenido) },
    { nombre: '_rels/.rels', datos: texto(relacionesRaiz) },
    { nombre: 'xl/workbook.xml', datos: texto(libro) },
    { nombre: 'xl/_rels/workbook.xml.rels', datos: texto(relacionesLibro) },
    { nombre: 'xl/styles.xml', datos: texto(estilos) },
    ...hojas.map((h, i) => ({
      nombre: `xl/worksheets/sheet${i + 1}.xml`,
      datos: texto(hojaXml(h)),
    })),
  ];

  return armarZip(entradas);
}
