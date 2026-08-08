# Pasto-App (Proyecto Pasto — BioM)

Dashboard y aplicación de planificación del pastoreo para BioM: medición de pasto a campo
(offline), cálculo agronómico (stock, crecimiento, vuelta, balance oferta–demanda) y
trazabilidad para tres perfiles: **medidor**, **técnico** y **cliente**.

## Para retomar el trabajo

Rama de desarrollo: **`claude/grazing-planning-dashboard-5siibg`**.
Todo lo hecho está acá; el contenedor de trabajo es descartable.

**Estado:** las cinco iteraciones del plan están completas, más la importación de KML, el
mapa, los objetivos editables y el modo demostración. **123 tests en verde** (`npm test`).

**Enlaces publicados** (privados hasta compartirlos desde el menú de cada página):

- Tablero: https://claude.ai/code/artifact/c2835b2f-13b7-4aae-943d-554f0d60f795
- Medidor: https://claude.ai/code/artifact/c7849278-d962-46df-861d-a027a302f39a
- Instructivo: https://claude.ai/code/artifact/11e065ee-7396-4dc9-9885-e67434d26eb8

**Lo que quedó abierto:**

| Tema | Estado |
|---|---|
| Comentarios de los colegas sobre la demostración | Es lo próximo que llega |
| Dudas agronómicas D1–D14 | Se dejaron con valores por defecto, configurables. Se afinan con el uso ([docs/01](docs/01-analisis-y-plan.md) §1.5, [docs/02](docs/02-validacion-motor.md)) |
| Dibujar los potreros desde el celular | Pendiente. Hoy entran por KML |
| Foto satelital de fondo en el mapa | Pendiente; requiere contratar un servicio de mapas |
| Proyección a 30–60 días | Pendiente: depende de definir la curva de crecimiento esperada (duda D10) |
| Hosting | Sin decidir. Para mostrar a clientes no hace falta ([docs/08](docs/08-publicar-gratis.md)) |
| Persistir los cierres de potreros para reservas | Hoy duran lo que dura la sesión del navegador |
| Pantalla de administración de usuarios y campos | Pendiente; hoy se cargan con `npm run api:sembrar` |

## Estado

**Plan aprobado — las cinco iteraciones completas, más KML y ajustes** (123 tests en verde).

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

Hay una versión de la demostración empaquetada en **un solo archivo** que se abre en
cualquier navegador sin instalar nada:

```bash
node scripts/armar-demo.mjs   # → docs/demo-tablero.html y docs/demo-medidor.html
```

Además, las dos aplicaciones traen un botón **“Entrar a la demostración”**: cargan el campo Loma Alta
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
npm test        # 123 tests: motor contra las fuentes, API, tablero y app
npm run typecheck
```
