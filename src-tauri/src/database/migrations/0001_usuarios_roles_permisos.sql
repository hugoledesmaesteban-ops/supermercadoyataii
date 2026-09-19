-- Migración 0001: Usuarios, roles y permisos
-- Fase 2 - Base de datos SQLite

CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE CHECK (nombre IN ('ADMINISTRADOR', 'GERENTE', 'CAJERO')),
    descripcion TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS permisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clave TEXT NOT NULL UNIQUE, -- ej: 'ventas.crear', 'productos.editar_precio', 'caja.cierre'
    descripcion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_usuario TEXT NOT NULL UNIQUE,
    nombre_completo TEXT NOT NULL,
    password_hash TEXT NOT NULL, -- Argon2id, nunca texto plano
    pin_hash TEXT, -- PIN corto opcional para autorizar acciones en caja (también hasheado)
    rol_id INTEGER NOT NULL REFERENCES roles(id),
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    ultimo_login TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol_id);

-- Datos base de roles (no son "datos de demo", son parte del modelo de permisos)
INSERT OR IGNORE INTO roles (nombre, descripcion) VALUES
    ('ADMINISTRADOR', 'Acceso total al sistema'),
    ('GERENTE', 'Ventas, stock, compras, reportes, caja, promociones'),
    ('CAJERO', 'Ventas, cobros, consulta de productos, funciones autorizadas de caja');

INSERT OR IGNORE INTO permisos (clave, descripcion) VALUES
    ('ventas.crear', 'Registrar ventas'),
    ('ventas.anular', 'Anular una venta'),
    ('productos.crear', 'Crear productos'),
    ('productos.editar_precio', 'Modificar precios de productos'),
    ('productos.desactivar', 'Desactivar productos'),
    ('stock.ajustar', 'Ajustar stock manualmente'),
    ('caja.abrir', 'Abrir caja'),
    ('caja.cerrar', 'Realizar cierre Z'),
    ('caja.retiro', 'Registrar retiros de caja'),
    ('caja.ingreso', 'Registrar ingresos de caja'),
    ('cajon.abrir_manual', 'Abrir el cajón de dinero manualmente'),
    ('balanza.peso_manual', 'Ingresar peso manual quitando la balanza'),
    ('compras.crear', 'Registrar compras a proveedores'),
    ('reportes.ver', 'Ver reportes y estadísticas'),
    ('promociones.administrar', 'Crear y editar promociones'),
    ('configuracion.editar', 'Editar configuración del sistema'),
    ('usuarios.administrar', 'Crear y editar usuarios');
