-- Migración 0011: rol_permisos — a qué tiene acceso cada rol (sección 35).
-- Separada de la 0001 porque roles y permisos ya existían; esto es la
-- relación entre ambos, que es donde vive la regla de negocio real.

-- ADMINISTRADOR: todo.
INSERT OR IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT (SELECT id FROM roles WHERE nombre = 'ADMINISTRADOR'), id FROM permisos;

-- GERENTE: ventas, stock, compras, reportes, caja, promociones (sección 35).
INSERT OR IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT (SELECT id FROM roles WHERE nombre = 'GERENTE'), id FROM permisos
WHERE clave IN (
    'ventas.crear', 'ventas.anular',
    'productos.crear', 'productos.editar_precio', 'productos.desactivar',
    'stock.ajustar',
    'caja.abrir', 'caja.cerrar', 'caja.retiro', 'caja.ingreso',
    'compras.crear',
    'reportes.ver',
    'promociones.administrar'
);

-- CAJERO: ventas, cobros, consulta de productos, funciones autorizadas de
-- caja (sección 35). Explícitamente NO incluye editar precios ni anular
-- ventas ("No permitir que un cajero modifique precios o elimine ventas
-- salvo autorización").
INSERT OR IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT (SELECT id FROM roles WHERE nombre = 'CAJERO'), id FROM permisos
WHERE clave IN (
    'ventas.crear',
    'caja.abrir'
);
