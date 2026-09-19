use crate::database::repositories::{auditoria, usuarios};
use crate::database::DbPool;
use tauri::State;

#[tauri::command]
pub fn crear_usuario(
    pool: State<DbPool>,
    nombre_usuario: String,
    nombre_completo: String,
    password: String,
    rol_id: i64,
) -> Result<i64, String> {
    let conn = pool.get().map_err(|_| "No se pudo completar la operación.".to_string())?;
    usuarios::crear_usuario(&conn, &nombre_usuario, &nombre_completo, &password, rol_id)
        .map_err(|_| "No se pudo crear el usuario. ¿El nombre de usuario ya existe?".to_string())
}

#[tauri::command]
pub fn iniciar_sesion(
    pool: State<DbPool>,
    nombre_usuario: String,
    password: String,
) -> Result<Option<usuarios::UsuarioSesion>, String> {
    let conn = pool.get().map_err(|_| "No se pudo completar la operación.".to_string())?;
    let sesion = usuarios::iniciar_sesion(&conn, &nombre_usuario, &password)
        .map_err(|_| "No se pudo completar la operación.".to_string())?;

    if let Some(s) = &sesion {
        // El usuario de soporte (hlsistemas) NO se registra en auditoría,
        // para que el dueño no vea cuándo entra el desarrollador.
        if s.nombre_usuario != "hlsistemas" {
            auditoria::registrar(&conn, Some(s.id), "LOGIN", Some("usuario"), Some(s.id), None).ok();
        }
    }

    Ok(sesion)
}

#[tauri::command]
pub fn usuario_tiene_permiso(
    pool: State<DbPool>,
    usuario_id: i64,
    clave_permiso: String,
) -> Result<bool, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    usuarios::usuario_tiene_permiso(&conn, usuario_id, &clave_permiso).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn verificar_autorizacion(
    pool: State<DbPool>,
    nombre_usuario: String,
    password: String,
    permiso: String,
) -> Result<bool, String> {
    let conn = pool.get().map_err(|_| "No se pudo completar la operación.".to_string())?;

    let sesion = usuarios::iniciar_sesion(&conn, &nombre_usuario, &password)
        .map_err(|_| "No se pudo verificar las credenciales.".to_string())?;

    let Some(s) = sesion else {
        return Ok(false);
    };

    let tiene = usuarios::usuario_tiene_permiso(&conn, s.id, &permiso)
        .map_err(|_| "No se pudo verificar el permiso.".to_string())?;

    if tiene {
        let detalle = format!(
            "{{\"permiso\":\"{}\",\"autorizado_por\":{}}}",
            permiso, s.id
        );
        auditoria::registrar(
            &conn,
            Some(s.id),
            "AUTORIZACION",
            Some("permiso"),
            None,
            Some(&detalle),
        )
        .ok();
    }

    Ok(tiene)
}

#[tauri::command]
pub fn listar_usuarios(pool: State<DbPool>) -> Result<Vec<usuarios::UsuarioListado>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    usuarios::listar(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn listar_roles(pool: State<DbPool>) -> Result<Vec<usuarios::Rol>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    usuarios::listar_roles(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cambiar_password_usuario(
    pool: State<DbPool>,
    usuario_id: i64,
    nueva_password: String,
    admin_id: i64,
) -> Result<(), String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    let target_es_soporte = usuarios::es_usuario_soporte(&conn, usuario_id).map_err(|e| e.to_string())?;
    let admin_es_soporte = usuarios::es_usuario_soporte(&conn, admin_id).map_err(|e| e.to_string())?;
    if target_es_soporte && !admin_es_soporte {
        return Err("No se puede modificar el usuario de soporte.".to_string());
    }
    usuarios::cambiar_password(&conn, usuario_id, &nueva_password).map_err(|e| e.to_string())?;
    auditoria::registrar(
        &conn,
        Some(admin_id),
        "CAMBIO_PASSWORD",
        Some("usuario"),
        Some(usuario_id),
        None,
    )
    .ok();
    Ok(())
}

#[tauri::command]
pub fn toggle_activo_usuario(
    pool: State<DbPool>,
    usuario_id: i64,
    activo: bool,
    admin_id: i64,
) -> Result<(), String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    let target_es_soporte = usuarios::es_usuario_soporte(&conn, usuario_id).map_err(|e| e.to_string())?;
    let admin_es_soporte = usuarios::es_usuario_soporte(&conn, admin_id).map_err(|e| e.to_string())?;
    if target_es_soporte && !admin_es_soporte {
        return Err("No se puede desactivar el usuario de soporte.".to_string());
    }
    usuarios::toggle_activo(&conn, usuario_id, activo).map_err(|e| e.to_string())?;
    auditoria::registrar(
        &conn,
        Some(admin_id),
        if activo { "USUARIO_ACTIVADO" } else { "USUARIO_DESACTIVADO" },
        Some("usuario"),
        Some(usuario_id),
        None,
    )
    .ok();
    Ok(())
}

#[tauri::command]
pub fn contar_usuarios(pool: State<DbPool>) -> Result<i64, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    let n: i64 = conn
        .query_row("SELECT COUNT(*) FROM usuarios", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    Ok(n)
}

/// SOLO para el primer inicio de la app: crea el administrador inicial.
/// Falla si YA existe cualquier usuario en el sistema.
#[tauri::command]
pub fn inicializar_sistema(
    pool: State<DbPool>,
    nombre_usuario: String,
    nombre_completo: String,
    password: String,
) -> Result<i64, String> {
    let conn = pool.get().map_err(|_| "No se pudo completar la operación.".to_string())?;

    let existentes: i64 = conn
        .query_row("SELECT COUNT(*) FROM usuarios", [], |r| r.get(0))
        .map_err(|_| "No se pudo verificar el sistema.".to_string())?;

    if existentes > 0 {
        return Err("El sistema ya está inicializado. No se puede crear otro administrador inicial.".to_string());
    }

    // Buscar el id del rol GERENTE (Dueño del comercio).
    // El rol ADMINISTRADOR queda reservado exclusivamente para hlsistemas.
    let rol_gerente_id: i64 = conn
        .query_row("SELECT id FROM roles WHERE nombre = 'GERENTE'", [], |r| r.get(0))
        .map_err(|_| "No se encontró el rol GERENTE en la base de datos.".to_string())?;

    usuarios::crear_usuario(&conn, &nombre_usuario, &nombre_completo, &password, rol_gerente_id)
        .map_err(|e| format!("No se pudo crear el dueño: {e}"))
}
