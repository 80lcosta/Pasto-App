# Iteración 3 — Tablero del técnico

Perfil **técnico/asesor**: lee lo que cargó el medidor, interpreta las variables y produce
las recomendaciones. Todo se calcula con el motor validado (`@pasto/core`), siguiendo la
secuencia de decisión de la Guía INTA §3.

## Qué muestra

- **Indicadores de la recorrida:** stock de pasto contra el objetivo, tasa de crecimiento
  ponderada, pasto disponible por día, demanda del rodeo y balance (con el signo y el color
  según falte o sobre pasto).
- **Gráfico de cuña (feed wedge):** los potreros ordenados de mayor a menor biomasa con la
  línea que une el objetivo de entrada con el de salida, cada barra pintada según esté sobre,
  por encima o por debajo de la línea (y rayada si está en pastoreo). Debajo, la **lectura
  automática** de la Guía §3.3: *seguir igual* / *déficit* / *exceso*, con sus acciones.
- **Decisiones para los próximos 7 días** (Guía §3): a qué potrero entrar y por qué, cuánta
  superficie asignar por día, la vuelta que resulta de ese ritmo, la ocupación máxima
  recomendada para el mes, si alcanza el pasto y —según el caso— cuánto suplementar por
  animal o cuánta superficie cerrar para reservas.
- **Semáforo de potreros:** biomasa, crecimiento, días de descanso, días de ocupación
  (en rojo si superan el máximo del mes) y estado: *listo para entrar* / *pasado* /
  *en descanso* / *en pastoreo* / *cerrado*.
- **Cerrar potreros para reservas:** sacan al potrero de la rotación y **recalculan todo el
  tablero** (superficie de plataforma, pasto disponible, stock, cuña).
- **Evolución del stock:** promedio del campo en cada recorrida contra el objetivo.
- **Recomendación al productor:** el técnico la escribe (o toma las decisiones calculadas) y
  queda registrada con fecha, autor y los números de la recorrida — trazabilidad de la
  decisión, no solo del dato.

## Cómo se derivan los datos

- Las mediciones sincronizadas se **agrupan por fecha** en recorridas; los puntos de un mismo
  potrero se promedian.
- El estado "en pastoreo" **no se tipea**: se deriva del último evento de entrada/salida de
  cada potrero, que carga el medidor. Un potrero en pastoreo no computa tasa de crecimiento
  (Guía §3.1).
- Con una sola recorrida el tablero avisa que falta la segunda para poder calcular
  crecimiento — es el estado real de arranque de un campo.
- Si el servidor no responde, o todavía no hay mediciones, el tablero usa una recorrida de
  demostración y lo señala con un cartel; los cálculos son los mismos.

## Validación

Los 14 tests de `packages/dashboard` cubren el pipeline completo (mediciones → recorridas →
análisis), e incluyen dos corridas con la **geometría exacta de los casos publicados**:

| Caso | Verificado punta a punta |
|---|---|
| Guía §3.1 (8 de junio) | stock 1.445 · TC ponderada 14,32 · pasto/día 1.962 · entrar al potrero A · 2,02 ha/día · suplementar 4,6 kg/animal · vuelta 67,7 días |
| Guía §3.2 (10 de octubre) | A queda *pasado* → reservas, se entra a C · parcela 5,71 ha/día · cerrar 24,6 % ≈ 33,7 ha · lectura *exceso* · ocupación máxima 4 días |

Total del proyecto: **66 tests** (44 motor + 8 app + 14 tablero).

## Cómo probarlo

```bash
npm install
npm run sync:dev       # servidor (puerto 8787)
npm run tablero:dev    # tablero en http://localhost:5174
npm run app:dev        # app del medidor en http://localhost:5173
```

Con los tres corriendo, lo que carga el medidor aparece en el tablero al recargar.

## Límites de esta iteración

- Sigue sin login: el backend real con autenticación, roles y Postgres/PostGIS llega junto
  con el portal del cliente (Iteración 4), manteniendo el contrato de la API.
- **Sin mapa todavía:** el semáforo es una tabla. El mapa con los polígonos de los potreros
  requiere cargar las geometrías del campo (las tiene el técnico en Google Earth) y se suma
  cuando definamos de dónde salen.
- Los cierres para reservas son de la sesión (no se guardan aún en el servidor).
- La proyección a 30–60 días queda pendiente: necesita la curva de crecimiento esperada por
  recurso y mes (duda **D10**, sin confirmar).
