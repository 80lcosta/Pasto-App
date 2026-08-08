# Importación de KML, mapa del campo y objetivos editables

Responde a dos definiciones de BioM:

1. **Los parámetros quedan abiertos** para ir ajustándolos con el uso.
2. **Los límites de los potreros entran por KML** (lo que se exporta de Google Earth), que es
   la vía principal; dibujar a campo queda para más adelante.

## Lectura de KML (`packages/core/src/kml.ts`)

Sin dependencias, corre igual en el navegador y en el servidor.

- Lee cada `Placemark` con `Polygon` o `MultiGeometry`; ignora puntos y líneas (aguadas,
  molinos, caminos) sin dar error.
- Resuelve nombres con `CDATA` y con caracteres escapados (`&amp;`, acentos).
- Soporta huecos (`innerBoundaryIs`) y los descuenta de la superficie.
- **Calcula la superficie sobre el elipsoide** con la fórmula del exceso esférico, en
  hectáreas. No importa el sentido en que esté dibujado el alambrado.
- KMZ: se descomprime con `DecompressionStream` del navegador; si el archivo usa un formato
  que no se puede leer, el mensaje pide subir el `.kml` suelto.

Validado con 13 tests: un cuadrado de 1 km da 100 ha, uno de 2 km da 400, y con un hueco de
1 km quedan 300.

## Guardado (`POST /api/potreros/importar`)

Solo el técnico (`escribir:configuracion`). Por cada potrero del archivo:

- Si **ya existe un potrero con el mismo nombre**, se le agrega la geometría y la superficie.
  No se toca el recurso ni se pierden las mediciones.
- Si **no existe**, se crea con el primer recurso del campo (después se ajusta).
- Si viene **sin nombre o sin geometría**, se omite y se informa cuál.

La respuesta dice qué se creó, qué se actualizó y qué se omitió, y todo queda en la auditoría.

## Mapa del campo (`packages/dashboard/src/vistas/Mapa.tsx`)

Dibuja los potreros en SVG a partir de las geometrías, pintados con el semáforo (listo para
entrar / pasado / en descanso / en pastoreo / sin datos), con el nombre y los kg MS/ha.

**Sin imágenes de fondo a propósito:** no depende de un servicio de mapas (no hay que pagarlo
ni configurar claves) y funciona con mala conexión. Corrige la proyección por la latitud del
campo para que no salga estirado a lo ancho.

Si todavía no hay geometrías cargadas, el panel explica cómo subir el KML en vez de mostrar
un cuadro vacío.

## Objetivos editables (`POST /api/targets`)

El técnico ajusta biomasa de entrada, stock objetivo y biomasa de salida desde
**Configuración**. Se validan antes de guardar, porque un objetivo mal cargado desalinea todo
el tablero:

- Los tres tienen que ser números entre 0 y 20.000.
- La salida tiene que ser **menor** que la entrada.
- El stock objetivo tiene que quedar **entre** la salida y la entrada.
- El coeficiente de consumo, si se manda, entre 0 y 15 % del peso vivo.

Cada cambio queda en la auditoría **con el valor anterior y el nuevo**, así se puede
reconstruir con qué objetivos se tomó cada decisión pasada.

## Verificación

104 tests en total (13 nuevos en el motor, 12 nuevos en la API). Además, prueba de punta a
punta con navegador: se sube un KML de Loma Alta con los seis lotes, se ve la vista previa
con las superficies calculadas (29,9 / 22,0 / 29,9 / 24,0 / 29,9 / 25,0 ha contra las 30 / 22
/ 30 / 24 / 30 / 25 del Excel), se confirma, se cambia el stock objetivo a 1.550 y el
indicador del tablero lo toma; el mapa dibuja los seis potreros con su estado.

## Lo que sigue pendiente del mapa

- **Dibujar el potrero desde el celular**, caminando el alambrado con el GPS.
- **Foto satelital de fondo**, que requiere contratar un servicio de mapas.
- Ubicar los puntos de medición sobre el mapa (hoy la app guarda el GPS de cada medición,
  pero los puntos no tienen coordenadas propias todavía).
