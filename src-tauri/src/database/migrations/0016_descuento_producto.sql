-- Migración 0016: descuento por porcentaje aplicado a productos.
-- El campo vive en `productos` (no en `promociones`) porque el descuento
-- es por producto individual, sin fecha ni cantidad mínima.

ALTER TABLE productos ADD COLUMN descuento_porcentaje REAL NOT NULL DEFAULT 0;
