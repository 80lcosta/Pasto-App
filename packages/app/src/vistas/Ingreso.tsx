/**
 * Ingreso del medidor. Se hace una sola vez, con señal: después el equipo
 * queda habilitado para trabajar todo el día a campo sin conexión.
 */
import { useEffect, useState } from 'react';
import { escribirMeta, leerMeta } from '../db.js';
import { ingresar, URL_SERVIDOR_DEFAULT } from '../sesion.js';

export function Ingreso({ alIngresar }: { alIngresar: () => void }) {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [servidor, setServidor] = useState('');
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    void leerMeta('urlServidor', URL_SERVIDOR_DEFAULT).then(setServidor);
  }, []);

  const entrar = async () => {
    setEntrando(true);
    setError('');
    await escribirMeta('urlServidor', servidor.trim() || URL_SERVIDOR_DEFAULT);
    const r = await ingresar(email.trim(), clave);
    setEntrando(false);
    if (r.ok) alIngresar();
    else setError(r.error ?? 'No se pudo ingresar');
  };

  return (
    <div className="pantalla-punto">
      <div className="tarjeta">
        <h2>Ingresar</h2>
        <p className="sub">
          Necesitás señal solo esta vez. Después podés medir todo el día sin conexión.
        </p>

        {error && <div className="aviso-error">{error}</div>}

        <label className="etiqueta" htmlFor="email">Usuario</label>
        <input
          id="email"
          className="entrada"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="tu.correo@biom.test"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="etiqueta" htmlFor="clave">Clave</label>
        <input
          id="clave"
          className="entrada"
          type="password"
          autoComplete="current-password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && entrar()}
        />

        <label className="etiqueta" htmlFor="servidor">Servidor</label>
        <input
          id="servidor"
          className="entrada"
          value={servidor}
          onChange={(e) => setServidor(e.target.value)}
        />

        <div style={{ height: 14 }} />
        <button className="boton primario" disabled={entrando || !email || !clave} onClick={entrar}>
          {entrando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </div>
    </div>
  );
}
