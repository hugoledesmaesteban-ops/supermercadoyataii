//! Configuración del sistema como clave/valor (secciones 51-52).
//! Los valores estructurados (ej. datos del comercio, parámetros de
//! hardware) se guardan serializados en JSON.

use crate::database::DbError;
use rusqlite::{params, Connection, OptionalExtension};

pub fn obtener(conn: &Connection, clave: &str) -> Result<Option<String>, DbError> {
    conn.query_row(
        "SELECT valor FROM configuracion WHERE clave = ?1",
        params![clave],
        |row| row.get(0),
    )
    .optional()
    .map_err(DbError::from)
}

pub fn guardar(conn: &Connection, clave: &str, valor: &str) -> Result<(), DbError> {
    conn.execute(
        "INSERT INTO configuracion (clave, valor) VALUES (?1, ?2)
         ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')",
        params![clave, valor],
    )?;
    Ok(())
}
