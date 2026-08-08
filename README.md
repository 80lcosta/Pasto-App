# Pasto-App (Proyecto Pasto — BioM)

Dashboard y aplicación de planificación del pastoreo para BioM: medición de pasto a campo
(offline), cálculo agronómico (stock, crecimiento, vuelta, balance oferta–demanda) y
trazabilidad para tres perfiles: **medidor**, **técnico** y **cliente**.

## Estado

**Plan aprobado — Iteraciones 1, 2 y 3 completas** (66 tests en verde).

- [docs/01-analisis-y-plan.md](docs/01-analisis-y-plan.md) — análisis de los insumos,
  fórmulas con su fuente, dudas y arquitectura aprobada.
- [docs/02-validacion-motor.md](docs/02-validacion-motor.md) — números del motor lado a
  lado con la Guía INTA, el Excel de Loma Alta y los artículos.
- [docs/03-iteracion-2-app-medidor.md](docs/03-iteracion-2-app-medidor.md) — la app de
  campo del medidor: offline, sincronización y cómo probarla.
- [docs/04-iteracion-3-dashboard.md](docs/04-iteracion-3-dashboard.md) — el tablero del
  técnico: cuña, decisiones de la recorrida y recomendaciones.
- [packages/core](packages/core) — `@pasto/core`, motor de cálculo (TypeScript, sin
  dependencias), compartido por app, tablero y servidor.
- [packages/app](packages/app) — PWA de campo (perfil medidor), offline-first con
  IndexedDB y cola de sincronización. Piloto: Loma Alta.
- [packages/dashboard](packages/dashboard) — tablero del técnico.
- [packages/campo-demo](packages/campo-demo) — datos del campo piloto, compartidos.
- [packages/server-dev](packages/server-dev) — servidor de desarrollo (API de sincronización
  y recomendaciones).

## Desarrollo

```bash
npm install          # Node ≥ 20
npm test             # motor validado contra las fuentes + app + tablero
npm run typecheck
npm run sync:dev     # servidor (dev, puerto 8787)
npm run app:dev      # app del medidor   → http://localhost:5173
npm run tablero:dev  # tablero del técnico → http://localhost:5174
```
