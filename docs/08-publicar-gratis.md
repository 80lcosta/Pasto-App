# Publicar sin pagar servidor

Objetivo: **mostrarle la herramienta a los clientes sin gastar un peso**, y pagar recién
cuando alguien diga que sí.

## De qué está hecho el sistema (y qué cuesta plata)

| Parte | Qué hace | Cuesta |
|---|---|---|
| App del medidor y tablero | Los programas que ve la gente. Son archivos que el navegador descarga y ejecuta | **Nada.** Se publican gratis y para siempre |
| Motor de cálculo | Todas las cuentas agronómicas | **Nada.** Va adentro de los programas y corre en el navegador |
| API + base de datos | Guarda lo que se mide y lo comparte entre el medidor, el técnico y el dueño | **Esto es lo único que cuesta**, porque tiene que estar prendido las 24 horas |

La clave: **para mostrarle la herramienta a un cliente no hace falta la tercera parte.**

## Modo demostración: sin servidor, gratis

Las dos aplicaciones traen un botón **"Entrar a la demostración"**: cargan el campo Loma Alta
con cinco recorridas de ejemplo y funcionan enteras dentro del navegador.

Funciona todo: los cinco indicadores, el gráfico de cuña con su lectura, las decisiones de la
semana, el mapa, el historial, la auditoría, los exportes a Excel y PDF, la carga de un KML, y
en el celular la medición punto por punto. **Los cálculos son exactamente los mismos**, porque
es el mismo motor validado.

En el tablero, el enlace **"ver como dueño del campo"** cambia de perfil sin salir, para
mostrarle al cliente qué ve él y comprobar que no puede modificar nada.

Un cartel avisa siempre que es una demostración y que los datos no se guardan en ningún lado.
En el celular, la banda superior dice lo mismo y la sincronización queda desactivada: no hay
forma de que una demostración ensucie datos reales.

### Cómo publicarla gratis

Los dos programas son archivos estáticos: se suben a cualquier servicio de páginas y quedan
con una dirección para compartir.

```bash
npm run app:build       # queda en packages/app/dist
npm run tablero:build   # queda en packages/dashboard/dist
```

Esas dos carpetas se arrastran a **Cloudflare Pages**, **Netlify** o **Vercel** — los tres
tienen plan gratuito para este tamaño, sin tarjeta. También sirve **GitHub Pages**, que ya
viene con el repositorio.

Queda algo como `pasto-tablero.pages.dev` y `pasto-medidor.pages.dev`: le pasás el enlace al
cliente y lo abre desde su computadora o su celular.

> Los planes gratuitos cambian seguido. Antes de elegir uno conviene mirar las condiciones
> del día.

## Cuando un cliente diga que sí

Ahí sí hace falta la base de datos, porque el medidor tiene que mandar los datos y el técnico
tiene que verlos desde otra computadora.

**Camino gratuito para un primer piloto:** base de datos en **Neon** (plan gratuito de
PostgreSQL) y la API en algún plan gratuito de aplicaciones. Funciona, con una advertencia
importante: los planes gratuitos **apagan el servidor cuando nadie lo usa**, y la primera
consulta después de un rato puede tardar cerca de un minuto en responder. Para un piloto
interno es tolerable; **para una demostración delante de un cliente es pésimo** —
por eso conviene el modo demostración, que abre al instante.

**Camino pago, cuando haya un cliente:** unos 15 dólares por mes en un servicio administrado
alcanzan para varios campos. Recién ahí tiene sentido.

## Resumen

1. **Hoy:** publicar las dos aplicaciones gratis y mostrar el modo demostración. Costo: cero.
2. **Cuando alguien quiera probarlo en serio:** levantar la base y la API (gratis si se
   tolera la demora del arranque).
3. **Cuando haya un cliente pagando:** mover a un servicio administrado, ~15 dólares por mes.

En ningún paso hay que rehacer nada: es el mismo código, solo cambia dónde vive la base.
