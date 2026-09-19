-- Migración 0005: Promociones
-- Fase 2 - Base de datos SQLite

CREATE TABLE IF NOT EXISTS promociones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('PORCENTAJE', '2X1', 'PRECIO_FIJO', 'COMBO')),
    valor REAL, -- % de descuento, o precio fijo, según el tipo
    categoria_id INTEGER REFERENCES categorias(id),
    cantidad_minima REAL NOT NULL DEFAULT 1 CHECK (cantidad_minima > 0),
    fecha_inicio TEXT,
    fecha_fin TEXT,
    dias_activos TEXT, -- lista serializada, ej: 'LUN,MAR,MIE,JUE,VIE'
    hora_inicio TEXT, -- 'HH:MM'
    hora_fin TEXT,
    prioridad INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS promocion_productos (
    promocion_id INTEGER NOT NULL REFERENCES promociones(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    PRIMARY KEY (promocion_id, producto_id)
);

CREATE INDEX IF NOT EXISTS idx_promociones_activo ON promociones(activo);
CREATE INDEX IF NOT EXISTS idx_promocion_productos_producto ON promocion_productos(producto_id);
