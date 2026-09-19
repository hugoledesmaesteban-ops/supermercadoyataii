//! Repositorio de proveedores (Fase 26, sección 26).

use crate::database::DbError;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Proveedor {
    pub id: Option<i64>,
    pub nombre: String,
    pub cuit: Option<String>,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub direccion: Option<String>,
    pub contacto: Option<String>,
    pub observaciones: Option<String>,
    pub activo: bool,
}

#[derive(Debug, Serialize)]
pub struct HistorialCompraProveedor {
    pub compra_id: i64,
    pub fecha: String,
    pub numero_comprobante: Option<String>,
    pub total: f64,
}

pub fn listar(conn: &Connection) -> Result<Vec<Proveedor>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, nombre, cuit, telefono, email, direccion, contacto, observaciones, activo
         FROM proveedores WHERE activo = 1 ORDER BY nombre",
    )?;
    let filas = stmt.query_map([], mapear_fila)?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

pub fn crear(conn: &Connection, p: &Proveedor) -> Result<i64, DbError> {
    conn.execute(
        "INSERT INTO proveedores (nombre, cuit, telefono, email, direccion, contacto, observaciones, activo)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![p.nombre, p.cuit, p.telefono, p.email, p.direccion, p.contacto, p.observaciones, p.activo],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Sección 26: "Historial de compras" por proveedor.
pub fn historial_compras(conn: &Connection, proveedor_id: i64) -> Result<Vec<HistorialCompraProveedor>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, fecha, numero_comprobante, total FROM compras
         WHERE proveedor_id = ?1 ORDER BY fecha DESC",
    )?;
    let filas = stmt.query_map(params![proveedor_id], |row| {
        Ok(HistorialCompraProveedor {
            compra_id: row.get(0)?,
            fecha: row.get(1)?,
            numero_comprobante: row.get(2)?,
            total: row.get(3)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

fn mapear_fila(row: &rusqlite::Row) -> rusqlite::Result<Proveedor> {
    Ok(Proveedor {
        id: row.get(0)?,
        nombre: row.get(1)?,
        cuit: row.get(2)?,
        telefono: row.get(3)?,
        email: row.get(4)?,
        direccion: row.get(5)?,
        contacto: row.get(6)?,
        observaciones: row.get(7)?,
        activo: row.get::<_, i64>(8)? != 0,
    })
}
