# Proyecto Pasto (BioM) — Análisis de insumos y plan propuesto

> **Estado: FASE 1 y FASE 2 — pendiente de aprobación.** No se escribió código de la aplicación.
> Este documento resume lo entendido de los insumos, lista las fórmulas extraídas
> (con su fuente exacta), las dudas a confirmar y la arquitectura propuesta.
>
> **v2:** incorpora las cinco fuentes técnicas adicionales. La *Guía INTA Balcarce (Berone
> et al., 2022)* resultó ser la metodología madre del Excel de Loma Alta (mismos números:
> 137 ha, 685 animales, potreros A–F) y **resuelve varias dudas de la v1** (ver §1.5).

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
- Se define un **stock promedio objetivo** del módulo de pastoreo. Lo **disponible para
  comer** es el excedente del stock actual sobre el objetivo × superficie, repartido en los
  días de la vuelta, **más** lo que crece (tasa de crecimiento) de acá en adelante.
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
  pero *flexible según el campo*). El crecimiento se calcula comparando **el mismo punto
  contra su medición anterior**.
- Los puntos se pueden **tildar/destildar** (activar/desactivar) cuando se reconfigura un
  circuito, sin perder su historial: el recurso es el mismo y la tasa de crecimiento también.
- El sistema debe chequear superficies (qué potrero está en uso y cuánto suma el circuito).
- Medición con **plato ascendente (rising plate meter) calibrado**, con curvas de calibración
  **por tipo de recurso**. El plato digital carga la altura al celular. Calibrar todo llevará
  ~1 año (4 estaciones); mientras tanto se usan curvas existentes (Juan Insúa / "el Vasco").
- Frecuencia de medición: **quincenal**, semanal en primavera.

**Lo que quieren ver (outputs):**
- Mapa del campo con potreros, circuitos, puntos de medición y colores por estado
  ("lo recién comido y lo que hay estoqueado") con las mediciones propias.
- Curva histórica de stock y de tasa de crecimiento por punto/circuito.
- Balance oferta–demanda por circuito y proyección a 30–60 días usando la curva histórica
  de crecimiento del recurso.
- **Alertas anticipadas** de déficit/superávit con sugerencias accionables.
- **Control plan vs. ejecución**: *"La planificación es fundamental. El control de lo que se
  está haciendo es recontra fundamental… el control es lo que falta."*
- Informe periódico del técnico al productor.

**Usuarios y despliegue:**
- Tres perfiles: medidor (carga a campo, offline), técnico (análisis y recomendaciones),
  cliente (trazabilidad y consulta). Multi-cliente / multi-campo.
- Piloto: **Loma Alta**; después La Londra y los campos nuevos.
- Decisiones cualitativas (ej. alfalfa con 9–10 nudos → pastorear aunque falte stock) son
  parte del servicio del técnico; la app las registra como recomendación, no las automatiza.

### 1.2 El Excel (Manejo_Pastoreo_Loma_Alta.xlsx)

Cinco hojas; la lógica que hay que respetar:

| Hoja | Contenido |
|---|---|
| **Info Base** | Parámetros térmicos por especie (T base, VMF), vuelta por tiempo térmico, lotes de Loma Alta, demanda por rodeo con proyección quincenal, vuelta operativa, superficie a cerrar, pautas estacionales de alfalfa, definición de stock objetivo |
| **Oferta** (y **Oferta (2)**) | Potreros × 2 fechas de medición → tasa de crecimiento, biomasa total/día, balance contra consumo del rodeo, superficie diaria a asignar, suplementación o cierre de reservas. **Es la planilla de los ejemplos 3.1 y 3.2 de la Guía INTA (§1.3-C), número por número** |
| **Demanda** | Rodeos por categoría (cabezas, peso) y consumo = peso × 3 % (nota: 6 % a ras del suelo, 3 % a 5 cm) |
| **Curva** | Calibración altura → kg MS/ha con marco 0,40 × 0,40 m. **Son los datos del ejemplo del Anexo 1 de la Guía INTA** (curva festuca sudeste bonaerense) |
| **Registro** | Trazabilidad de pastoreos: rodeo, cabezas, peso, consumo/día, potrero, superficie, recurso, parcela, frente, superficie de parcela, fecha/hora y altura de entrada y salida, ocupación, descanso, carga, observaciones |

La hoja **Registro** es el borrador del modelo de datos del evento de pastoreo.

### 1.3 El material del curso (7 documentos)

| # | Documento | Aporte principal |
|---|---|---|
| A | **Tuñón & Berone** — *"Manejo del pastoreo: una herramienta para calcular cuál debería ser la cobertura promedio…"* (Visión Rural Nº 142) | Método de **5 pasos** para definir el stock objetivo por estación |
| B | **Berone & Sardiña** — *"Pastoreo de Alfalfa: nuevas ideas…"* (Visión Rural Nº 139) | Criterios de alfalfa **por altura, no fenología**: entrada, salida, ocupación, vuelta |
| C | **Berone, Cicore, Errecart, Insua, Jaimes, Maglietti, Marino & Orionte** — *"Guía para el manejo de pasturas en función del stock de pasto y la tasa de crecimiento"* (INTA Balcarce, marzo 2022, ISBN 978-987-679-319-3) | **La metodología central completa**: targets, rutina de recorrida, cálculo de TC ponderada, elección de potrero de entrada, superficie diaria, gráfico de cuña (feed wedge) con reglas de decisión, protocolo de calibración (Anexo 1) y control de remanentes (Anexo 2). El Excel de Loma Alta está construido sobre esta guía |
| D | **Berone, Recavarren & Marino** — *"¿Cada cuánto damos la vuelta en pastoreos de Festuca?"* (Visión Rural Nº 137) | Base fisiológica: filocrono, VMF y estado foliar óptimo por especie (tabla completa); guía de vueltas para festuca en Balcarce |
| E | **Tuñón & Berone** — *"El cálculo del miedo: para manejo del pasto en primavera"* (Visión Rural Nº 143) | Algoritmo A–L para el **cierre proactivo de superficie para reservas** en primavera; concepto de "Happy Day" (oferta = demanda) |
| F | **Sardiña, Méndez, Diez & Berone** — PP 51, 45º Congreso AAPA (2022) | Evidencia experimental: alfalfa fin de primavera–verano, descanso 14 vs 28 días → +29 % ADPV (0,97 vs 0,75 kg/día) y tendencia a +14 % carne/ha |
| G | **Méndez, Sardiña, Diez, Ceconi, Viano & Berone** — PP 33, 44º Congreso AAPA (2021) | Evidencia experimental: alfalfa en verano, descanso 14 vs 28 días → +14 % ADPV (0,83 vs 0,73); regla: para entrar con < 35 cm en verano, el intervalo entre pastoreos de una franja debe ser ≤ 15 días |

Contexto de validación de la metodología (fuente C): en el Módulo de Producción Intensiva
de Carne de la Reserva 7 (EEA INTA Balcarce) produce 1.000–1.300 kg carne/ha/año con
cosecha de 10.000–12.000 kg MS/ha/año y carga media de 5–7 cab/ha.

---

## 1.4 Fórmulas y criterios extraídos (con fuente)

Regla aplicada: **solo** fórmulas presentes en los insumos. Nada inventado.

> **Principio de consistencia del plano de medición (datum):** la Guía INTA aclara que hay
> quienes miden **desde el ras del suelo** (~1 cm) y quienes miden **desde 4–5 cm**. Todos
> los targets, curvas y mediciones deben compartir el mismo datum. La Guía (y el Excel)
> trabajan **desde el ras del suelo**; el método de 5 pasos (fuente A) trabaja **> 5 cm**.
> En la app, cada valor de biomasa/target/curva llevará su datum explícito y el sistema
> impedirá mezclar datums en un mismo cálculo.

### A. Disponibilidad de materia seca (medición)

| Fórmula / criterio | Fuente |
|---|---|
| Peso seco (g) = peso húmedo (g) × %MS | Excel · Curva + Guía Anexo 1 |
| g MS/m² = peso seco / 0,16 (marco de 0,40 × 0,40 m) | Excel · Curva + Guía Anexo 1 |
| **kg MS/ha = g MS/m² × 10** | Excel · Curva + Guía Anexo 1 |
| Curva de estimación altura → kg MS/ha **por recurso** (regresión lineal). Ejemplo festuca sudeste bonaerense: **kg MS/ha = −177 + 144 × altura (cm)**, R² 0,86 | Guía Anexo 1 (mismos datos que Excel · Curva) |
| Ideal: curva por estadío/estación (vegetativa otoño–invierno–verano vs. encañazón primavera). La curva de otoño sirve todo el año excepto primavera. Si "lo ideal es enemigo de lo posible": una curva por recurso usada con constancia alcanza | Guía Anexo 1 |
| Mezclas que incluyen alfalfa: usar la curva de alfalfa en octubre–marzo | Guía Anexo 1 |
| Protocolo de calibración: 3–5 situaciones de disponibilidad (alta/media/baja) × 2–3 repeticiones; marco 0,40 × 0,40 m; medir altura, cortar siempre a la misma altura (ras ~1 cm, o 4–5 cm), pesar verde, %MS de tabla o microondas; regresión altura vs. kg MS/ha | Guía Anexo 1 |
| Tabla %MS por recurso y estación (región pampeana): alfalfa 18-20/18-20/20-24/20-26 (O/I/P/V); festuca alta 17-20/18-20/20-24/20-24; raigrás anual 13-18/13-18/18-24/–; avena 14-18/15-18/20-24/–; sorgo forrajero 20-24/–/–/20-24 | Guía Anexo 1 (lab. INTA Balcarce) |
| Rutina de monitoreo: altura cada ~10 pasos a lo largo del recorrido; **si el punto cae en maleza o suelo desnudo se anota CERO**; promedio de alturas por potrero → curva → kg MS/ha | Guía Anexo 1 |
| El método (plato, regla, visual, drone, satélite) lo elige el recorredor; **lo determinante es la frecuencia y constancia**, no el método. Mejor un monitoreo quincenal sostenido que uno semanal que no se cumple | Guía §2.2 y Anexo 1 |
| Recorrer toda la superficie cada 7–15 días, empezando y terminando en el mismo lugar, misma rutina (mismo recorrido, día y hora) | Guía §2.2 |

### B. Tasa de crecimiento y "pasto para comer por día"

| Fórmula | Fuente |
|---|---|
| **TC (kg MS/ha/día) = (kg MS/ha fecha₂ − kg MS/ha fecha₁) / días entre mediciones**, sobre el mismo punto/potrero | Guía §3.1 + Excel · Oferta |
| En potrero **en pastoreo activo no se calcula TC** | Guía §3.1 ("no se calcula") + Excel |
| Biomasa total del potrero (kg MS/día) = TC × superficie del potrero | Guía §3.1 + Excel |
| **TC ponderada (kg MS/ha/día) = Σ biomasa total / hectáreas NO pastoreadas** (ej.: 1.619/113 = 14,3) | Guía §3.1 |
| **Pasto para comer por día (kg MS/día) = TC ponderada × superficie TOTAL de la plataforma** (ej.: 14,3 × 137 = 1.959) — resuelve la duda D5 de la v1: la extrapolación del Excel es intencional y está documentada | Guía §3.1 |

### C. Targets de stock, entrada y salida

| Criterio | Fuente |
|---|---|
| Stock de pasto = **promedio de biomasa de toda la superficie bajo pastoreo** (todos los potreros, incluido el pastoreado) | Guía §2.1 |
| Principio: para mantener el stock estable, **consumir por día una cantidad similar a lo que crece por día** | Guía §2.1 |
| Targets recomendados (desde ras del suelo) para festuca alta, raigrás anual, agropiro, alfalfa y mezclas: **stock 1.500–2.000, entrada 2.000–2.500, salida 1.000–1.500 kg MS/ha** | Guía §2.1 |
| Caso práctico (= Excel): stock a mantener 1.500, entrada 2.000, salida 1.000, disponible para consumo 1.000 kg MS/ha | Guía §3 + Excel · Oferta I2:J5 |
| No existe un valor único ideal de stock: hay un rango donde producción, calidad y persistencia se afectan poco; depende del sistema y las especies | Guía §2.1 + fuente A |
| **Método de 5 pasos** para el stock objetivo estacional (valores > 5 cm): 1) vuelta = VMF/(Tmedia−Tbase); 2) TC estimada para esa vuelta; 3) remanente objetivo (raigrás 0–200, alfalfa 200, festuca 200–400 según estación); 4) **entrada = TC × vuelta**; 5) **stock del recurso = (entrada + remanente)/2**, agregado por superficie de cada recurso | Fuente A |
| Referencia práctica Loma Alta: objetivo 450–550 kg MS/ha (> 5 cm) | Excel · Info Base B139:C141 |

### D. Vuelta de pastoreo / tiempo de descanso

| Fórmula / criterio | Fuente |
|---|---|
| Tiempo térmico diario (°Cd/día) = T media diaria − T base | Fuentes A y D + Excel · Info Base |
| **Vuelta (días) = VMF (°Cd) / (T media − T base)** | Fuentes A y D + Excel |
| T base de gramíneas templadas perennes: **2–4 °C** (el Excel usa 4 °C para festuca, 3,5 °C para alfalfa; el ejemplo de la fuente A usa 3 °C) | Fuente D |
| Tabla por especie — filocrono (°Cd), VMF (°Cd), hojas vivas/macollo: raigrás perenne 100-115 / 300-350 / 3,0 · **festuca 180-220 / 450-550 / 2,5** · agropiro 180-240 / 450-600 / 2,5 · pasto ovillo 105-125 / 420-500 / 4,0 · cebadilla criolla 75-90 / 300-350 / 4,0 · raigrás anual 90-120 / 350-390 / 3,8 · avena 110-150 / 450-500 / 3,8 | Fuente D · Tabla 1 |
| **Estado foliar óptimo**: pastorear festuca al llegar a **2,5 hojas** (nov–jul); entre ago–nov entrar a **1,5–1,7 hojas** para control temprano de floración (CTF), con pastoreos frecuentes (20–28 días) y severos (remanente 3–4 cm) | Fuente D |
| Estimación operativa a campo: días/hoja = días desde la salida / estado foliar actual; días restantes ≈ hojas faltantes × días/hoja (ej.: salió hace 15 días, estado 1,0 → faltan 1,5 hojas ≈ 23 días → armar el circuito para volver en 20–25 días) | Fuente D |
| Vueltas orientativas festuca (Balcarce): **35–50 días mar–abr · 50–70 días may–jul · 25–35 días ago–feb** | Fuente D |
| Vueltas orientativas del método de 5 pasos (días, DEF/MAM/JJA/SON): raigrás –/24/33/–, alfalfa 24/42/69/25, festuca 28/39/50/23 | Fuente A |
| Alfalfa: vuelta sep–feb **15–25 días**; feb–abr **35–45 días** | Fuente B |
| Alfalfa en verano: para entrar con < 35 cm, intervalo entre pastoreos ≤ 15 días | Fuente G |
| Pastorear antes del óptimo: forraje de altísima calidad, pero repetido y con restricciones reduce reservas y persistencia. Pastorear después: pérdidas por senescencia, matas rechazadas, menor calidad | Fuente D |
| Bajo riego/alta fertilización: si acumula > 3.000 kg MS/ha o 20–25 cm antes de las 2,5–3 hojas → cortar/pastorear igual | Fuente D |
| **En el manejo por stock, la vuelta NO es una variable de manejo sino un RESULTADO que cambia semana a semana**: vuelta = superficie total / (ha/día) (ej.: 137/2,0 = 68 días) | Guía §3.1 |

### E. Demanda

| Fórmula | Fuente |
|---|---|
| Consumo objetivo (kg MS/día/cab) = peso vivo × 3 % — ej. de la Guía: 250 kg × 3 % = 7,5 kg MS/animal/día; 685 animales → 5.137 kg MS/día. Nota del Excel: 6 % si el disponible se expresa a ras del suelo sin descontar remanente; 3 % si se trabaja neto (ver duda D2) | Guía §3 + Excel · Demanda B1/C1 |
| Consumo del rodeo = Σ (cabezas × consumo por cabeza), por categoría | Excel · Demanda / Info Base |
| Proyección de demanda: peso proyectado con aumento diario (ej. 0,5 kg/día en recría), recalculado por período | Excel · Info Base |
| Referencia experimental de asignación en alfalfa: 4 % del peso vivo (base seca) | Fuentes F y G |
| Consumo máximo potencial de pasto por vaca: 20–32 kg MS/ha/día según animal y sistema (ejemplo con vacas: 14 kg MS/vaca/día) | Fuente E |

### F. Rutina de decisión post-recorrida (el corazón del dashboard)

Secuencia documentada en la Guía §3 (decisiones para los próximos 7 días):

| Paso | Fórmula / regla | Fuente |
|---|---|---|
| 1. ¿A qué potrero entro? | El de biomasa más cercana al **target de entrada** (ej.: 1.970 ≈ 2.000). Un potrero **pasado** (ej. 2.500 > target) se deja para reservas | Guía §3.1–3.2 |
| 2. ¿Cuánta superficie por día? | **ha/día = pasto para comer por día / consumible del potrero de entrada**, donde consumible = biomasa del potrero − remanente objetivo (ej.: 1.959/(1.970−1.000) = 2,0 ha/día; 6.809/900 = 7,6 ha/día) | Guía §3.1–3.2 + Excel · Oferta B14 |
| 3. ¿Alcanza? | **Balance (kg MS/día) = pasto para comer/día − demanda total** | Guía §3.1 + Excel B17 |
| 3a. Si falta | **Suplementar (kg/animal/día) = déficit / cabezas** (ej.: 3.178/685 = 4,6) **o remover animales** | Guía §3.1 + Excel B18 |
| 3b. Si sobra | Achicar la parcela al consumo: **ha/día = demanda / consumible** (ej.: 5.137/900 = 5,7) y/o **cerrar potreros para reservas: % a cerrar = 1 − (demanda/crecimiento)** (ej.: 1 − 5.137/6.809 = 25 % ≈ 34 ha) — cerrar empezando por el potrero pasado | Guía §3.2 + Excel · Oferta (2) B20:B21, Info Base B104:B105 |
| 4. Ocupación | Primavera–verano: parcela diaria o **≤ 3–4 días**; otoño–invierno: **≤ 7 días** (alfalfa, fuente B: 3–5 días) | Guía §3.1–3.2 + Fuente B |
| 5. Consecuencias de no actuar | No suplementar/descargar en déficit → cae remanente, stock y rebrote. No cerrar en primavera → remanentes sobre el target, pasaje a reproductivo, matas, pérdida de estructura. Crecimiento ≫ consumo frecuente → subir carga, bajar suplementación/fertilización | Guía §3.1–3.2 |

### G. Gráfico de cuña (feed wedge) y su lectura

| Elemento | Fuente |
|---|---|
| Barras: potreros ordenados de mayor a menor biomasa (kg MS/ha). Línea roja: une el **target de entrada** (extremo izquierdo) con el **target de salida** (extremo derecho) | Guía §3 |
| Lectura 1 — stock ≈ objetivo y potreros cerca de la línea → **seguir igual** | Guía §3.3 |
| Lectura 2 — stock bajo y muchos potreros debajo de la línea → **déficit: desacelerar rotación, bajar carga, aumentar suplementación** | Guía §3.3 |
| Lectura 3 — stock alto y muchos potreros encima de la línea → **exceso: acelerar rotación, sacar suplemento, aumentar carga, cerrar potreros para reservas** | Guía §3.3 |

### H. "El cálculo del miedo" (planificación de primavera)

Algoritmo mensual A–L para decidir cuánta superficie cerrar para reservas **antes** de que
el pasto se dispare (fuente E, Tabla 1 — formaliza Excel · Info Base B104:B105):

```
A = superficie en pastoreo del mes (ha)          G = % superficie necesaria = E/F × 100
B = animales pastoreando                          H = % superficie a cerrar = 100 − G
C = carga (an/ha) = B/A                           I = ha a cerrar = H × A
D = consumo esperado por animal (kg MS/día)       J = vuelta de pastoreo (días)
E = consumo por ha (kg MS/ha/día) = C × D         K = ha/día sin cierre = A/J
F = tasa de crecimiento (kg MS/ha/día)            L = ha/día con cierre = (A − I)/J
```

- **"Happy Day"**: fecha en que la oferta (crecimiento/ha) iguala a la demanda (consumo/ha);
  el cálculo se hace **antes** (julio–agosto) para llegar preparado (fuente E).
- El cierre empieza apenas el stock supera el objetivo (ej. de la fuente E: objetivo
  600 kg MS/ha > 5 cm, cierre al superarlo el 30/8) — sensación de escasez auto-provocada.

### I. Control de remanentes (auditoría de la estimación)

| Criterio | Fuente |
|---|---|
| Revisar remanentes en y entre recorridas para validar que oferta y demanda estimadas están dentro de lo previsto; si no, ajustar | Guía §2.3 y Anexo 2 |
| Festuca — ideal: 4–5 cm entre manchones, manchones comidos y < 15 % del área. Excesivo: sobra forraje entre manchones, manchones grandes ≥ 30 % del área. Remanente muy bajo: aceptable en primavera, evitarlo en otoño-invierno/verano/baja fertilidad | Guía Anexo 2 |
| Alfalfa — ideal: 3–5 cm entre manchones. Excesivo: baja eficiencia de cosecha y calidad | Guía Anexo 2 |
| Método de conteo: caminar la parcela recién pastoreada; de cada 10 pasos, 1–2 sobre manchones de rechazo = 10–20 % → bien (el Excel usa: ≤ 20 % bien, > 30 % excesivo) | Guía Anexo 2 + Excel · Curva A30 |
| Alfalfa: **no pasar rotativa/desmalezadora post-pastoreo** (remueve hojas/tallos basales, fuerza uso de reservas radiculares) | Fuente B |

### J. Criterios de alfalfa por altura (primavera–verano)

| Criterio | Valor | Fuente |
|---|---|---|
| Manejar por **altura**, no por fenología (10 % floración / botón floral) | — | Fuente B + Excel |
| Entrada, primeras parcelas de primavera | 15–20 cm (≈ 1.000–1.500 kg MS/ha > 5 cm) | Fuente B |
| Entrada, tope pre-pastoreo | no superar 30–40 cm (≈ 3.000–4.000 kg MS/ha > 5 cm) | Fuente B |
| Salida (remanente) | no menor a 5–7 cm | Fuente B |
| Ocupación | ≤ 3–5 días | Fuente B |
| Ajuste: entradas repetidas ≤ 20 cm → bajar carga, alargar vuelta (15→25), suplementar | — | Fuente B |
| Ajuste: entradas repetidas ≥ 50 cm → subir carga, acortar vuelta (25→15), cerrar franjas | — | Fuente B |
| Evidencia: descanso 14 vs 28 días en fin de primavera/verano → +14 a +29 % ADPV y tendencia a +14–16 % carne/ha, sin afectar persistencia | — | Fuentes F y G |
| Pautas estacionales: primavera entrar antes de 2 hojas (20–25 cm), romper floración, volver a los 20 días, hacer reservas; verano remanente > 5 cm; otoño diferir lotes; invierno planificar stock | — | Excel · Info Base |

---

## 1.5 Dudas — estado actualizado

**Resueltas por las nuevas fuentes:**

- **D5 — Disponibilidad diaria (RESUELTA):** la Guía §3.1 documenta exactamente la fórmula
  del Excel: TC ponderada = Σ biomasa producida / **ha no pastoreadas**, multiplicada por la
  **superficie total** de la plataforma. Se implementa así.
- **D7 — Curvas de calibración (RESUELTA):** el Anexo 1 de la Guía trae el protocolo completo
  y la curva de ejemplo (festuca sudeste bonaerense: kg MS/ha = −177 + 144 × cm), que es
  exactamente la hoja Curva del Excel. Arranco con esa curva como default de festuca/mezclas
  (y la regla "mezclas con alfalfa → curva de alfalfa oct–mar"), con ABM de curvas por
  recurso para reemplazarlas por las propias a medida que calibren.
- **D1 — T base (ACOTADA):** la fuente D establece T base 2–4 °C para gramíneas templadas
  perennes y VMF de festuca 450–550 °Cd. Los valores del Excel (4 °C, 500 °Cd) están dentro
  del rango → los uso como default **editables por recurso**. Solo confirmame que te sirve así.
- **D11 — Parcelas diarias (ACOTADA):** la Guía trabaja con parcela diaria o de 2–7 días
  como decisión de la recorrida. Propongo: la parcela es un dato del plan del técnico, y el
  medidor registra los eventos reales de entrada/salida (como la hoja Registro). Confirmá.

**Siguen abiertas (necesito tu confirmación):**

- **D2 — Consumo:** ¿3 % del peso vivo como default editable (por campo o por categoría)?
  Nota: la Guía usa 3 % como *consumo objetivo* con biomasa neta (descontando remanente);
  los ensayos de alfalfa usan *asignación* del 4 % PV. Son conceptos distintos — propongo
  implementar el de la Guía (consumo objetivo × cabezas vs. pasto para comer por día) y
  dejar el % como parámetro. ¿De acuerdo?
- **D3 — Paso 4 del método de 5 pasos:** ¿confirmás `entrada = TC × vuelta` (sin sumar
  remanente), como cierran los números del artículo?
- **D4 — Agregación del stock estacional (5 pasos):** ponderado por superficie reproduce
  DEF (466) pero no exacto MAM/JJA/SON de la tabla del artículo. ¿Confirmás ponderado por
  superficie? (En el monitoreo diario la Guía promedia potreros directamente — eso ya está
  claro; esta duda es solo para la calculadora de stock objetivo estacional.)
- **D6 — Stock promedio:** la Guía define stock como "promedio de biomasa de toda la
  superficie" y en el ejemplo promedia potreros sin ponderar (superficies casi iguales).
  Para potreros de tamaño dispar, ¿promedio ponderado por superficie? (Recomiendo sí.)
- **D8 — Captura de la medición:** ¿el plato electrónico exporta archivo (CSV/Bluetooth)
  para importar, o el medidor tipea la altura promedio del punto? ¿Cuántas lecturas de
  plato se promedian por punto? (La Guía sugiere lecturas cada ~10 pasos, con cero en
  maleza/suelo desnudo — lo implemento así si no me decís otra cosa.)
- **D9 — Temperaturas medias:** ¿parámetro mensual editable por campo (Tandil default para
  Loma Alta)?
- **D10 — Proyección 30–60 días:** ¿curva de TC esperada por recurso/mes cargada por el
  técnico (referencias INTA) y reemplazada por la histórica propia cuando exista?
- **D12 — Umbrales de alerta:** ¿anticipación y umbral? (propongo: proyección a 30 días
  cruza el rango objetivo de stock, con las acciones sugeridas de la Guía §3.3.)

---

## FASE 2 — Plan y arquitectura propuesta (a aprobar)

### 2.1 Arquitectura recomendada: PWA offline-first + API + Postgres

- **Frontend:** una sola aplicación web responsive (React + TypeScript + Vite) instalable
  como PWA. Tres "modos" según el rol:
  - *Medidor:* UI móvil minimalista, botones grandes, alto contraste (sol), operable con una
    mano. 100 % offline: datos del campo precargados; mediciones en IndexedDB; sync automática.
  - *Técnico:* dashboard (mapa + cuña + indicadores + simulador + informes).
  - *Cliente:* vistas de solo lectura + exportes.
- **Offline y sincronización:** mediciones y eventos de pastoreo son **registros inmutables**
  (UUID + fecha/hora + autor generados en el dispositivo) → cola de "append" sin conflictos.
  Las entidades de gestión (potreros, circuitos, rodeos) se editan online (rol técnico).
- **Backend:** API Node.js + **PostgreSQL con PostGIS** (geometrías de potreros y puntos).
  Autenticación con roles y multi-tenant (BioM → técnicos → clientes → campos).
- **Mapa:** MapLibre/Leaflet con dibujo de polígonos; teselas cacheadas para offline.
- **Motor de cálculo agronómico:** paquete TypeScript **compartido** app/servidor con todas
  las fórmulas de §1.4 y tests que reproducen: el caso 3.1 de la Guía (junio: TC ponderada
  14,3 → 1.959 kg MS/día → 2,0 ha/día → suplementar 4,6 kg/an/día), el caso 3.2 (octubre:
  49,7 → 6.809 → 7,6 ha/día → parcela 5,7 ha ó cerrar 25 % ≈ 34 ha), la curva del Anexo 1
  (13 cm → 1.695; 8 cm → 975; 17 cm → 2.271 kg MS/ha) y las tablas del método de 5 pasos.
- **Trazabilidad:** log de auditoría append-only + exportes **PDF** (informe del técnico)
  y **Excel** (datos crudos).
- **NDVI/satélite:** fuera del MVP; el modelo de datos deja prevista la capa.

### 2.2 Modelo de datos (núcleo)

```
organización → usuarios (rol: medidor | técnico | cliente, con alcance por campo)
cliente → campo → potrero (nombre, superficie, geometría, recurso)
recurso (especie/mezcla, T base, VMF, filocrono, hojas vivas, datum de medición,
         curva de calibración vigente + histórico, %MS por estación,
         remanentes objetivo, targets stock/entrada/salida, TC de referencia por mes)
circuito (agrupación de potreros con vigencia; historial de altas/bajas)
punto de medición (potrero, lat/lon, activo/inactivo, historial propio)
medición (punto, fecha/hora, altura, kg MS/ha calculado + curva y datum usados, autor, equipo)
observación de recorrida (potrero, manchones %, malezas, suelo desnudo, notas)  ← Guía §2.3
rodeo → categorías (cabezas, peso, aumento diario) → asignación rodeo↔circuito (desde/hasta)
evento de pastoreo (potrero/parcela, entrada: fecha+altura, salida: fecha+altura,
                    ocupación, descanso calculados)  ← hoja Registro
cierre para reservas (potrero, desde/hasta, motivo)  ← "cálculo del miedo"
plan (decisiones de la recorrida: potrero de entrada, ha/día, suplementación, cierres)
   vs. ejecución (eventos registrados) → control
recomendación / informe del técnico (versionado, estado visto/aplicado)
alerta (déficit/superávit proyectado, vuelta vencida, potrero pasado del target de entrada)
temperaturas medias mensuales por campo · log de auditoría
```

### 2.3 Pantallas por rol (resumen)

- **Medidor:** "Mi recorrida" (puntos pendientes en orden fijo de recorrida — Guía §2.2 —
  con GPS), teclado numérico grande para altura (o cero por maleza/suelo desnudo),
  confirmación con kg MS/ha, observaciones rápidas (manchones, malezas), registro de
  entrada/salida de animales, indicador de sync pendiente.
- **Técnico:** mapa con semáforo de potreros; **gráfico de cuña por circuito** (potreros
  ordenados + línea de targets, con las 3 lecturas de la Guía §3.3 sugeridas
  automáticamente); panel de recorrida: TC ponderada, pasto/día, balance, ha/día sugerida,
  suplementación equivalente, % a cerrar ("cálculo del miedo"); proyección 30–60 días;
  simulador; editor de circuitos y puntos; ABM de rodeos, recursos, curvas y targets;
  generador de informes.
- **Cliente:** estado actual, historial de mediciones/pastoreos/decisiones, informes,
  exportar PDF/Excel. Sin edición.

### 2.4 Iteraciones propuestas

1. **Motor de cálculo + modelo de datos**, con tests que validan contra la Guía INTA, el
   Excel de Loma Alta y los artículos (te muestro los números lado a lado).
2. **App del medidor** (offline + sync) con Loma Alta cargado como piloto.
3. **Dashboard del técnico** (mapa, cuña, balance, recomendaciones, alertas).
4. **Portal del cliente + exportes PDF/Excel + auditoría completa.**
5. **Instructivo de uso** en lenguaje simple, un capítulo por perfil.

### 2.5 Decisiones que necesito de tu lado antes de codear

1. Respuestas a las dudas abiertas de §1.5 (críticas para la Iteración 1: D2, D3, D4, D6).
2. **Hosting:** ¿servicio administrado o servidor propio de BioM?
3. Confirmación del stack propuesto (o restricciones: presupuesto, dominio, marca).
