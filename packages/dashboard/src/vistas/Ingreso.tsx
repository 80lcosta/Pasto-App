import { useState } from 'react';
import { entrarEnModoDemo, ingresar, URL_SERVIDOR } from '../api.js';
import type { Usuario } from '../tipos.js';

export function Ingreso({ alIngresar }: { alIngresar: (u: Usuario) => void }) {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  const entrar = async () => {
    setEntrando(true);
    setError('');
    try {
      alIngresar(await ingresar(email.trim(), clave));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ingresar');
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="ingreso">
      <div className="panel">
        <h2>Pasto · Ingresar</h2>
        <p className="sub">Tablero del técnico y consulta del productor.</p>
        {error && <div className="aviso-error">{error}</div>}

        <label className="etiqueta" htmlFor="email">Usuario</label>
        <input
          id="email"
          className="entrada bloque"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="etiqueta" htmlFor="clave">Clave</label>
        <input
          id="clave"
          className="entrada bloque"
          type="password"
          autoComplete="current-password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && entrar()}
        />

        <div style={{ height: 14 }} />
        <button className="boton" disabled={entrando || !email || !clave} onClick={entrar}>
          {entrando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="pie">Servidor: {URL_SERVIDOR}</p>
      </div>

      <div className="panel">
        <h2>Ver una demostración</h2>
        <p className="sub">
          El campo Loma Alta con datos de ejemplo, funcionando entero dentro del navegador:
          sin servidor y sin cuenta. Los cálculos son los mismos que con datos reales.
        </p>
        <button className="boton secundario" onClick={() => alIngresar(entrarEnModoDemo())}>
          Entrar a la demostración
        </button>
      </div>
    </div>
  );
}
