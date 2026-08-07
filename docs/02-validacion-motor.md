# Validación del motor de cálculo (`@pasto/core`) contra las fuentes

Iteración 1 del plan aprobado. Cada fórmula del motor se valida con un test automático
que reproduce los números publicados en las fuentes. **Resultado: 44/44 tests pasan.**

Correr la suite: `npm install && npm test` (Node ≥ 20).

## Números lado a lado

### Guía INTA §3.1 — recorrida del 8 de junio (= Excel hoja "Oferta")

| Variable | Publicado | Motor | Test |
|---|---|---|---|
| TC potrero A (1.800→1.970 en 7 días) | 24,3 | 24,29 | ✅ |
| TC potrero F (en pastoreo) | "no se calcula" | `null` | ✅ |
| Biomasa total producida | 1.619 kg MS/día | 1.618,6 | ✅ |
| TC ponderada (÷ 113 ha no pastoreadas) | 14,3 | 14,32 | ✅ |
| Pasto para comer/día (× 137 ha) | 1.959 | 1.962,3 (dif. < 0,5 %, por redondeo de la Guía) | ✅ |
| Stock 1/6 y 8/6 | 1.478 · 1.445 | 1.478,3 · 1.445,0 | ✅ |
| Potrero de entrada | A (1.970 ≈ target 2.000) | A | ✅ |
| Superficie diaria (1.959 ÷ 970) | 2,0 ha/día | 2,02 | ✅ |
| Balance (1.959 − 5.137) | −3.178 | −3.178,5 | ✅ |
| Suplementación (÷ 685) | 4,6 kg/an/día | 4,64 | ✅ |
| Vuelta resultante (137 ÷ 2,0) | ~68 días | 68,5 | ✅ |
| Lectura de la cuña | OK / seguir | `ok` / `seguir`, orden A-C-D-E-B-F | ✅ |

### Guía INTA §3.2 — recorrida del 10 de octubre (= Excel hoja "Oferta (2)")

| Variable | Publicado | Motor | Test |
|---|---|---|---|
| Biomasa total · TC ponderada · pasto/día | 5.621 · 49,7 · 6.809 | 5.621,4 · 49,75 · 6.815,4 (< 0,5 %) | ✅ |
| Stock 3/10 y 10/10 | 1.537 · 1.701 | 1.536,7 · 1.700,8 | ✅ |
| Potrero A pasado (2.500 > 2.000) → reservas; entrar a C | C | pasados = [A], elegido = C | ✅ |
| Superficie diaria (6.809 ÷ 900) | 7,6 ha/día | 7,57 | ✅ |
| Parcela por consumo (5.137 ÷ 900) | 5,7 ha/día | 5,71 | ✅ |
| Cierre para reservas (1 − 5.137/6.809) | 25 % ≈ 34 ha | 24,6 % · 33,6 ha | ✅ |
| Lectura de la cuña | stock alto → cerrar potreros, subir carga, cortar suplemento | `alto` / `exceso` | ✅ |

### Guía INTA Anexo 1 — calibración (= Excel hoja "Curva")

| Variable | Publicado | Motor | Test |
|---|---|---|---|
| Muestra 70 g, 20 % MS, marco 0,16 m² | 880 kg MS/ha (redondeado de 87,5 g/m²) | 875 | ✅ |
| Regresión de las 10 muestras | y = 144,3x − 177,12; R² 0,8623 | 144,3 · −177,1 · 0,862 | ✅ |
| Curva en uso: 13 / 8 / 17 cm | 1.695 / 975 / 2.271 kg MS/ha | idénticos | ✅ |

### Fuente A — método de 5 pasos

| Variable | Publicado | Motor | Test |
|---|---|---|---|
| Vuelta térmica 500/(12−3) y 500/(16−3) | 56 · 38 días | 55,6 · 38,5 | ✅ |
| Paso 4 (entrada = TC × vuelta), casos exactos | festuca JJA 750 · alfalfa SON 1.750 | idénticos | ✅ |
| Paso 5 ((entrada+remanente)/2), 10 celdas de la tabla | p.ej. alfalfa DEF 811 | todas a ±0,5 | ✅ |
| Agregación módulo DEF ((811×40+475×30)/100) | 466 | 466,9 | ✅ |

### Excel Info Base — vuelta térmica (Tandil) y fuente D

| Variable | Publicado | Motor | Test |
|---|---|---|---|
| Festuca ene/abr/jul/oct (VMF 500, Tbase 4) | 29,4 / 50 / 250 / 55,6 | idénticos | ✅ |
| Alfalfa ene/abr/jul/oct (VMF 350, Tbase 3,5) | 20 / 33,3 / 140 / 36,8 | idénticos | ✅ |
| T media ≤ T base | — | vuelta `null` (indefinida) | ✅ |
| Estado foliar operativo (15 días, estado 1,0 → 2,5 hojas) | ~23 días | 22,5 | ✅ |

### Fuente E — "El cálculo del miedo" (Tabla 1 completa)

| Mes | Publicado (H %, I ha, L ha/día) | Motor | Test |
|---|---|---|---|
| Septiembre | 21 % · 52 ha · 7,9 | 21 % · 52,6 · 7,9 | ✅ |
| Octubre | 39 % · 97 ha · 7,7 | 38,8 % · 96,9 · 7,7 | ✅ |
| Noviembre | 30 % · 51 ha · 6,0 | 30 % · 51,0 · 6,0 | ✅ |

### Demanda (Guía §3 + Excel)

| Variable | Publicado | Motor | Test |
|---|---|---|---|
| 685 × (250 × 3 %) | 5.137 kg MS/día | 5.137,5 | ✅ |
| Vaca Preñada H: 66 × (475 × 3 %) | 940,5 (Excel F72) | 940,5 | ✅ |

## Discrepancias detectadas en las fuentes (a confirmar con BioM)

- **D13 — Proyección de demanda del Excel:** Info Base (cols. J–O) suma el aumento de peso
  del período (0,5 kg/día × 15 días = 7,5) **directamente como kg MS de consumo del rodeo**,
  sin multiplicar por cabezas ni por el 3 %. Es dimensionalmente inconsistente. El motor
  implementa la versión consistente: consumo proyectado = (peso + aumento × días) × 3 % ×
  cabezas (ej.: rodeo de 25 vaquillonas de 380 kg a 15 días → 290,6 vs. 292,5 del Excel).
- **D14 — Total de demanda del Excel (5.576,4):** las filas de rodeo agrupan categorías con
  superposición (F73 y F74 comparten "Vaquillona AA", etc.), de modo que el total J81 cuenta
  dos veces varias categorías. El motor suma cada categoría una sola vez: 3.768,45 kg MS/día
  para la misma lista. Revisar qué agrupación en rodeos es la real de Loma Alta.
- **D4 (sigue abierta) — Stock estacional del módulo:** el promedio ponderado sobre la
  superficie total reproduce DEF (466) pero no MAM/JJA/SON de la tabla de la fuente A
  (p.ej. MAM da 774 vs. 569 publicado). El motor expone la agregación ponderada con base
  configurable; el valor por estación queda editable hasta confirmar el método con los autores.
- **Redondeos:** la Guía redondea intermedios (14,3; 1.959; 6.809; 880). El motor calcula sin
  redondear y los tests verifican < 0,5 % de diferencia con los valores publicados.

## Decisiones de implementación (defaults del plan aprobado, todos configurables)

- Consumo objetivo 3 % del peso vivo (D2), coeficiente editable por campo/categoría.
- Entrada = TC × vuelta, sin sumar remanente (D3).
- Stock promedio: ponderado por superficie disponible como default del sistema; el promedio
  simple queda como opción para reproducir la Guía/Excel (D6). La cuña usa promedio simple
  para ser comparable con los paneles de la Guía.
- Potreros cerrados para reservas quedan fuera de la plataforma (ni crecimiento "para comer"
  ni superficie) hasta reabrirse.
- Curva default: festuca sudeste bonaerense (−177 + 144 × cm, datum ras del suelo).
- Ocupación máxima: 4 días en primavera–verano (sep–feb), 7 en otoño–invierno (Guía);
  el límite fino por recurso (alfalfa 3–5) se define en la configuración del recurso.
- Toda biomasa lleva su datum (`ras_suelo` / `sobre_5cm`); la capa de datos impedirá
  combinar datums distintos.
