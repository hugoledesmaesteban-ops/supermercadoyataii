//! Repositorio de usuarios (Fase 12, secciones 35-36).

use crate::database::DbError;
use argon2::password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct UsuarioSesion {
    pub id: i64,
    pub nombre_usuario: String,
    pub nombre_completo: String,
    pub rol: String,
}

#[derive(Debug, Serialize)]
pub struct UsuarioListado {
    pub id: i64,
    pub nombre_usuario: String,
    pub nombre_completo: String,
    pub rol: String,
    pub activo: bool,
    pub ultimo_login: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Rol {
    pub id: i64,
    pub nombre: String,
}

pub fn hashear_password(password: &str) -> Result<String, DbError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| DbError::Negocio(format!("no se pudo hashear la contraseña: {e}")))
}

fn verificar_password(password: &str, hash_guardado: &str) -> bool {
    match PasswordHash::new(hash_guardado) {
        Ok(hash) => Argon2::default()
            .verify_password(password.as_bytes(), &hash)
            .is_ok(),
        Err(_) => false,
    }
}

pub fn crear_usuario(
    conn: &Connection,
    nombre_usuario: &str,
    nombre_completo: &str,
    password: &str,
    rol_id: i64,
) -> Result<i64, DbError> {
    let hash = hashear_password(password)?;
    conn.execute(
        "INSERT INTO usuarios (nombre_usuario, nombre_completo, password_hash, rol_id)
         VALUES (?1, ?2, ?3, ?4)",
        params![nombre_usuario, nombre_completo, hash, rol_id],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn iniciar_sesion(
    conn: &Connection,
    nombre_usuario: &str,
    password: &str,
) -> Result<Option<UsuarioSesion>, DbError> {
    let fila: Option<(i64, String, String, String, String)> = conn
        .query_row(
            "SELECT u.id, u.nombre_usuario, u.nombre_completo, u.password_hash, r.nombre
             FROM usuarios u JOIN roles r ON r.id = u.rol_id
             WHERE u.nombre_usuario = ?1 AND u.activo = 1",
            params![nombre_usuario],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )
        .optional()?;

    let Some((id, nombre_usuario, nombre_completo, hash, rol)) = fila else {
        return Ok(None);
    };

    if !verificar_password(password, &hash) {
        return Ok(None);
    }

    conn.execute(
        "UPDATE usuarios SET ultimo_login = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?1",
        params![id],
    )?;

    Ok(Some(UsuarioSesion { id, nombre_usuario, nombre_completo, rol }))
}

pub fn usuario_tiene_permiso(
    conn: &Connection,
    usuario_id: i64,
    clave_permiso: &str,
) -> Result<bool, DbError> {
    let tiene: bool = conn.query_row(
        "SELECT EXISTS(
            SELECT 1 FROM usuarios u
            JOIN rol_permisos rp ON rp.rol_id = u.rol_id
            JOIN permisos p ON p.id = rp.permiso_id
            WHERE u.id = ?1 AND p.clave = ?2
        )",
        params![usuario_id, clave_permiso],
        |row| row.get(0),
    )?;
    Ok(tiene)
}

/// Lista todos los usuarios con su rol (para la pantalla de administración).
pub fn listar(conn: &Connection) -> Result<Vec<UsuarioListado>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT u.id, u.nombre_usuario, u.nombre_completo, r.nombre, u.activo, u.ultimo_login
         FROM usuarios u JOIN roles r ON r.id = u.rol_id
         ORDER BY u.nombre_completo",
    )?;
    let filas = stmt.query_map([], |row| {
        Ok(UsuarioListado {
            id: row.get(0)?,
            nombre_usuario: row.get(1)?,
            nombre_completo: row.get(2)?,
            rol: row.get(3)?,
            activo: row.get::<_, i64>(4)? != 0,
            ultimo_login: row.get(5)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

pub fn listar_roles(conn: &Connection) -> Result<Vec<Rol>, DbError> {
    let mut stmt = conn.prepare("SELECT id, nombre FROM roles ORDER BY id")?;
    let filas = stmt.query_map([], |row| {
        Ok(Rol { id: row.get(0)?, nombre: row.get(1)? })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

pub fn cambiar_password(conn: &Connection, usuario_id: i64, nueva: &str) -> Result<(), DbError> {
    let hash = hashear_password(nueva)?;
    conn.execute(
        "UPDATE usuarios SET password_hash = ?1 WHERE id = ?2",
        params![hash, usuario_id],
    )?;
    Ok(())
}

pub fn toggle_activo(conn: &Connection, usuario_id: i64, activo: bool) -> Result<(), DbError> {
    conn.execute(
        "UPDATE usuarios SET activo = ?1 WHERE id = ?2",
        params![if activo { 1 } else { 0 }, usuario_id],
    )?;
    Ok(())
}

/// ¿Este usuario es el de soporte (hlsistemas)? Sirve para bloquear
/// que otros administradores lo modifiquen o lo desactiven.
pub fn es_usuario_soporte(conn: &Connection, usuario_id: i64) -> Result<bool, DbError> {
    let es: bool = conn.query_row(
        "SELECT EXISTS(
            SELECT 1 FROM usuarios WHERE id = ?1 AND nombre_usuario = 'hlsistemas'
         )",
        params![usuario_id],
        |r| r.get(0),
    )?;
    Ok(es)
}
