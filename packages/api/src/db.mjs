/** Conexión a PostgreSQL y helpers de consulta. */
import pg from 'pg';

export const URL_BD =
  process.env.PASTO_BD ?? 'postgres://pasto:pasto@localhost:5432/pasto';

export const pool = new pg.Pool({ connectionString: URL_BD, max: 8 });

/** Ejecuta una consulta y devuelve las filas. */
export async function consultar(sql, parametros = []) {
  const { rows } = await pool.query(sql, parametros);
  return rows;
}

/** Ejecuta una consulta y devuelve la primera fila (o null). */
export async function unaFila(sql, parametros = []) {
  const filas = await consultar(sql, parametros);
  return filas[0] ?? null;
}

/** Corre varias operaciones en una transacción. */
export async function enTransaccion(trabajo) {
  const conexion = await pool.connect();
  try {
    await conexion.query('begin');
    const resultado = await trabajo(conexion);
    await conexion.query('commit');
    return resultado;
  } catch (error) {
    await conexion.query('rollback');
    throw error;
  } finally {
    conexion.release();
  }
}

export async function cerrar() {
  await pool.end();
}
