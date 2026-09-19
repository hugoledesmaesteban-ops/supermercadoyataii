//! Patrón repository: cada tabla (o grupo de tablas relacionadas) tiene su
//! propio repositorio con SQL parametrizado. Los comandos de Tauri (capa de
//! `commands/`) llaman a estos repositorios; nunca escriben SQL directamente.
//! Esto es lo que permite, por ejemplo, cambiar de impresora o agregar un
//! nuevo reporte sin tocar el resto del sistema (sección 60 del prompt).

pub mod auditoria;
pub mod caja;
pub mod compras;
pub mod configuracion;
pub mod devoluciones;
pub mod productos;
pub mod promociones;
pub mod proveedores;
pub mod reportes;
pub mod stock;
pub mod usuarios;
pub mod ventas;
pub mod ventas_suspendidas;