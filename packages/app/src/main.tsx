import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './estilos.css';

// El service worker sirve para usar la app sin señal cuando está publicada.
// No aplica a la demostración de una sola página, y al abrirla como archivo
// suelto el navegador lo rechaza: por eso se registra solo si corresponde.
const SOLO_DEMO = import.meta.env['VITE_SOLO_DEMO'] === '1';
if (import.meta.env.PROD && !SOLO_DEMO && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    /* sin service worker: la app funciona igual, solo pierde el cacheo */
  });
}

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el elemento raíz');
createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
