-- Migración 0012: Ventas suspendidas (secciones 21-22 del pedido de rediseño).
-- Permite guardar el carrito actual como JSON y recuperarlo después sin
-- perder la venta. El carrito nunca se consulta por partes: se serializa
-- entero al suspender y se deserializa entero al recuperar.

CREATE TABLE IF NOT EXISTS ventas_suspendidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL UNIQUE,
    caja_id INTEGER NOT NULL REFERENCES cajas(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    carrito_json TEXT NOT NULL,
    fecha TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_ventas_suspendidas_caja ON ventas_suspendidas(caja_id);