# Pasto-App (Proyecto Pasto — BioM)

Dashboard y aplicación de planificación del pastoreo para BioM: medición de pasto a campo
(offline), cálculo agronómico (stock, crecimiento, vuelta, balance oferta–demanda) y
trazabilidad para tres perfiles: **medidor**, **técnico** y **cliente**.

## Estado

**Plan aprobado — Iteraciones 1 y 2 completas.**

- [docs/01-analisis-y-plan.md](docs/01-analisis-y-plan.md) — análisis de los insumos,
  fórmulas con su fuente, dudas y arquitectura aprobada.
- [docs/02-validacion-motor.md](docs/02-validacion-motor.md) — números del motor lado a
  lado con la Guía INTA, el Excel de Loma Alta y los artículos (44 tests).
- [docs/03-iteracion-2-app-medidor.md](docs/03-iteracion-2-app-medidor.md) — la app de
  campo del medidor: offline, sincronización y cómo probarla.
- [packages/core](packages/core) — `@pasto/core`, motor de cálculo (TypeScript, sin
  dependencias), compartido por app y servidor.
- [packages/app](packages/app) — PWA de campo (perfil medidor), offline-first con
  IndexedDB y cola de sincronización. Piloto: Loma Alta.
- [packages/server-dev](packages/server-dev) — servidor de sincronización de desarrollo.

## Desarrollo

```bash
npm install        # Node ≥ 20
npm test           # validación del motor contra las fuentes + tests de la app
npm run typecheck
npm run sync:dev   # servidor de sincronización (dev, puerto 8787)
npm run app:dev    # app del medidor en http://localhost:5173
```
