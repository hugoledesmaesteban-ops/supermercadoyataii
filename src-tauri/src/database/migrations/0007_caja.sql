-- Migración 0007: Caja
-- Fase 2 - Base de datos SQLite

CREATE TABLE IF NOT EXISTS cajas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_apertura_id INTEGER NOT NULL REFERENCES usuarios(id),
    usuario_cierre_id INTEGER REFERENCES usuarios(id),
    monto_apertura REAL NOT NULL CHECK (monto_apertura >= 0),
    fecha_apertura TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_cierre TEXT,
    efectivo_esperado REAL, -- calculado al momento del cierre Z
    efectivo_declarado REAL, -- contado físicamente por el usuario
    diferencia REAL,
    estado TEXT NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
    cierre_pdf_path TEXT, -- ruta al PDF del cierre Z generado
    bloqueada INTEGER NOT NULL DEFAULT 0 CHECK (bloqueada IN (0, 1)) -- true tras confirmar el cierre Z
);

CREATE TABLE IF NOT EXISTS movimientos_caja (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caja_id INTEGER NOT NULL REFERENCES cajas(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('VENTA', 'RETIRO', 'INGRESO', 'APERTURA', 'DEVOLUCION')),
    metodo_pago TEXT CHECK (metodo_pago IS NULL OR metodo_pago IN (
        'EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'QR', 'OTRO'
    )),
    monto REAL NOT NULL,
    motivo TEXT,
    referencia_tipo TEXT, -- 'venta' | 'devolucion' | null para retiros/ingresos manuales
    referencia_id INTEGER,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    fecha TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_cajas_estado ON cajas(estado);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_caja ON movimientos_caja(caja_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_tipo ON movimientos_caja(tipo);
