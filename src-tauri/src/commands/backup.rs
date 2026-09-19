use crate::database::repositories::auditoria;
use crate::database::DbPool;
use tauri::State;

#[tauri::command]
pub fn crear_backup(app: tauri::AppHandle, pool: State<DbPool>, usuario_id: i64) -> Result<String, String> {
    let dir_datos = app
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "No se pudo resolver el directorio de datos.".to_string())?;
    let conn = pool.get().map_err(|e| e.to_string())?;

    let destino = crate::backup::crear_backup(&conn, &dir_datos, Some(usuario_id), "MANUAL")
        .map_err(|e| e.to_string())?;

    auditoria::registrar(&conn, Some(usuario_id), "BACKUP_CREADO", None, None, None).ok();
    Ok(destino.to_string_lossy().to_string())
}

#[tauri::command]
pub fn listar_backups(pool: State<DbPool>) -> Result<Vec<String>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    crate::backup::listar_backups(&conn).map_err(|e| e.to_string())
}
