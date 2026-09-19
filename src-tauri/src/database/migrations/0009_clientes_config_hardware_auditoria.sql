-- Migración 0009: Clientes, configuración, hardware y auditoría
-- Fase 2 - Base de datos SQLite

CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    documento TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Tabla de configuración como clave/valor: comercio, ticket, hardware, etc.
CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL, -- JSON serializado cuando el valor es estructurado
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS dispositivos_hardware (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK (tipo IN ('IMPRESORA', 'BALANZA', 'LECTOR', 'CAJON')),
    modelo TEXT NOT NULL,
    conexion TEXT NOT NULL CHECK (conexion IN ('USB', 'ETHERNET', 'SERIAL', 'BLUETOOTH')),
    parametros TEXT, -- JSON: IP/puerto, puerto COM, baud rate, paridad, etc. según el tipo
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    ultimo_estado TEXT CHECK (ultimo_estado IS NULL OR ultimo_estado IN ('OK', 'ERROR', 'DESCONOCIDO')),
    ultima_verificacion TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER REFERENCES usuarios(id),
    accion TEXT NOT NULL, -- ej: 'CAMBIO_PRECIO', 'APERTURA_CAJON_MANUAL', 'LOGIN', 'CIERRE_CAJA'
    entidad TEXT, -- 'producto' | 'venta' | 'caja' | 'usuario' | 'configuracion' | ...
    entidad_id INTEGER,
    detalle TEXT, -- JSON con el detalle específico (valor anterior/nuevo, motivo, etc.)
    fecha TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria(accion);
