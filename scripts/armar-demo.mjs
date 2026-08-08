/**
 * Arma la demostración como una sola página HTML, con todo adentro:
 * se puede abrir desde cualquier navegador sin instalar ni configurar nada.
 *
 *   node scripts/armar-demo.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;

function armar(paquete, salida, titulo) {
  console.log(`\n· Compilando ${paquete} en modo solo demostración…`);
  execFileSync('npm', ['run', '--workspace', paquete, 'build'], {
    cwd: RAIZ,
    env: { ...process.env, VITE_SOLO_DEMO: '1' },
    stdio: 'inherit',
  });

  const dist = join(RAIZ, 'packages', paquete.replace('@pasto/', ''), 'dist');
  const activos = join(dist, 'assets');
  const archivos = readdirSync(activos);
  const js = archivos.find((f) => f.endsWith('.js'));
  const css = archivos.find((f) => f.endsWith('.css'));
  if (!js) throw new Error(`No se encontró el archivo .js en ${activos}`);

  const estilos = css ? readFileSync(join(activos, css), 'utf8') : '';
  const guion = readFileSync(join(activos, js), 'utf8');

  // La página se publica dentro de un esqueleto: va solo el contenido.
  const pagina = `<title>${titulo}</title>
<style>${estilos}</style>
<div id="raiz"></div>
<script type="module">${guion}</script>
`;
  writeFileSync(join(RAIZ, salida), pagina);
  const kb = Math.round(pagina.length / 1024);
  console.log(`  → ${salida} (${kb} kB)`);
}

armar('@pasto/dashboard', 'docs/demo-tablero.html', 'Pasto · Tablero (demostración)');
armar('@pasto/app', 'docs/demo-medidor.html', 'Pasto · Medidor (demostración)');
console.log('\nListo.');
