/**
 * Tipos del motor de cálculo agronómico.
 *
 * Fuentes de las fórmulas (ver docs/01-analisis-y-plan.md §1.4):
 *  - Guía:      "Guía para el manejo de pasturas en función del stock de pasto y la tasa
 *               de crecimiento" (Berone et al., INTA Balcarce, 2022).
 *  - Excel:     Manejo_Pastoreo_Loma_Alta.xlsx (tablero inicial de BioM).
 *  - Fuente A:  Tuñón & Berone, Visión Rural Nº 142 (método de 5 pasos).
 *  - Fuente B:  Berone & Sardiña, Visión Rural Nº 139 (alfalfa por altura).
 *  - Fuente D:  Berone, Recavarren & Marino, Visión Rural Nº 137 (filocrono/VMF).
 *  - Fuente E:  Tuñón & Berone, Visión Rural Nº 143 (cálculo del miedo).
 */

/**
 * Plano de referencia (datum) desde el que se expresa una biomasa.
 * La Guía y el Excel trabajan desde el ras del suelo (~1 cm); el método de
 * 5 pasos (fuente A) trabaja por encima de los 5 cm. Nunca mezclar datums
 * en un mismo cálculo.
 */
export type Datum = 'ras_suelo' | 'sobre_5cm';

/** Curva lineal de estimación de biomasa: kg MS/ha = interseccion + pendiente × altura (cm). */
export interface CurvaCalibracion {
  pendiente: number;
  interseccion: number;
  datum: Datum;
  /** Coeficiente de determinación del ajuste, si se conoce. */
  r2?: number;
}

/** Muestra de corte para calibrar la curva (Guía Anexo 1 / Excel hoja Curva). */
export interface MuestraCalibracion {
  alturaCm: number;
  pesoHumedoG: number;
  /** Proporción de materia seca (0,2 = 20 %). */
  proporcionMS: number;
  /** Lado del marco cuadrado en metros. Default 0,40 m. */
  ladoMarcoM?: number;
}

/** Estado de un potrero entre dos recorridas consecutivas. */
export interface PotreroMedido {
  nombre: string;
  superficieHa: number;
  /** Biomasa de la recorrida anterior (kg MS/ha). */
  biomasaAnteriorKgMSHa: number;
  /** Biomasa de la recorrida actual (kg MS/ha). */
  biomasaActualKgMSHa: number;
  /** En pastoreo activo: no se calcula tasa de crecimiento (Guía §3.1). */
  enPastoreo?: boolean;
  /** Cerrado para confección de reservas: fuera de la rotación. */
  cerrado?: boolean;
}

/** Targets de la plataforma de pastoreo (Guía §2.1 y §3). */
export interface TargetsPlataforma {
  stockKgMSHa: number;
  entradaKgMSHa: number;
  salidaKgMSHa: number;
  datum: Datum;
  /** Tolerancia relativa para clasificar el stock como ok/bajo/alto. Default 0,10. */
  toleranciaStock?: number;
}

/** Categoría animal dentro de un rodeo (Excel hojas Demanda / Info Base). */
export interface CategoriaRodeo {
  nombre?: string;
  cabezas: number;
  pesoKg: number;
  /** Aumento diario de peso vivo (kg/día), para proyectar demanda. */
  aumentoDiarioKg?: number;
}

/** Parámetros fisiológicos de una especie forrajera (fuente D, Tabla 1). */
export interface ParametrosEspecie {
  /** Intervalo térmico entre hojas sucesivas (°Cd). */
  filocronoGD: [number, number];
  /** Vida media foliar (°Cd). */
  vmfGD: [number, number];
  /** Número de hojas vivas por macollo. */
  hojasVivas: number;
}
