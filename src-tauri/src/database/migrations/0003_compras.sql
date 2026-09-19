-- Migración 0003: Compras a proveedores
-- Fase 2 - Base de datos SQLite

CREATE TABLE IF NOT EXISTS compras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor_id INTEGER NOT NULL REFERENCES proveedores(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    numero_comprobante TEXT,
    fecha TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    total REAL NOT NULL DEFAULT 0 CHECK (total >= 0),
    observaciones TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS detalle_compra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    cantidad REAL NOT NULL CHECK (cantidad > 0),
    precio_compra_unitario REAL NOT NULL CHECK (precio_compra_unitario >= 0),
    subtotal REAL NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_detalle_compra_compra ON detalle_compra(compra_id);
CREATE INDEX IF NOT EXISTS idx_detalle_compra_producto ON detalle_compra(producto_id);
