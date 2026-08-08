/**
 * El .xlsx generado tiene que ser un ZIP válido que Excel/LibreOffice abran.
 * Se verifica la estructura del ZIP, los CRC y el XML de las hojas; el test
 * de integración del proyecto además lo abre con LibreOffice.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { columnaExcel, generarXlsx, nombreHojaValido, type Hoja } from '../src/index.js';

const hojas: Hoja[] = [
  {
    nombre: 'Mediciones',
    filas: [
      ['Potrero', 'Fecha', 'kg MS/ha'],
      ['Pastura 1 año', '2026-08-08', 1970],
      ['Bulevard "el bajo" & cía', '2026-08-08', 1050],
    ],
  },
  { nombre: 'Recomendaciones', filas: [['Fecha', 'Texto'], ['2026-08-08', 'Entrar a Pastura 1 año']] },
];

describe('generarXlsx', () => {
  const bytes = generarXlsx(hojas);

  it('empieza con la firma de un ZIP y termina con el fin del directorio central', () => {
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const fin = bytes.slice(bytes.length - 22, bytes.length - 18);
    expect([...fin]).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  it('declara una entrada por archivo del libro (7 con dos hojas)', () => {
    const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const cantidad = vista.getUint16(bytes.length - 22 + 10, true);
    expect(cantidad).toBe(7); // tipos, rels, workbook, workbook.rels, styles, 2 hojas
  });

  it('escapa los caracteres especiales del XML', () => {
    const contenido = new TextDecoder().decode(bytes);
    expect(contenido).toContain('Bulevard &quot;el bajo&quot; &amp; cía');
    expect(contenido).not.toMatch(/<t[^>]*>[^<]*&(?!amp;|lt;|gt;|quot;)/);
  });

  it('los números van como número y los textos como cadena en línea', () => {
    const contenido = new TextDecoder().decode(bytes);
    expect(contenido).toContain('<v>1970</v>');
    expect(contenido).toContain('t="inlineStr"');
  });

  it('rechaza un libro sin hojas', () => {
    expect(() => generarXlsx([])).toThrow();
  });

  it('columnaExcel numera como Excel', () => {
    expect(columnaExcel(1)).toBe('A');
    expect(columnaExcel(26)).toBe('Z');
    expect(columnaExcel(27)).toBe('AA');
    expect(columnaExcel(28)).toBe('AB');
  });

  it('recorta y limpia los nombres de solapa inválidos', () => {
    expect(nombreHojaValido('Mediciones/2026')).toBe('Mediciones 2026');
    expect(nombreHojaValido('x'.repeat(40))).toHaveLength(31);
    expect(nombreHojaValido('   ')).toBe('Hoja');
  });

  /**
   * Validación con un lector OOXML real (openpyxl). Se saltea si el entorno
   * no tiene Python con openpyxl, para no romper el `npm test` de nadie.
   */
  it('un lector OOXML real (openpyxl) lo abre y lee tipos y estilos', (contexto) => {
    try {
      execFileSync('python3', ['-c', 'import openpyxl'], { stdio: 'pipe' });
    } catch {
      contexto.skip();
      return;
    }
    const dir = mkdtempSync(join(tmpdir(), 'xlsx-'));
    const archivo = join(dir, 'prueba.xlsx');
    writeFileSync(archivo, bytes);

    const salida = execFileSync(
      'python3',
      [
        '-W', 'error::UserWarning', // que un aviso del parser haga fallar el test
        '-c',
        `import json, openpyxl
libro = openpyxl.load_workbook(${JSON.stringify(archivo)})
hoja = libro['Mediciones']
print(json.dumps({
  'solapas': libro.sheetnames,
  'filas': [list(f) for f in hoja.iter_rows(values_only=True)],
  'tipo_numero': type(hoja['C2'].value).__name__,
  'encabezado_negrita': bool(hoja['A1'].font.bold),
}))`,
      ],
      { encoding: 'utf8' },
    );
    const leido = JSON.parse(salida) as {
      solapas: string[];
      filas: (string | number | null)[][];
      tipo_numero: string;
      encabezado_negrita: boolean;
    };

    expect(leido.solapas).toEqual(['Mediciones', 'Recomendaciones']);
    expect(leido.filas[0]).toEqual(['Potrero', 'Fecha', 'kg MS/ha']);
    expect(leido.filas[1]).toEqual(['Pastura 1 año', '2026-08-08', 1970]);
    // Los comillas y el & vuelven desescapados: el XML estaba bien formado.
    expect(leido.filas[2]![0]).toBe('Bulevard "el bajo" & cía');
    expect(leido.tipo_numero).toBe('int'); // número, no texto
    expect(leido.encabezado_negrita).toBe(true);
  }, 120_000);
});
