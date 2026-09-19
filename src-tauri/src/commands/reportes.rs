use crate::database::repositories::reportes::{self, ProductoMasVendido, ResumenDashboard, TotalPorMetodoPago, VentasPorDia};
use crate::database::DbPool;
use tauri::State;

#[tauri::command]
pub fn obtener_resumen_dashboard(pool: State<DbPool>) -> Result<ResumenDashboard, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    reportes::resumen_dashboard(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn obtener_productos_mas_vendidos(
    pool: State<DbPool>,
    dias: i64,
) -> Result<Vec<ProductoMasVendido>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    reportes::productos_mas_vendidos(&conn, dias, 20).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn obtener_totales_por_metodo_pago(
    pool: State<DbPool>,
    dias: i64,
) -> Result<Vec<TotalPorMetodoPago>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    reportes::totales_por_metodo_pago(&conn, dias).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn obtener_ventas_por_dia(pool: State<DbPool>, dias: i64) -> Result<Vec<VentasPorDia>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    reportes::ventas_por_dia(&conn, dias).map_err(|e| e.to_string())
}

use crate::database::repositories::reportes::{GananciaPeriodo, GananciaPorProducto};

#[tauri::command]
pub fn obtener_ganancia_periodo(
    pool: State<DbPool>,
    desde: String,
    hasta: String,
) -> Result<GananciaPeriodo, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    reportes::ganancia_periodo(&conn, &desde, &hasta).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn obtener_ganancia_por_producto(
    pool: State<DbPool>,
    desde: String,
    hasta: String,
    limite: i64,
) -> Result<Vec<GananciaPorProducto>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    reportes::ganancia_por_producto(&conn, &desde, &hasta, limite).map_err(|e| e.to_string())
}
