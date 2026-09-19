//! `config.json` — sección 38 del prompt.
//!
//! Guarda únicamente el `cliente_id` de esta instalación y la versión
//! instalada. Deliberadamente NO guarda ningún secreto de Supabase: la
//! `anon key` de Supabase va compilada en el binario (es pública por
//! diseño, ver sección 58), y la `SUPABASE_SERVICE_ROLE_KEY` nunca debe
//! existir en el cliente.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConfigCliente {
    pub cliente_id: String,
    pub version: String,
}

pub fn ruta_config(dir_datos_app: &Path) -> PathBuf {
    dir_datos_app.join("config.json")
}

/// Carga `config.json`. Si no existe (primer inicio, sección 65), NO se
/// genera un `cliente_id` automático acá: eso lo decide la pantalla de
/// configuración inicial, porque el `cliente_id` debe corresponder a un
/// registro que el soporte técnico ya creó en la tabla `licencias` de
/// Supabase (sección 39). Sin eso, cualquier `cliente_id` autogenerado
/// simplemente no tendría licencia asociada.
pub fn cargar_config(dir_datos_app: &Path) -> Option<ConfigCliente> {
    let ruta = ruta_config(dir_datos_app);
    let contenido = std::fs::read_to_string(ruta).ok()?;
    serde_json::from_str(&contenido).ok()
}

pub fn guardar_config(dir_datos_app: &Path, config: &ConfigCliente) -> std::io::Result<()> {
    std::fs::create_dir_all(dir_datos_app)?;
    let contenido = serde_json::to_string_pretty(config)?;
    std::fs::write(ruta_config(dir_datos_app), contenido)
}
