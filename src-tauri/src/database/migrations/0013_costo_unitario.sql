-- Migración 0013: costo histórico de cada venta.
-- Guarda el costo del producto AL MOMENTO DE LA VENTA, para que los
-- reportes de ganancia nunca cambien si después se edita el precio de compra.

ALTER TABLE detalle_venta ADD COLUMN costo_unitario REAL NOT NULL DEFAULT 0;

-- Backfill: para las ventas ya existentes, usar el precio_compra actual
-- del producto (no es lo ideal histórico, pero es lo mejor que podemos
-- reconstruir sin datos previos).
UPDATE detalle_venta
SET costo_unitario = COALESCE(
    (SELECT p.precio_compra FROM productos p WHERE p.id = detalle_venta.producto_id),
    0
)
WHERE costo_unitario = 0;

CREATE INDEX IF NOT EXISTS idx_detalle_venta_costo ON detalle_venta(costo_unitario);
