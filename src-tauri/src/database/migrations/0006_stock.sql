-- Migración 0006: Movimientos de stock
-- Fase 2 - Base de datos SQLite
-- Regla del prompt (sección 19): nunca modificar stock sin registrar el movimiento.

CREATE TABLE IF NOT EXISTS stock_movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    cantidad REAL NOT NULL, -- positivo = entrada, negativo = salida
    tipo TEXT NOT NULL CHECK (tipo IN (
        'ENTRADA', 'VENTA', 'DEVOLUCION', 'AJUSTE',
        'PERDIDA', 'ROTURA', 'VENCIMIENTO', 'COMPRA'
    )),
    motivo TEXT,
    referencia_tipo TEXT, -- 'venta' | 'compra' | 'devolucion' | 'ajuste_manual'
    referencia_id INTEGER, -- id de la venta/compra/devolución relacionada
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    stock_resultante REAL NOT NULL, -- stock del producto luego de aplicar este movimiento
    fecha TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_movimientos_producto ON stock_movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_stock_movimientos_fecha ON stock_movimientos(fecha);
CREATE INDEX IF NOT EXISTS idx_stock_movimientos_tipo ON stock_movimientos(tipo);
