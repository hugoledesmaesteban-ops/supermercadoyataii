use crate::database::repositories::auditoria::{self, EventoAuditoria};
use crate::database::DbPool;
use tauri::State;

#[tauri::command]
pub fn listar_auditoria(
    pool: State<DbPool>,
    usuario_id: Option<i64>,
    accion: Option<String>,
    desde: Option<String>,
    hasta: Option<String>,
    limite: i64,
) -> Result<Vec<EventoAuditoria>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    auditoria::listar(
        &conn,
        usuario_id,
        accion.as_deref(),
        desde.as_deref(),
        hasta.as_deref(),
        limite,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn listar_acciones_auditoria(pool: State<DbPool>) -> Result<Vec<String>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    auditoria::acciones_distintas(&conn).map_err(|e| e.to_string())
}