-- Migración 0008: Devoluciones
-- Fase 2 - Base de datos SQLite

CREATE TABLE IF NOT EXISTS devoluciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL REFERENCES ventas(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    motivo TEXT NOT NULL,
    total REAL NOT NULL CHECK (total >= 0),
    fecha TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS detalle_devolucion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    devolucion_id INTEGER NOT NULL REFERENCES devoluciones(id) ON DELETE CASCADE,
    detalle_venta_id INTEGER NOT NULL REFERENCES detalle_venta(id),
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    cantidad REAL NOT NULL CHECK (cantidad > 0),
    subtotal REAL NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_devoluciones_venta ON devoluciones(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_devolucion_devolucion ON detalle_devolucion(devolucion_id);
