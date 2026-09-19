use crate::database::repositories::auditoria;
use crate::database::repositories::stock::{
    self, ContadorAlertas, ProductoVencimiento, StockBajo, TipoMovimiento,
};
use crate::database::DbPool;
use tauri::State;

/// Sección 20: alimenta el listado de "Stock bajo / Sin stock" del panel de productos.
#[tauri::command]
pub fn listar_stock_bajo(pool: State<DbPool>) -> Result<Vec<StockBajo>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    stock::listar_stock_bajo(&conn).map_err(|e| e.to_string())
}

/// Ajuste manual de stock (ej. rotura, vencimiento, conteo físico). Requiere
/// permiso `stock.ajustar`; se registra en auditoría con el motivo dado.
#[tauri::command]
pub fn ajustar_stock_manual(
    pool: State<DbPool>,
    producto_id: i64,
    cantidad_delta: f64,
    tipo: String,
    motivo: String,
    usuario_id: i64,
) -> Result<f64, String> {
    let tipo_enum = match tipo.as_str() {
        "AJUSTE" => TipoMovimiento::Ajuste,
        "PERDIDA" => TipoMovimiento::Perdida,
        "ROTURA" => TipoMovimiento::Rotura,
        "VENCIMIENTO" => TipoMovimiento::Vencimiento,
        "ENTRADA" => TipoMovimiento::Entrada,
        _ => return Err("Tipo de movimiento de stock inválido.".to_string()),
    };

    let conn = pool.get().map_err(|e| e.to_string())?;
    let stock_resultante = stock::ajustar_stock(
        &conn,
        producto_id,
        cantidad_delta,
        tipo_enum,
        Some(&motivo),
        Some("ajuste_manual"),
        None,
        usuario_id,
    )
    .map_err(|e| e.to_string())?;

    auditoria::registrar(
        &conn,
        Some(usuario_id),
        "AJUSTE_STOCK",
        Some("producto"),
        Some(producto_id),
        Some(&format!(
            "{{\"delta\":{cantidad_delta},\"tipo\":\"{tipo}\",\"motivo\":\"{motivo}\"}}"
        )),
    )
    .ok();

    Ok(stock_resultante)
}

#[tauri::command]
pub fn listar_productos_vencidos(pool: State<DbPool>) -> Result<Vec<ProductoVencimiento>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    stock::listar_productos_vencidos(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn listar_productos_proximos_vencer(
    pool: State<DbPool>,
    dias: i64,
) -> Result<Vec<ProductoVencimiento>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    stock::listar_productos_proximos_vencer(&conn, dias).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn contar_alertas_stock(
    pool: State<DbPool>,
    dias_proximos: i64,
) -> Result<ContadorAlertas, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    stock::contar_alertas(&conn, dias_proximos).map_err(|e| e.to_string())
}