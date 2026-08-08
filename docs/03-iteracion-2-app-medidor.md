# Iteración 2 — App del medidor (PWA offline-first)

Perfil **medidor de pasto**: carga de mediciones y movimientos de animales a campo,
con o sin señal, pensada para usar con una mano y con sol. Campo piloto: **Loma Alta**.

## Qué hace

- **Mi recorrida:** los puntos de medición fijos agrupados por potrero, en el orden
  fijo de la recorrida (Guía §2.2), con contador de medidos/pendientes. Cada punto
  muestra su última medición del día.
- **Carga de un punto:** teclado numérico grande; se cargan varias lecturas de altura
  (plato o regla) por punto; botón dedicado **"0 · maleza / suelo desnudo"** (Guía
  Anexo 1: esas lecturas valen cero y entran al promedio). Muestra el promedio y la
  conversión inmediata a **kg MS/ha** con la curva del recurso (`@pasto/core`), aun sin
  señal. Al guardar registra: lecturas, promedio, kg MS/ha, **curva y datum usados**
  (trazabilidad), quién midió, fecha/hora y GPS si está disponible.
- **Animales:** registro rápido de **entrada/salida** del rodeo por potrero con altura
  del pasto opcional y observaciones (hoja Registro del Excel).
- **Estado:** pendientes de sincronizar, última sincronización, quién mide y servidor.

## Offline y sincronización

- Los datos del campo (potreros, puntos, recursos con su curva, rodeos) viven en
  **IndexedDB**; el shell de la app se cachea con un service worker → funciona
  completa sin señal.
- Las mediciones y eventos son **registros inmutables** creados con UUID + autor +
  fecha en el teléfono. La sincronización es una cola de envío **idempotente**: al
  volver la señal (o cada 45 s) se envía lo pendiente a `POST /api/sync` y solo se
  marca como enviado lo que el servidor confirmó. Reintentos no duplican datos.
- Banda de estado siempre visible: *Sin señal — todo se guarda en el teléfono* /
  *N registros esperando* / *Todo sincronizado*.

## Cómo probarla

```bash
npm install
npm run sync:dev      # servidor de sincronización de desarrollo (puerto 8787)
npm run app:dev       # app en http://localhost:5173
```

Probada de punta a punta con Chromium (viewport de teléfono): medición cargada en
modo avión → guardada local → al volver la señal se sincronizó sola y el servidor la
recibió completa (lecturas 14; 12,5; 0; 16 → promedio 10,6 cm → 1.353 kg MS/ha con la
curva default −177 + 144 × cm ✓).

## Límites conocidos de esta iteración (se resuelven en las siguientes)

- El servidor (`packages/server-dev`) es un **stub de desarrollo** (JSON local, sin
  autenticación). El backend real (API + Postgres/PostGIS, multi-campo, roles) llega
  con el dashboard del técnico (Iteración 3), manteniendo el mismo contrato de sync.
- Sin login todavía: el nombre del medidor se configura en Estado y viaja con cada dato.
- La curva de todos los recursos es la provisoria (festuca sudeste, Guía Anexo 1),
  marcada como tal en la app; el ABM de curvas por recurso es parte del dashboard.
- Puntos sin coordenadas cargadas (el GPS del teléfono se guarda con cada medición;
  el alta de puntos georreferenciados en el mapa llega con el dashboard).
