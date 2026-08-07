# Pasto-App (Proyecto Pasto — BioM)

Dashboard y aplicación de planificación del pastoreo para BioM: medición de pasto a campo
(offline), cálculo agronómico (stock, crecimiento, vuelta, balance oferta–demanda) y
trazabilidad para tres perfiles: **medidor**, **técnico** y **cliente**.

## Estado

**Plan aprobado — Iteración 1 completa:** motor de cálculo agronómico validado contra las
fuentes (44/44 tests).

- [docs/01-analisis-y-plan.md](docs/01-analisis-y-plan.md) — análisis de los insumos,
  fórmulas con su fuente, dudas y arquitectura aprobada.
- [docs/02-validacion-motor.md](docs/02-validacion-motor.md) — números del motor lado a
  lado con la Guía INTA, el Excel de Loma Alta y los artículos.
- [packages/core](packages/core) — `@pasto/core`, el motor de cálculo (TypeScript, sin
  dependencias), compartido por la app y el servidor.

## Desarrollo

```bash
npm install   # Node ≥ 20
npm test      # suite de validación contra las fuentes
npm run typecheck
```
