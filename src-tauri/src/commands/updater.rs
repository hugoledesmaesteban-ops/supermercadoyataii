use crate::updater::{self, InfoActualizacion};
use std::path::PathBuf;
use tauri::AppHandle;

#[tauri::command]
pub fn verificar_actualizacion(
    url_version_txt: String,
    version_actual: String,
) -> Result<InfoActualizacion, String> {
    updater::verificar_actualizacion_disponible(&url_version_txt, &version_actual)
        .map_err(|_| "No se pudo verificar si hay una actualización disponible.".to_string())
}

/// Descarga, verifica integridad y — solo si el hash coincide — dispara el
/// updater externo y cierra el POS (sección 46-47).
#[tauri::command]
pub fn descargar_e_instalar_actualizacion(
    app: AppHandle,
    url_instalador: String,
    sha256_esperado: String,
) -> Result<(), String> {
    let dir_temp = std::env::temp_dir();
    let destino: PathBuf = dir_temp.join("MiniMercadoGoya_instalador.exe");

    updater::descargar_actualizacion(&url_instalador, &destino)
        .map_err(|_| "No se pudo descargar la actualización.".to_string())?;

    updater::verificar_integridad(&destino, &sha256_esperado)
        .map_err(|_| "El archivo descargado no pasó la verificación de integridad. Se canceló la actualización.".to_string())?;

    let ruta_script = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.join("scripts").join("actualizador.ps1")))
        .unwrap_or_else(|| PathBuf::from("scripts/actualizador.ps1"));
    let ruta_exe_pos = std::env::current_exe()
        .map_err(|_| "No se pudo determinar la ruta del ejecutable actual.".to_string())?;

    updater::lanzar_actualizador_y_salir(&ruta_script, &destino, &ruta_exe_pos)
        .map_err(|_| "No se pudo lanzar el proceso de actualización.".to_string())?;

    // No se llega hasta acá: `lanzar_actualizador_y_salir` termina el proceso.
    let _ = app;
    Ok(())
}
