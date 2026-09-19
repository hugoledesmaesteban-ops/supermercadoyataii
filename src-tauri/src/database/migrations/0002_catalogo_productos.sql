-- Migración 0002: Catálogo de productos
-- Fase 2 - Base de datos SQLite

CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS marcas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    cuit TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    contacto TEXT,
    observaciones TEXT,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_barra TEXT UNIQUE,
    sku TEXT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_id INTEGER REFERENCES categorias(id),
    marca_id INTEGER REFERENCES marcas(id),
    precio_compra REAL NOT NULL DEFAULT 0 CHECK (precio_compra >= 0),
    precio_venta REAL NOT NULL DEFAULT 0 CHECK (precio_venta >= 0),
    precio_mayorista REAL CHECK (precio_mayorista IS NULL OR precio_mayorista >= 0),
    stock REAL NOT NULL DEFAULT 0, -- REAL para soportar kg/litros con decimales
    stock_minimo REAL NOT NULL DEFAULT 0,
    unidad_medida TEXT NOT NULL DEFAULT 'unidad' CHECK (
        unidad_medida IN ('unidad', 'kg', 'gramos', 'litros', 'metros')
    ),
    es_pesable INTEGER NOT NULL DEFAULT 0 CHECK (es_pesable IN (0, 1)),
    precio_por_kg REAL CHECK (precio_por_kg IS NULL OR precio_por_kg >= 0),
    iva REAL NOT NULL DEFAULT 21.0,
    vencimiento TEXT, -- fecha ISO, opcional
    proveedor_id INTEGER REFERENCES proveedores(id),
    foto TEXT, -- ruta relativa al archivo de imagen
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    CHECK (
        (es_pesable = 0) OR (es_pesable = 1 AND precio_por_kg IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_productos_codigo_barra ON productos(codigo_barra);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);

-- Categorías iniciales (sección 66 del prompt: opcionales, no son "datos falsos",
-- son catálogo base real que cualquier almacén usa)
INSERT OR IGNORE INTO categorias (nombre) VALUES
    ('Bebidas'), ('Almacén'), ('Lácteos'), ('Panadería'),
    ('Frutas'), ('Verduras'), ('Limpieza'), ('Golosinas'), ('Congelados');
