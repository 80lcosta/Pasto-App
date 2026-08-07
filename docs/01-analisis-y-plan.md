# Proyecto Pasto (BioM) — Análisis de insumos y plan propuesto

> **Estado: FASE 1 y FASE 2 — pendiente de aprobación.** No se escribió código de la aplicación.
> Este documento resume lo entendido de los cuatro insumos, lista las fórmulas extraídas
> (con su fuente exacta), las dudas a confirmar y la arquitectura propuesta.

---

## FASE 1 — Qué entendí de los insumos

### 1.1 La minuta (reunión Juan–Pancho)

El archivo Word es la transcripción cruda de la conversación. De ahí extraje la necesidad
y los requerimientos concretos:

**El problema con las herramientas existentes (Pastech y similares):**
- Informan *stock total* del potrero ("tenés X kg, la hacienda estará N días") y tasa de
  crecimiento de los próximos 5 días. Esa no es la información con la que se decide.
- Juan lo dice explícitamente: *"Yo no quiero comer todo el stock de pasto. Yo quiero comer
  solamente lo que está disponible arriba del stock objetivo"* y *"con la tasa de crecimiento
  del día no hago nada; decime cómo voy a venir de acá a 30, 40 días"*.
- El satélite (NDVI) es un complemento, no la base: en invierno no hay imágenes (nubes),
  satura la curva con alta oferta y sobreestima porque mide desde el ras del suelo.
  **La plataforma no debe depender del satélite**; queda como capa opcional futura.

**El concepto central de manejo:**
- Se define un **stock promedio objetivo** del módulo de pastoreo (ej. 500 kg MS/ha por
  encima de los 5 cm). Lo **disponible para comer** es:
  - el excedente del stock actual sobre el objetivo × superficie, repartido en los días de
    la vuelta, **más**
  - lo que crece (tasa de crecimiento) de acá en adelante.
- Si el stock está por debajo del objetivo: se come *menos* de lo que crece (la diferencia
  reconstruye el stock en el horizonte de la vuelta) → suplementar o ajustar carga.
- Del balance oferta–demanda salen las decisiones: **suplementación** (cuánto), **ajuste de
  carga** (sacar hacienda, cambiar rodeo de circuito), **cerrar superficie para reservas**
  (rollos/silo), **achicar/agrandar la parcela diaria**.
- La plataforma da el dato y las equivalencias ("faltan 200 kg/día ≈ tantos rollos ≈ tanta
  hacienda"); la decisión queda en el técnico/productor.

**Estructura espacial y de medición:**
- Jerarquía: **Campo → Potreros → Circuitos → Parcelas (franjas) → Puntos de medición.**
- El **circuito** es la unidad de manejo: agrupación *flexible* de potreros a la que se
  asigna un rodeo. Se agranda/achica en el tiempo (se suman o quitan potreros).
- Los **puntos de medición son fijos y georreferenciados** (orientativo: 1 punto cada ~5 ha,
  pero *flexible según el campo* — en La Londra con circuitos de 80–100 ha la densidad es otra).
  El crecimiento se calcula comparando **el mismo punto contra su medición anterior**.
- Los puntos se pueden **tildar/destildar** (activar/desactivar) cuando se reconfigura un
  circuito, sin perder su historial: el recurso es el mismo y la tasa de crecimiento también,
  no importa en qué circuito esté hoy.
- El sistema debe chequear superficies (qué potrero está en uso y cuánto suma el circuito)
  para evitar duplicaciones.
- La medición se hace con **plato ascendente (rising plate meter) calibrado**, con curvas de
  calibración **por tipo de recurso** (festuca, promoción de raigrás, alfalfa, etc.).
  El plato digital carga la altura al celular. Calibrar todo llevará ~1 año (4 estaciones);
  mientras tanto se usan curvas existentes (Juan Insúa / "el Vasco").
- Frecuencia de medición: **quincenal**, semanal en primavera.

**Lo que quieren ver (outputs):**
- Mapa del campo con los potreros dibujados, qué circuito integra cada uno, dónde están los
  puntos de medición, y colores por estado ("lo recién comido y lo que hay estoqueado") —
  un "mapa de calor" **de las mediciones propias**, no del satélite.
- Curva histórica de stock y de tasa de crecimiento por punto/circuito.
- Balance oferta–demanda por circuito y proyección a 30–60 días usando la curva histórica
  de crecimiento del recurso (no solo los próximos 5 días).
- **Alertas anticipadas**: "al 20 de julio este circuito va a estar sobrestockeado →
  cerrar bolsa de silo / sacar rollos" o "déficit para tal fecha → picar, fertilizar,
  suplementar, descargar".
- **Control plan vs. ejecución**: *"La planificación es fundamental. El control de lo que se
  está haciendo es recontra fundamental… el control es lo que falta."* Debe quedar registro
  de lo planificado, lo ejecutado y quién hizo qué.
- Informe periódico del técnico al productor.

**Usuarios y despliegue:**
- Tres perfiles: medidor (carga a campo, offline), técnico (análisis y recomendaciones),
  cliente (trazabilidad y consulta).
- Multi-cliente / multi-campo: Pancho asesora varios campos de varios dueños.
- Piloto: **Loma Alta** (ya tiene bastón/plato y potreros conocidos); después La Londra y
  los campos nuevos (Ayacucho, Juárez, etc.).
- Decisiones cualitativas (ej. alfalfa con 9–10 nudos → pastorear aunque falte stock) son
  parte del servicio del técnico; la app debe permitir registrarlas como recomendación,
  no automatizarlas.

### 1.2 El Excel (Manejo_Pastoreo_Loma_Alta.xlsx)

Cinco hojas; la lógica que hay que respetar:

| Hoja | Contenido |
|---|---|
| **Info Base** | Parámetros térmicos por especie (T base, VMF), cálculo de vuelta por tiempo térmico, lotes de Loma Alta con recursos, demanda por rodeo con proyección quincenal, vuelta operativa, superficie a cerrar, pautas estacionales de alfalfa, definición de stock objetivo |
| **Oferta** (y **Oferta (2)**) | Potreros × 2 fechas de medición → tasa de crecimiento, biomasa total/día, balance contra el consumo del rodeo, superficie diaria a asignar, suplementación o cierre de reservas |
| **Demanda** | Rodeos por categoría (cabezas, peso) y consumo = peso × 3% (nota: 6% si se mide a ras del suelo, 3% si se mide a 5 cm) |
| **Curva** | Calibración: corte con marco 0,40 × 0,40 m → peso húmedo × %MS → g MS/m² → kg MS/ha, asociado a altura (cm) |
| **Registro** | La tabla de trazabilidad de pastoreos: rodeo, cabezas, peso, consumo/día, potrero, superficie, recurso, parcela, frente, superficie de parcela, fecha/hora y altura de entrada, fecha/hora y altura de salida, tiempo de ocupación, tiempo de descanso, carga, observaciones |

La hoja **Registro** es, de hecho, el borrador del modelo de datos del evento de pastoreo.

### 1.3 El material del curso

**Artículo 1 — Tuñón & Berone, "Manejo del pastoreo: una herramienta para calcular cuál
debería ser la cobertura promedio en cada momento del año" (Visión Rural Nº 142):**
método de 5 pasos para definir el stock objetivo por estación (detallado abajo). Es la
base teórica del "valor de stock a monitorear".

**Artículo 2 — Berone & Sardiña, "Pastoreo de Alfalfa: nuevas ideas para optimizar
producción y persistencia" (Visión Rural Nº 139):** criterios de entrada/salida por
**altura, no por fenología** (detallado abajo). Coincide con las notas del Excel
("Pastorear en relación a la altura, no usar la fenología").

---

## 1.4 Fórmulas extraídas (con fuente)

Regla aplicada: **solo** fórmulas presentes en el Excel o en los artículos. Nada inventado.

### A. Disponibilidad de materia seca (medición)

| Fórmula | Fuente |
|---|---|
| Peso seco (g) = peso húmedo (g) × %MS | Excel · Curva |
| g MS/m² = peso seco / 0,16 (marco de 0,40 × 0,40 m) | Excel · Curva |
| **kg MS/ha = g MS/m² × 10** | Excel · Curva |
| Curva de calibración: altura del plato (cm) → kg MS/ha, específica por recurso | Excel · Curva + minuta (curvas Insúa/Vasco) |
| El stock "utilizable" se expresa **por encima de los 5 cm** (remanente no cosechable) | Artículos + Excel (nota consumo 3 % a 5 cm) |

### B. Tasa de crecimiento

| Fórmula | Fuente |
|---|---|
| **TC (kg MS/ha/día) = (kg MS/ha fecha₂ − kg MS/ha fecha₁) / días entre mediciones**, sobre el **mismo punto de medición** | Excel · Oferta (col. F) + minuta |
| En potrero **en pastoreo activo no se calcula TC** (la diferencia mezcla consumo con crecimiento) | Excel · Oferta (fila F: "no se calcula") |
| Biomasa producida por potrero (kg MS/día) = TC × superficie | Excel · Oferta (col. G) |

### C. Vuelta de pastoreo / tiempo de descanso (tiempo térmico)

| Fórmula | Fuente |
|---|---|
| Tiempo térmico diario (°Cd/día) = T media diaria − T base de la especie | Excel · Info Base + Artículo 1 (Paso 1) |
| **Vuelta (días) = VMF (°Cd) / (T media − T base)** | Excel · Info Base + Artículo 1 (Paso 1) |
| Parámetros en los insumos: Festuca VMF 500 °Cd (T base 4 °C en el Excel, **3 °C en el artículo** → duda D1); Alfalfa VMF 350 °Cd, T base 3,5 °C | Excel · Info Base (A1:C3) / Artículo 1 |
| Vueltas orientativas del artículo (días, por estación DEF/MAM/JJA/SON): raigrás –/24/33/–, alfalfa 24/42/69/25, festuca 28/39/50/23 | Artículo 1 (Paso 1, tabla) |
| Alfalfa (artículo 2): vuelta sep–feb de **15–25 días** según crecimiento; feb–abr **35–45 días** | Artículo 2 |

### D. Stock objetivo (método de 5 pasos, por estación y por recurso)

| Paso | Fórmula | Fuente |
|---|---|---|
| 1 | Vuelta = VMF / (T media − T base) | Artículo 1 |
| 2 | TC estimada para esa vuelta (dato de campo, referencias INTA/universidades o modelos) | Artículo 1 |
| 3 | Biomasa post-pastoreo objetivo (remanente, kg MS/ha > 5 cm). Valores del ejemplo: raigrás 0–200, alfalfa 200, festuca 200–400 según estación | Artículo 1 |
| 4 | **Biomasa pre-pastoreo (entrada) = TC × vuelta** (los números del ejemplo cierran con esta cuenta, con redondeos → duda D3) | Artículo 1 |
| 5 | **Stock objetivo del recurso = (biomasa de entrada + remanente) / 2**; stock del módulo = agregación ponderada por superficie (la tabla del ejemplo no cierra exacto en todas las estaciones → duda D4) | Artículo 1 |
| — | Referencia práctica de Loma Alta: objetivo **450–550 kg MS/ha** (>5 cm) — "la pastura que más tiene 1.000, la que menos 0" | Excel · Info Base (B139:C141) |

### E. Demanda

| Fórmula | Fuente |
|---|---|
| **Consumo (kg MS/día/cab) = peso vivo × 3 %** midiendo desde 5 cm (**× 6 %** si se mide a ras del suelo) | Excel · Demanda B1/C1 e Info Base A70:C70 |
| Consumo del rodeo = Σ (cabezas × consumo por cabeza), por categoría | Excel · Demanda / Info Base (Tabla1) |
| Proyección de demanda: peso proyectado con **aumento diario** (ej. 0,5 kg/día en recría) recalculado por período (quincenal en el Excel) | Excel · Info Base (K67:K68, cols. J–O) |

### F. Balance y decisiones

| Fórmula | Fuente |
|---|---|
| Disponibilidad diaria (kg MS/día) = biomasa producida por los potreros del circuito (ver duda D5 por la extrapolación que hace el Excel) | Excel · Oferta B12 |
| **Balance (kg MS/día) = disponibilidad − consumo total** | Excel · Oferta B17 |
| Si balance < 0: **Suplementar (kg MS/cab/día) = balance / cabezas** | Excel · Oferta B18 |
| Si balance > 0: "sobra pasto, achico parcelas": **Superficie diaria ajustada (ha/día) = consumo total / (kg MS/ha del potrero de entrada − remanente objetivo)** | Excel · Oferta (2) B20 |
| **Superficie a cerrar para reservas (ha) = (1 − consumo/disponibilidad) × superficie total** | Excel · Oferta (2) B21 e Info Base B104:B105 |
| Superficie diaria a asignar (ha/día) = disponibilidad diaria / (kg MS/ha del potrero de entrada − biomasa de salida) | Excel · Oferta B14 |
| Vuelta operativa (días) = superficie de pastoreo / (ha/día) — y su inversa: ha/día = superficie / vuelta | Excel · Info Base A87:G89 |
| Asignación (kg pasto/cab/día) = ha/día × kg MS/ha disponibles / cabezas | Excel · Info Base G88 |
| Carga (cab/ha) = cabezas / ha efectivas de pastoreo | Excel · Info Base B98 |
| Demanda por hectárea (kg MS/ha/día) = carga × consumo por cabeza | Excel · Info Base B102 |

### G. Criterios de entrada / salida / ocupación (alfalfa, por altura)

| Criterio | Valor | Fuente |
|---|---|---|
| Entrada, primeras parcelas de primavera | 15–20 cm (≈1.000–1.500 kg MS/ha > 5 cm) | Artículo 2 |
| Entrada, tope pre-pastoreo | no superar 30–40 cm (≈3.000–4.000 kg MS/ha > 5 cm) | Artículo 2 |
| Salida (remanente) | no menor a 5–7 cm | Artículo 2 |
| **Tiempo de ocupación ≤ 3–5 días** por parcela/franja | Artículo 2 |
| Regla de ajuste: entradas repetidas con ≤ 20 cm → bajar carga, alargar vuelta (15→25 días), suplementar | Artículo 2 (cuadro de decisión) |
| Regla de ajuste: entradas repetidas con ≥ 50 cm → subir carga, acortar vuelta (25→15 días), cerrar franjas para reservas | Artículo 2 (cuadro de decisión) |
| No desmalezar/rotativa post-pastoreo (protege rebrote y persistencia) | Artículo 2 |
| Remanente por manchones: ≤ 20 % de manchones de rechazo está bien; > 30 % = remanente excesivo | Excel · Curva A30 |
| Pautas estacionales (alfalfa): primavera entrar antes de 2 hojas (20–25 cm), romper floración, volver a los 20 días, hacer reservas; verano remanente > 5 cm; otoño diferir lotes; invierno planificar stock | Excel · Info Base A109:B112 y A116:A117 |

---

## 1.5 Dudas a confirmar (no asumo nada de esto)

- **D1 — T base de festuca:** el Excel usa **4 °C**, el artículo usa **3 °C** en el ejemplo
  (500 GDA / (12−3)). ¿Cuál cargo como valor por defecto? (Serán parámetros editables por
  recurso de todos modos.)
- **D2 — Coeficiente de consumo:** el Excel aplica 3 % del peso vivo parejo para todas las
  categorías (vacas, terneras, toros, caballos). ¿Lo dejo como coeficiente único configurable
  por campo, o querés poder ajustarlo por categoría/rodeo?
- **D3 — Biomasa pre-pastoreo (Paso 4):** en el ejemplo del artículo, entrada ≈ TC × vuelta
  (sin sumar el remanente). ¿Confirmás esa fórmula exacta: `entrada = TC × vuelta`?
- **D4 — Agregación del stock del módulo (Paso 5):** con promedio ponderado por superficie
  reproduzco el valor DEF de la tabla del artículo (466), pero no exactamente MAM/JJA/SON.
  ¿El método correcto es promedio ponderado por hectáreas de cada recurso sobre la
  superficie total de la plataforma? ¿Podés confirmarlo (o preguntarle a Germán/Gonzalo)?
- **D5 — Disponibilidad diaria del Excel:** `Oferta!B12 = (crecimiento total de los potreros
  NO pastoreados / ha no pastoreadas) × ha totales` — es decir, extrapola la TC promedio
  también a la superficie que está siendo pastoreada. ¿Es intencional? ¿O la disponibilidad
  debería ser solo la suma del crecimiento de los potreros en descanso?
- **D6 — Stock promedio del sistema:** el Excel promedia los kg MS/ha de los potreros sin
  ponderar por superficie (`AVERAGE`). Para potreros de distinto tamaño el ponderado es
  distinto. ¿Uso promedio ponderado por superficie?
- **D7 — Curvas de calibración iniciales:** la hoja Curva tiene puntos altura→kg MS/ha con
  %MS fijo de 20 %. Hasta tener las curvas de Insúa/Vasco, ¿arranco con esa tabla como curva
  por defecto (interpolación lineal entre puntos) para todos los recursos, o preferís cargar
  una curva por recurso desde el día 1?
- **D8 — Captura de la medición:** ¿el plato electrónico exporta archivo (CSV/Bluetooth) para
  importar, o el medidor tipea la altura promedio del punto? ¿Cuántas lecturas de plato se
  promedian por punto de medición?
- **D9 — Temperaturas medias:** el Excel trae las de Tandil. ¿Las cargo como parámetro
  mensual editable por campo (con Tandil de default para Loma Alta)?
- **D10 — Proyección a 30–60 días:** al inicio no hay historial propio. ¿La curva de TC
  esperada por recurso/mes la carga el técnico (referencias INTA / "curva de Andrés") y el
  sistema la va reemplazando por la histórica propia a medida que acumula mediciones?
- **D11 — Parcelas/franjas diarias:** la hoja Registro tiene entrada/salida por parcela con
  altura. ¿El medidor registra cada cambio de parcela (evento diario), o solo entrada/salida
  del potrero y la parcela queda como dato del plan del técnico?
- **D12 — Umbrales de alerta:** ¿con qué anticipación y umbral disparo alertas de
  déficit/superávit? (ej.: proyección a 30 días cruza ±10 % del stock objetivo).

---

## FASE 2 — Plan y arquitectura propuesta (a aprobar)

### 2.1 Arquitectura recomendada: PWA offline-first + API + Postgres

Coincido con tu sugerencia de PWA. Propuesta concreta:

- **Frontend:** una sola aplicación web responsive (React + TypeScript + Vite) instalable
  como PWA. Tres "modos" según el rol al iniciar sesión:
  - *Medidor:* UI móvil minimalista, botones grandes, alto contraste (sol), operable con una
    mano. Funciona 100 % offline: los datos del campo asignado se precargan; las mediciones
    se guardan en IndexedDB y se sincronizan solas cuando hay señal.
  - *Técnico:* dashboard (mapa + indicadores + simulador de decisiones + informes).
  - *Cliente:* vistas de solo lectura + exportes.
- **Offline y sincronización:** las **mediciones y eventos de pastoreo son registros
  inmutables** creados con UUID + fecha/hora + autor en el dispositivo → la sincronización es
  una cola de "append" sin conflictos reales. Las entidades de gestión (potreros, circuitos,
  rodeos) se editan online (rol técnico) — esto simplifica muchísimo el sync sin perder nada
  del caso de uso real.
- **Backend:** API Node.js + **PostgreSQL con PostGIS** (geometrías de potreros y puntos).
  Autenticación con roles y multi-tenant (BioM → técnicos → clientes → campos). 
- **Mapa:** MapLibre/Leaflet con dibujo de polígonos de potreros; teselas del área del campo
  cacheadas para uso offline. El "mapa de calor" se genera con las mediciones propias.
- **Motor de cálculo agronómico:** un paquete TypeScript **compartido entre app y servidor**,
  con todas las fórmulas de la sección 1.4 y una batería de tests que reproduce los números
  del Excel y del artículo (los valores de Loma Alta son los casos de prueba). Así el
  medidor ve kg MS/ha al instante aun sin señal, y el dashboard calcula igual.
- **Trazabilidad:** log de auditoría append-only (quién cargó/cambió qué y cuándo) en todas
  las entidades + exportes **PDF** (informe del técnico) y **Excel** (datos crudos).
- **NDVI/satélite:** fuera del MVP; el modelo de datos deja prevista una capa de fuentes
  externas por potrero para integrarlo después.

### 2.2 Modelo de datos (núcleo)

```
organización → usuarios (rol: medidor | técnico | cliente, con alcance por campo)
cliente → campo → potrero (nombre, superficie, geometría, recurso)
recurso (especie/mezcla, T base, VMF, curva de calibración, remanentes objetivo por estación,
         TC de referencia por mes)
circuito (agrupación de potreros con vigencia; historial de altas/bajas de potreros)
punto de medición (potrero, lat/lon, activo/inactivo, historial propio)
medición (punto, fecha/hora, altura, kg MS/ha calculado + versión de curva usada, autor, equipo)
rodeo → categorías (cabezas, peso, aumento diario) → asignación rodeo↔circuito (desde/hasta)
evento de pastoreo (potrero/parcela, entrada: fecha+altura, salida: fecha+altura,
                    ocupación, descanso calculados)  ← calcado de la hoja Registro
plan (lo que el técnico planifica) vs. ejecución (lo que se registró) → control
recomendación / informe del técnico (versionado, con estado visto/aplicado)
alerta (déficit/superávit proyectado, vuelta vencida, potrero pasado de altura)
temperaturas medias mensuales por campo · log de auditoría
```

### 2.3 Pantallas por rol (resumen)

- **Medidor:** "Mi recorrida de hoy" (puntos pendientes ordenados, con GPS para llegar) →
  tocar punto → teclado numérico grande para la altura → confirmación con kg MS/ha calculado →
  siguiente. Registro rápido de entrada/salida de animales (potrero, rodeo, hora). Indicador
  de mediciones pendientes de sincronizar.
- **Técnico:** mapa por campo con semáforo de potreros (listo para entrar / en pastoreo /
  en descanso, con días restantes de vuelta / pasado); panel por circuito: stock promedio vs.
  objetivo, TC actual, balance oferta–demanda, proyección 30–60 días; simulador (qué pasa si
  cambio carga / suplemento / cierro ha); editor de circuitos (tildar/destildar potreros y
  puntos con chequeo de superficies); ABM de rodeos, recursos y curvas; generador de informes.
- **Cliente:** estado actual del campo, historial de mediciones y pastoreos por potrero,
  informes recibidos, exportar PDF/Excel. Sin edición.

### 2.4 Iteraciones propuestas

1. **Motor de cálculo + modelo de datos**, con tests que validan contra el Excel de Loma
   Alta y las tablas del artículo (te muestro los números lado a lado).
2. **App del medidor** (offline + sync) con Loma Alta cargado como campo piloto.
3. **Dashboard del técnico** (mapa, indicadores, balance, recomendaciones, alertas).
4. **Portal del cliente + exportes PDF/Excel + auditoría completa.**
5. **Instructivo de uso** en lenguaje simple, un capítulo por perfil.

Cada iteración termina con algo usable que te muestro antes de seguir.

### 2.5 Decisiones que necesito de tu lado antes de codear

1. Respuestas a las dudas **D1–D12** (las críticas para la Iteración 1: D1, D3, D4, D5, D6, D7).
2. **Hosting:** ¿servidor/servicio propio de BioM o un servicio administrado? (afecta costo
   mensual y quién lo mantiene; puedo arrancar con algo gratuito/barato y migrable).
3. Confirmación del stack propuesto (o restricciones que tengas: presupuesto, dominio, marca).
