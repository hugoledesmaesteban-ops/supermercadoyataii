use crate::database::repositories::ventas::{self, ItemVentaInput, PagoInput, VentaConfirmada, VentaParaAnular};
use crate::database::DbPool;
use tauri::State;

#[tauri::command]
pub fn confirmar_venta(
    pool: State<DbPool>,
    caja_id: i64,
    usuario_id: i64,
    cliente_id: Option<i64>,
    items: Vec<ItemVentaInput>,
    pagos: Vec<PagoInput>,
) -> Result<VentaConfirmada, String> {
    let mut conn = pool.get().map_err(|_| "No se pudo completar la operacion.".to_string())?;
    ventas::confirmar_venta(&mut conn, caja_id, usuario_id, cliente_id, &items, &pagos)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn listar_ventas_para_anular(
    pool: State<DbPool>,
    desde: Option<String>,
    hasta: Option<String>,
    limite: Option<i64>,
) -> Result<Vec<VentaParaAnular>, String> {
    let conn = pool.get().map_err(|_| "No se pudo conectar.".to_string())?;
    ventas::listar_ventas_para_anular(
        &conn,
        desde.as_deref(),
        hasta.as_deref(),
        limite.unwrap_or(200),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn anular_venta(
    pool: State<DbPool>,
    venta_id: i64,
    usuario_id: i64,
    password: String,
) -> Result<(), String> {
    let mut conn = pool.get().map_err(|_| "No se pudo conectar.".to_string())?;
    ventas::anular_venta(&mut conn, venta_id, usuario_id, &password)
        .map_err(|e| e.to_string())
}
