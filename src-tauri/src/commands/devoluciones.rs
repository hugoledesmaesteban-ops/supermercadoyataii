use crate::database::repositories::devoluciones::{self, DevolucionRegistrada, ItemDevolucionInput};
use crate::database::repositories::ventas::{self, VentaParaDevolucion};
use crate::database::DbPool;
use tauri::State;

#[tauri::command]
pub fn buscar_venta_para_devolucion(
    pool: State<DbPool>,
    numero: String,
) -> Result<Option<VentaParaDevolucion>, String> {
    let conn = pool.get().map_err(|_| "No se pudo completar la operación.".to_string())?;
    ventas::buscar_venta_para_devolucion(&conn, numero.trim())
        .map_err(|_| "No se pudo buscar la venta.".to_string())
}

#[tauri::command]
pub fn registrar_devolucion(
    pool: State<DbPool>,
    venta_id: i64,
    usuario_id: i64,
    motivo: String,
    items: Vec<ItemDevolucionInput>,
) -> Result<DevolucionRegistrada, String> {
    let mut conn = pool.get().map_err(|_| "No se pudo completar la operación.".to_string())?;
    devoluciones::registrar(&mut conn, venta_id, usuario_id, &motivo, &items)
        .map_err(|e| e.to_string())
}