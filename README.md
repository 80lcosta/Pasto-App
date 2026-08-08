# Pasto-App (Proyecto Pasto — BioM)

Dashboard y aplicación de planificación del pastoreo para BioM: medición de pasto a campo
(offline), cálculo agronómico (stock, crecimiento, vuelta, balance oferta–demanda) y
trazabilidad para tres perfiles: **medidor**, **técnico** y **cliente**.

## Estado

**Plan aprobado — las cinco iteraciones completas, más KML y ajustes** (104 tests en verde).

### Documentación

- [docs/01-analisis-y-plan.md](docs/01-analisis-y-plan.md) — análisis de los insumos,
  fórmulas con su fuente, dudas y arquitectura aprobada.
- [docs/02-validacion-motor.md](docs/02-validacion-motor.md) — números del motor lado a
  lado con la Guía INTA, el Excel de Loma Alta y los artículos.
- [docs/03-iteracion-2-app-medidor.md](docs/03-iteracion-2-app-medidor.md) — app de campo
  del medidor: offline y sincronización.
- [docs/04-iteracion-3-dashboard.md](docs/04-iteracion-3-dashboard.md) — tablero del
  técnico: cuña, decisiones y recomendaciones.
- [docs/05-iteracion-4-portal-y-backend.md](docs/05-iteracion-4-portal-y-backend.md) —
  backend con roles y auditoría, portal del cliente y exportes.
- **[docs/08-publicar-gratis.md](docs/08-publicar-gratis.md) — cómo mostrar la herramienta
  a los clientes sin pagar servidor (modo demostración).**
- [docs/07-kml-mapa-y-ajustes.md](docs/07-kml-mapa-y-ajustes.md) — importación de KML,
  mapa del campo y objetivos editables.
- **[docs/06-instructivo-de-uso.md](docs/06-instructivo-de-uso.md) — instructivo de uso en
  lenguaje llano, un capítulo por perfil.** Versión web para compartir:
  [docs/instructivo.html](docs/instructivo.html).

### Paquetes

| Paquete | Qué es |
|---|---|
| [packages/core](packages/core) | Motor de cálculo agronómico y generador de Excel (TypeScript, sin dependencias). Compartido por app, tablero y servidor |
| [packages/api](packages/api) | API sobre PostgreSQL: sesiones, roles, permisos, sincronización y auditoría |
| [packages/app](packages/app) | PWA de campo (perfil medidor), offline-first con IndexedDB |
| [packages/dashboard](packages/dashboard) | Tablero del técnico y portal del cliente (según el rol) |
| [packages/campo-demo](packages/campo-demo) | Datos del campo piloto Loma Alta |

## Ver una demostración sin instalar nada

Las dos aplicaciones traen un botón **“Entrar a la demostración”**: cargan el campo Loma Alta
de ejemplo y funcionan enteras dentro del navegador, sin servidor ni base de datos. Alcanza
con publicar los archivos estáticos (`npm run app:build` y `npm run tablero:build`) en
cualquier servicio gratuito de páginas. Ver [docs/08-publicar-gratis.md](docs/08-publicar-gratis.md).

## Puesta en marcha

Requiere Node ≥ 20 y PostgreSQL 16.

```bash
npm install
npm run api:migrar    # crea el esquema
npm run api:sembrar   # campo piloto Loma Alta + usuarios de prueba
npm run api:demo      # opcional: historial de recorridas de demostración

npm run api:dev       # API      → http://localhost:8787
npm run app:dev       # medidor  → http://localhost:5173
npm run tablero:dev   # tablero  → http://localhost:5174
```

Usuarios de prueba (cambiar antes de producción): `benjamin@biom.test` / `medidor123`,
`pancho@biom.test` / `tecnico123`, `cliente@lomaalta.test` / `cliente123`.

La conexión a la base se configura con `PASTO_BD`
(por defecto `postgres://pasto:pasto@localhost:5432/pasto`).

## Verificación

```bash
npm test        # 104 tests: motor contra las fuentes, API, tablero y app
npm run typecheck
```
