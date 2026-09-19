use crate::database::repositories::productos::Producto;
use crate::database::DbPool;
use crate::excel::{self, ResultadoImportacion};
use tauri::State;

/// Paso 1 (sección 24): sube el archivo y devuelve qué se puede importar y
/// qué no, SIN escribir nada en la base todavía.
#[tauri::command]
pub fn validar_importacion_excel(
    ruta_archivo: String,
) -> Result<(Vec<Producto>, ResultadoImportacion), String> {
    excel::validar_excel(std::path::Path::new(&ruta_archivo)).map_err(|e| e.to_string())
}

/// Paso 2: el usuario ya vio el resumen y confirma. Acá sí se escribe.
#[tauri::command]
pub fn confirmar_importacion_excel(
    pool: State<DbPool>,
    productos: Vec<Producto>,
) -> Result<usize, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    excel::confirmar_importacion(&conn, &productos).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn exportar_productos_excel(pool: State<DbPool>, ruta_destino: String) -> Result<(), String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    excel::exportar_productos(&conn, std::path::Path::new(&ruta_destino)).map_err(|e| e.to_string())
}
