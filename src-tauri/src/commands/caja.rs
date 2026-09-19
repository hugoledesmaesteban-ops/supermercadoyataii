use crate::database::repositories::{auditoria, caja};
use crate::database::DbPool;
use tauri::State;

#[tauri::command]
pub fn obtener_caja_abierta(pool: State<DbPool>) -> Result<Option<caja::Caja>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    caja::caja_abierta(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn abrir_caja(pool: State<DbPool>, usuario_id: i64, monto_apertura: f64) -> Result<i64, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    let caja_id = caja::abrir_caja(&conn, usuario_id, monto_apertura).map_err(|e| e.to_string())?;
    auditoria::registrar(&conn, Some(usuario_id), "APERTURA_CAJA", Some("caja"), Some(caja_id), None)
        .ok();
    Ok(caja_id)
}

#[tauri::command]
pub fn registrar_movimiento_caja(
    pool: State<DbPool>,
    caja_id: i64,
    tipo: String,
    monto: f64,
    motivo: String,
    usuario_id: i64,
) -> Result<(), String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    caja::registrar_movimiento_manual(&conn, caja_id, &tipo, monto, &motivo, usuario_id)
        .map_err(|e| e.to_string())?;

    let accion = match tipo.as_str() {
        "RETIRO" => "RETIRO_CAJA",
        "INGRESO" => "INGRESO_CAJA",
        "GASTO" => "GASTO_CAJA",
        _ => "MOVIMIENTO_CAJA",
    };
    auditoria::registrar(
        &conn,
        Some(usuario_id),
        accion,
        Some("caja"),
        Some(caja_id),
        Some(&format!("{{\"monto\":{monto},\"motivo\":\"{motivo}\"}}")),
    )
    .ok();
    Ok(())
}

#[tauri::command]
pub fn calcular_resumen_cierre(pool: State<DbPool>, caja_id: i64) -> Result<caja::ResumenCierre, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    caja::calcular_resumen_cierre(&conn, caja_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cerrar_caja(
    pool: State<DbPool>,
    caja_id: i64,
    usuario_id: i64,
    efectivo_declarado: f64,
) -> Result<f64, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    let diferencia = caja::cerrar_caja(&conn, caja_id, usuario_id, efectivo_declarado, None)
        .map_err(|e| e.to_string())?;
    auditoria::registrar(
        &conn,
        Some(usuario_id),
        "CIERRE_CAJA",
        Some("caja"),
        Some(caja_id),
        Some(&format!("{{\"diferencia\":{diferencia}}}")),
    )
    .ok();
    Ok(diferencia)
}

#[tauri::command]
pub fn listar_movimientos_caja(
    pool: State<DbPool>,
    caja_id: i64,
    incluir_ventas: bool,
) -> Result<Vec<caja::MovimientoCaja>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    caja::listar_movimientos(&conn, caja_id, incluir_ventas).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn listar_cierres_anteriores(
    pool: State<DbPool>,
    limite: i64,
) -> Result<Vec<caja::CierreAnterior>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    caja::listar_cierres_anteriores(&conn, limite).map_err(|e| e.to_string())
}