use crate::database::DbPool;
use crate::licencia::{self, config::ConfigCliente, EstadoLicencia};
use tauri::State;

// Sección 39/58: la anon key de Supabase es pública por diseño y puede
// compilarse en el binario; la service role key NUNCA debe estar acá.
// Se definen vía variables de entorno en tiempo de compilación
// (ej. en CI, o en un .cargo/config.toml local) en vez de quedar
// hardcodeadas en el código fuente. Si no están definidas, se usa un
// placeholder explícito para que el error sea obvio en desarrollo.
const SUPABASE_URL: &str = match option_env!("SUPABASE_URL") {
    Some(v) => v,
    None => "https://CONFIGURAR-SUPABASE-URL.supabase.co",
};
const SUPABASE_ANON_KEY: &str = match option_env!("SUPABASE_ANON_KEY") {
    Some(v) => v,
    None => "CONFIGURAR-SUPABASE-ANON-KEY",
};

/// Sección 40: al iniciar, intenta verificar online; si lo logra, guarda el
/// resultado como la nueva verdad local. Si no hay Internet (o Supabase no
/// responde), simplemente no actualiza nada y cae al estado ya guardado.
/// En cualquier caso, el estado final sale de `evaluar_estado_local`, que
/// es quien aplica la ventana de gracia de 7 días (sección 42).
#[tauri::command]
pub fn verificar_estado_licencia(
    app: tauri::AppHandle,
    pool: State<DbPool>,
) -> Result<EstadoLicencia, String> {
    let dir_datos = app
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "No se pudo resolver el directorio de datos.".to_string())?;

    let config: ConfigCliente = licencia::config::cargar_config(&dir_datos).ok_or_else(|| {
        "No se encontró config.json. Complete la configuración inicial.".to_string()
    })?;

    let conn = pool
        .get()
        .map_err(|_| "No se pudo completar la operación.".to_string())?;

    if let Ok(remota) = licencia::verificar_online(SUPABASE_URL, SUPABASE_ANON_KEY, &config.cliente_id) {
        licencia::guardar_verificacion(&conn, &remota).ok();
    }
    // Si `verificar_online` falló (sin Internet, DNS, timeout, etc.) no se
    // hace nada acá: es exactamente el caso que la sección 42 pide tolerar.

    licencia::evaluar_estado_local(&conn)
        .map_err(|_| "No se pudo evaluar el estado de la licencia.".to_string())
}

use crate::licencia::EstadoLicenciaSimple;

#[tauri::command]
pub fn estado_licencia_simple(pool: State<DbPool>) -> Result<EstadoLicenciaSimple, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    licencia::estado_licencia_simple(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn activar_licencia_30_dias(
    pool: State<DbPool>,
    usuario_nombre: String,
) -> Result<String, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    licencia::activar_licencia_30_dias(&conn, &usuario_nombre).map_err(|e| e.to_string())
}
