-- Migración 0010: Licencia local, backups y sincronización
-- Fase 2 - Base de datos SQLite

-- Copia local del último estado de licencia verificado contra Supabase.
-- Es la que permite el "modo sin Internet" con ventana de gracia (sección 42).
CREATE TABLE IF NOT EXISTS licencias_local (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- fila única
    cliente_id TEXT NOT NULL,
    activo INTEGER NOT NULL CHECK (activo IN (0, 1)),
    valido_hasta TEXT,
    deuda REAL,
    mensaje_soporte TEXT,
    ultima_verificacion TEXT NOT NULL,
    hash_integridad TEXT NOT NULL -- para detectar edición manual del registro (sección 43)
);

CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    archivo TEXT NOT NULL, -- nombre de archivo, ej: backup_2026-09-11_2030.db
    ruta TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('MANUAL', 'AUTOMATICO_PRE_RESTAURACION', 'PROGRAMADO')),
    subido_supabase INTEGER NOT NULL DEFAULT 0 CHECK (subido_supabase IN (0, 1)),
    usuario_id INTEGER REFERENCES usuarios(id),
    fecha TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Cola de sincronización idempotente (sección 50): cada fila referencia una
-- entidad local que debe reflejarse en Supabase cuando haya Internet.
CREATE TABLE IF NOT EXISTS sincronizacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entidad TEXT NOT NULL, -- 'venta' | 'cierre_caja' | ...
    entidad_uuid TEXT NOT NULL, -- coincide con sync_uuid de la entidad local
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'sincronizado', 'error')),
    intentos INTEGER NOT NULL DEFAULT 0,
    ultimo_error TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (entidad, entidad_uuid)
);

CREATE INDEX IF NOT EXISTS idx_sincronizacion_estado ON sincronizacion(estado);
