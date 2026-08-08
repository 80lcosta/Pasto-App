/** Crea el esquema (idempotente). */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cerrar, consultar } from './db.mjs';

const sql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'esquema.sql'), 'utf8');

export async function migrar() {
  await consultar(sql);
}

if (process.argv[1]?.endsWith('migrar.mjs')) {
  await migrar();
  console.log('Esquema aplicado.');
  await cerrar();
}
