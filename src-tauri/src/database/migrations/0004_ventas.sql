-- Migración 0004: Ventas, detalle y pagos
-- Fase 2 - Base de datos SQLite
-- Este es el núcleo transaccional del sistema (ver sección 18 del prompt).

CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL UNIQUE, -- ej: '000001', correlativo formateado
    caja_id INTEGER NOT NULL REFERENCES cajas(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    cliente_id INTEGER REFERENCES clientes(id),
    fecha TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    subtotal REAL NOT NULL CHECK (subtotal >= 0),
    descuento REAL NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    total REAL NOT NULL CHECK (total >= 0),
    estado TEXT NOT NULL DEFAULT 'CONFIRMADA' CHECK (
        estado IN ('CONFIRMADA', 'ANULADA')
    ),
    impresa INTEGER NOT NULL DEFAULT 0 CHECK (impresa IN (0, 1)),
    sync_uuid TEXT NOT NULL UNIQUE, -- identificador único global, usado para sincronización idempotente
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS detalle_venta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    cantidad REAL NOT NULL CHECK (cantidad > 0), -- unidades, o kg/litros si es pesable
    es_pesable INTEGER NOT NULL DEFAULT 0 CHECK (es_pesable IN (0, 1)),
    origen_peso TEXT CHECK (origen_peso IS NULL OR origen_peso IN ('AUTOMATICO', 'MANUAL')),
    precio_unitario REAL NOT NULL CHECK (precio_unitario >= 0), -- precio/kg si es pesable
    descuento REAL NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    promocion_id INTEGER REFERENCES promociones(id),
    subtotal REAL NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    metodo TEXT NOT NULL CHECK (
        metodo IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'QR', 'OTRO')
    ),
    monto REAL NOT NULL CHECK (monto > 0),
    monto_recibido REAL, -- solo aplica a EFECTIVO, para calcular vuelto
    vuelto REAL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_caja ON ventas(caja_id);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta ON detalle_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_producto ON detalle_venta(producto_id);
CREATE INDEX IF NOT EXISTS idx_pagos_venta ON pagos(venta_id);
