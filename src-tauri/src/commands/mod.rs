//! Capa de comandos Tauri: el único puente entre el frontend (React) y la
//! lógica de negocio en Rust. Un comando NUNCA contiene SQL directamente:
//! delega en `database::repositories::*`.

pub mod backup;
pub mod auditoria;
pub mod caja;
pub mod compras;
pub mod configuracion;
pub mod devoluciones;
pub mod excel;
pub mod licencia;
pub mod productos;
pub mod promociones;
pub mod reportes;
pub mod stock;
pub mod updater;
pub mod usuarios;
pub mod ventas;
pub mod ventas_suspendidas;
pub mod mercadopago;