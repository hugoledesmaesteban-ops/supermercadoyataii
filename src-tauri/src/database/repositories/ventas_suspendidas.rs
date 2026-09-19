//! Ventas suspendidas (secciones 21-22 del pedido de rediseño).
//! El carrito se guarda tal cual como JSON — no hace falta modelarlo en
//! tablas relacionales porque nunca se consulta, solo se recupera entero.

use crate::database::DbError;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VentaSuspendida {
    pub id: i64,
    pub numero: String,
    pub usuario_id: i64,
    pub fecha: String,
}

/// Guarda el carrito como JSON y devuelve el número asignado (`SUSP-000123`).
///
/// El próximo número se calcula desde `sqlite_sequence` (columna AUTOINCREMENT),
/// no desde `COUNT(*)`. Esto es importante: si se recupera o elimina una venta
/// suspendida, un `COUNT(*) + 1` volvería a generar un número ya usado y
/// violaría el `UNIQUE`. `sqlite_sequence` nunca retrocede.
pub fn suspender(
    conn: &Connection,
    caja_id: i64,
    usuario_id: i64,
    carrito_json: &str,
) -> Result<String, DbError> {
    let proximo_id: i64 = conn
        .query_row(
            "SELECT COALESCE((SELECT seq FROM sqlite_sequence WHERE name = 'ventas_suspendidas'), 0) + 1",
            [],
            |r| r.get(0),
        )
        .unwrap_or(1);
    let numero = format!("SUSP-{:06}", proximo_id);

    conn.execute(
        "INSERT INTO ventas_suspendidas (numero, caja_id, usuario_id, carrito_json) VALUES (?1, ?2, ?3, ?4)",
        params![numero, caja_id, usuario_id, carrito_json],
    )?;
    Ok(numero)
}

pub fn listar_por_caja(
    conn: &Connection,
    caja_id: i64,
) -> Result<Vec<VentaSuspendida>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, numero, usuario_id, fecha FROM ventas_suspendidas WHERE caja_id = ?1 ORDER BY fecha DESC",
    )?;
    let filas = stmt.query_map(params![caja_id], |row| {
        Ok(VentaSuspendida {
            id: row.get(0)?,
            numero: row.get(1)?,
            usuario_id: row.get(2)?,
            fecha: row.get(3)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

/// Recupera y BORRA la venta suspendida (no puede recuperarse dos veces).
pub fn recuperar(conn: &Connection, id: i64) -> Result<String, DbError> {
    let carrito_json: String = conn.query_row(
        "SELECT carrito_json FROM ventas_suspendidas WHERE id = ?1",
        params![id],
        |r| r.get(0),
    )?;
    conn.execute("DELETE FROM ventas_suspendidas WHERE id = ?1", params![id])?;
    Ok(carrito_json)
}

pub fn eliminar(conn: &Connection, id: i64) -> Result<(), DbError> {
    conn.execute("DELETE FROM ventas_suspendidas WHERE id = ?1", params![id])?;
    Ok(())
}