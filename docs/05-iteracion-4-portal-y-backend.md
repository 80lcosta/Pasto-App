# Iteración 4 — Backend real, portal del cliente, exportes y auditoría

Cierra el circuito de los tres perfiles: el medidor carga, el técnico decide y el
**cliente lleva la trazabilidad** de todo el proceso, con exportes y auditoría.

## Backend real (`packages/api`) — PostgreSQL

Reemplaza al servidor de desarrollo. Mismo contrato de sincronización, ahora con base
de datos, sesiones y permisos.

- **Modelo multi-cliente / multi-campo:** organización (BioM) → clientes → campos →
  potreros, recursos, puntos, rodeos. Cada usuario accede **solo a los campos habilitados**
  (tabla `acceso`).
- **Datos inmutables:** mediciones, eventos y recomendaciones se insertan, no se editan.
  La sincronización es idempotente (`on conflict do nothing`): reenviar no duplica.
- **Sesiones seguras:** claves con `scrypt` y sal por usuario; los tokens se guardan
  **hasheados** (SHA-256), así leer la base no permite hacerse pasar por nadie.
- **Auditoría:** cada operación queda registrada — ingresos, ingresos fallidos, salidas,
  sincronizaciones (con dispositivo y cantidades), recomendaciones, y también los
  **intentos denegados** de acceso y escritura.

### Matriz de permisos

| | medidor | técnico | cliente |
|---|:--:|:--:|:--:|
| Ver la configuración del campo | ✅ | ✅ | ✅ |
| Cargar mediciones y movimientos | ✅ | ✅ | ❌ |
| Ver historial, tablero y auditoría | ❌ | ✅ | ✅ |
| Registrar recomendaciones | ❌ | ✅ | ❌ |

El cliente es **de solo lectura por diseño**: la interfaz no le muestra los controles de
escritura y, además, el servidor los rechaza (probado en los tests, no solo escondido).

## App del medidor: ingreso y trabajo offline

Ahora pide usuario y clave. Al ingresar (una sola vez, con señal) descarga el campo
completo y lo guarda en el teléfono: desde ahí se puede medir todo el día sin conexión.
El token viaja en cada sincronización, y cada medición queda atribuida a quién la cargó.

## Portal del cliente (mismo tablero, según el rol)

Cuatro secciones, con el título y los permisos adaptados al perfil:

- **Estado del campo:** los mismos indicadores, cuña y decisiones que ve el técnico, pero
  sin poder modificar nada.
- **Historial:** por potrero, todas las mediciones (con las alturas medidas, el promedio,
  los kg MS/ha y **quién** las cargó) y todos los movimientos de animales.
- **Informes:** las recomendaciones del técnico con los números en los que se basaron,
  más los exportes.
- **Auditoría:** quién hizo qué y cuándo, en lenguaje llano.

## Exportes

- **Excel (.xlsx):** generado sin dependencias externas (`packages/core/src/xlsx.ts`).
  Un archivo con seis hojas: *Stock por recorrida*, *Mediciones* (incluida la curva y el
  datum con que se calculó cada una), *Movimientos*, *Recomendaciones*, *Potreros* y
  *Auditoría*. Validado con un lector OOXML real (openpyxl), con los avisos del parser
  tratados como error.
- **PDF:** con la impresión del navegador ("Guardar como PDF") sobre una hoja de estilos
  de impresión que oculta botones y formularios. No requiere instalar nada.

## Verificación

**91 tests** en total, todos en verde:

| Paquete | Tests | Qué cubre |
|---|--:|---|
| `core` | 52 | fórmulas contra las fuentes + generador de Excel |
| `api` | 25 | sesiones, permisos por rol, idempotencia, auditoría, campo piloto, carga demo |
| `dashboard` | 18 | pipeline de análisis, casos publicados, exportes |
| `app` | 3 | cola de sincronización |

Además, prueba de punta a punta con navegador real: **medidor** ingresa → mide sin señal
→ sincroniza al volver la conexión → **técnico** ve ese dato y registra una recomendación
→ **cliente** entra en modo consulta, comprueba que no tiene controles de escritura, ve la
auditoría, descarga el Excel (abierto y verificado con openpyxl) y genera el PDF.

## Dos bugs encontrados y corregidos en esta iteración

- **El exporte se rompía con datos parciales.** Una recomendación guardada sin
  `balanceKgMSDia` hacía fallar el Excel entero (`toFixed` sobre `undefined`). Ahora el
  redondeo y los formateadores toleran datos faltantes y muestran la celda vacía o "—",
  nunca "NaN". Con test que lo cubre.
- **La carga de demostración perdía el 90 % de los registros.** El identificador se
  derivaba de un recorte del texto, así que `pastura-1`, `pastura-2`, `pastura-3` y
  `pastura-4` (y todas las fechas) colapsaban en el mismo id: de 30 mediciones entraban 3,
  sin ningún error visible. Se detectó al mirar el tablero, que mostraba un solo potrero
  con datos. Ahora el id es un UUID derivado de la clave completa, con test que verifica
  que las 5 recorridas quedan completas.

## Cómo levantarlo

```bash
npm install
npm run api:migrar    # crea el esquema
npm run api:sembrar   # campo piloto + usuarios de prueba
npm run api:demo      # opcional: historial de demostración
npm run api:dev       # API en http://localhost:8787
npm run app:dev       # medidor  → http://localhost:5173
npm run tablero:dev   # tablero  → http://localhost:5174
```

Usuarios de prueba (cambiar antes de producción):

| Rol | Usuario | Clave |
|---|---|---|
| medidor | `benjamin@biom.test` | `medidor123` |
| técnico | `pancho@biom.test` | `tecnico123` |
| cliente | `cliente@lomaalta.test` | `cliente123` |

Conexión configurable con `PASTO_BD` (por defecto `postgres://pasto:pasto@localhost:5432/pasto`).

## Límites conocidos

- **Sin PostGIS todavía** (no estaba disponible en el entorno de desarrollo): las
  geometrías de los potreros se guardan como GeoJSON en `jsonb`. Cuando se agregue PostGIS,
  `potrero.geometria` pasa a `geometry(Polygon, 4326)` sin tocar el resto del modelo. El
  **mapa sigue pendiente** hasta definir de dónde salen las geometrías del campo.
- Los cierres de potreros para reservas siguen siendo de la sesión del navegador; falta
  persistirlos como decisión con vigencia.
- Falta la pantalla de administración de usuarios y campos (hoy se cargan con `sembrar`).
- La proyección a 30–60 días sigue esperando la definición de la duda **D10**.
