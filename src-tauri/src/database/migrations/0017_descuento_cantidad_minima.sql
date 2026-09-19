-- Migración 0017: cantidad mínima para que aplique el descuento.
-- Ej: descuento 20% a partir de 3 unidades.
-- Si es 1, el descuento se aplica siempre (comportamiento anterior).

ALTER TABLE productos ADD COLUMN descuento_cantidad_minima INTEGER NOT NULL DEFAULT 1;
