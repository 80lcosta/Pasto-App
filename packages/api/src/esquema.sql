-- Esquema del Proyecto Pasto (PostgreSQL).
--
-- Multi-cliente y multi-campo: una organización (BioM) tiene clientes, cada
-- cliente tiene campos, y cada usuario accede solo a los campos que le fueron
-- habilitados. Las mediciones, eventos y recomendaciones son inmutables: se
-- insertan, no se editan, y toda escritura queda en la tabla de auditoría.
--
-- Nota: las geometrías de los potreros se guardan como GeoJSON en jsonb
-- porque PostGIS todavía no está en juego; cuando esté, `geometria` migra a
-- geometry(Polygon, 4326) sin tocar el resto del modelo.

create table if not exists organizacion (
  id            text primary key,
  nombre        text not null,
  creado_en     timestamptz not null default now()
);

create table if not exists cliente (
  id              text primary key,
  organizacion_id text not null references organizacion(id),
  nombre          text not null,
  creado_en       timestamptz not null default now()
);

create table if not exists campo (
  id            text primary key,
  cliente_id    text not null references cliente(id),
  nombre        text not null,
  -- objetivos de stock, entrada y salida + datum de medición
  targets       jsonb not null,
  creado_en     timestamptz not null default now()
);

create table if not exists usuario (
  id          text primary key,
  email       text not null unique,
  nombre      text not null,
  -- medidor: carga a campo · tecnico: analiza y recomienda · cliente: consulta
  rol         text not null check (rol in ('medidor', 'tecnico', 'cliente')),
  clave_hash  text not null,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create table if not exists acceso (
  usuario_id  text not null references usuario(id),
  campo_id    text not null references campo(id),
  primary key (usuario_id, campo_id)
);

create table if not exists recurso (
  id          text primary key,
  campo_id    text not null references campo(id),
  nombre      text not null,
  curva       jsonb not null,
  nota_curva  text
);

create table if not exists potrero (
  id                text primary key,
  campo_id          text not null references campo(id),
  orden             integer not null,
  nombre            text not null,
  superficie_ha     numeric(10,2) not null,
  sup_ganadera_ha   numeric(10,2) not null,
  recurso_id        text not null references recurso(id),
  descripcion       text,
  geometria         jsonb
);

create table if not exists punto (
  id          text primary key,
  potrero_id  text not null references potrero(id),
  nombre      text not null,
  orden       integer not null,
  activo      boolean not null default true,
  lat         double precision,
  lon         double precision
);

create table if not exists rodeo (
  id          text primary key,
  campo_id    text not null references campo(id),
  nombre      text not null,
  categorias  jsonb not null
);

create table if not exists medicion (
  id                uuid primary key,
  campo_id          text not null references campo(id),
  potrero_id        text not null references potrero(id),
  punto_id          text not null references punto(id),
  fecha_hora        timestamptz not null,
  lecturas_cm       jsonb not null,
  altura_promedio   numeric(6,2) not null,
  kg_ms_ha          numeric(10,2) not null,
  curva             jsonb not null,
  gps               jsonb,
  observaciones     text,
  usuario_id        text references usuario(id),
  usuario_nombre    text not null,
  dispositivo       text,
  recibida_en       timestamptz not null default now()
);

create index if not exists medicion_campo_fecha on medicion (campo_id, fecha_hora);

create table if not exists evento (
  id              uuid primary key,
  campo_id        text not null references campo(id),
  tipo            text not null check (tipo in ('entrada', 'salida')),
  potrero_id      text not null references potrero(id),
  rodeo_id        text references rodeo(id),
  fecha_hora      timestamptz not null,
  altura_cm       numeric(6,2),
  observaciones   text,
  usuario_id      text references usuario(id),
  usuario_nombre  text not null,
  recibido_en     timestamptz not null default now()
);

create index if not exists evento_campo_fecha on evento (campo_id, fecha_hora);

create table if not exists recomendacion (
  id          uuid primary key,
  campo_id    text not null references campo(id),
  fecha_hora  timestamptz not null,
  autor       text not null,
  texto       text not null,
  datos       jsonb,
  usuario_id  text references usuario(id),
  creada_en   timestamptz not null default now()
);

create table if not exists sesion (
  token_hash  text primary key,
  usuario_id  text not null references usuario(id),
  creada_en   timestamptz not null default now(),
  expira_en   timestamptz not null
);

-- Quién hizo qué y cuándo. Se escribe en cada operación que modifica datos.
create table if not exists auditoria (
  id              bigserial primary key,
  cuando          timestamptz not null default now(),
  usuario_id      text references usuario(id),
  usuario_nombre  text,
  rol             text,
  accion          text not null,
  entidad         text,
  entidad_id      text,
  campo_id        text references campo(id),
  detalle         jsonb
);

create index if not exists auditoria_cuando on auditoria (cuando desc);
