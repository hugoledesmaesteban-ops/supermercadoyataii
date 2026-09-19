use crate::database::repositories::ventas_suspendidas::{self, VentaSuspendida};
use crate::database::DbPool;
use tauri::State;

#[tauri::command]
pub fn suspender_venta(
    pool: State<DbPool>,
    caja_id: i64,
    usuario_id: i64,
    carrito_json: String,
) -> Result<String, String> {
    let conn = pool
        .get()
        .map_err(|_| "No se pudo completar la operación.".to_string())?;
    ventas_suspendidas::suspender(&conn, caja_id, usuario_id, &carrito_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn listar_ventas_suspendidas(
    pool: State<DbPool>,
    caja_id: i64,
) -> Result<Vec<VentaSuspendida>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    ventas_suspendidas::listar_por_caja(&conn, caja_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn recuperar_venta_suspendida(pool: State<DbPool>, id: i64) -> Result<String, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    ventas_suspendidas::recuperar(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn eliminar_venta_suspendida(pool: State<DbPool>, id: i64) -> Result<(), String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    ventas_suspendidas::eliminar(&conn, id).map_err(|e| e.to_string())
}