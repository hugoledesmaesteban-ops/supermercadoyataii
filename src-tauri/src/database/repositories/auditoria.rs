//! Repositorio de auditoría (sección 37). Cualquier acción sensible del
//! sistema (cambio de precio, apertura manual de cajón, cierre de caja,
//! anulación de venta, etc.) llama a `registrar` para dejar rastro.

use crate::database::DbError;
use rusqlite::{params, params_from_iter, Connection, ToSql};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct EventoAuditoria {
    pub id: i64,
    pub fecha: String,
    pub usuario_id: Option<i64>,
    pub usuario_nombre: Option<String>,
    pub accion: String,
    pub entidad: Option<String>,
    pub entidad_id: Option<i64>,
    pub detalle: Option<String>,
}

pub fn registrar(
    conn: &Connection,
    usuario_id: Option<i64>,
    accion: &str,
    entidad: Option<&str>,
    entidad_id: Option<i64>,
    detalle_json: Option<&str>,
) -> Result<(), DbError> {
    conn.execute(
        "INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![usuario_id, accion, entidad, entidad_id, detalle_json],
    )?;
    Ok(())
}

/// Lista eventos con filtros opcionales (sección 37).
/// Todos los filtros son opcionales: si no se pasan, devuelve los últimos
/// `limite` eventos ordenados por fecha descendente.
pub fn listar(
    conn: &Connection,
    usuario_id: Option<i64>,
    accion: Option<&str>,
    desde: Option<&str>,
    hasta: Option<&str>,
    limite: i64,
) -> Result<Vec<EventoAuditoria>, DbError> {
    let mut sql = String::from(
        "SELECT a.id, a.fecha, a.usuario_id, u.nombre_completo,
                a.accion, a.entidad, a.entidad_id, a.detalle
         FROM auditoria a
         LEFT JOIN usuarios u ON u.id = a.usuario_id
         WHERE 1=1",
    );

    let mut params_vec: Vec<Box<dyn ToSql>> = Vec::new();

    if let Some(uid) = usuario_id {
        sql.push_str(" AND a.usuario_id = ?");
        params_vec.push(Box::new(uid));
    }
    if let Some(a) = accion {
        sql.push_str(" AND a.accion = ?");
        params_vec.push(Box::new(a.to_string()));
    }
    if let Some(d) = desde {
        sql.push_str(" AND date(a.fecha) >= date(?)");
        params_vec.push(Box::new(d.to_string()));
    }
    if let Some(h) = hasta {
        sql.push_str(" AND date(a.fecha) <= date(?)");
        params_vec.push(Box::new(h.to_string()));
    }

    sql.push_str(" ORDER BY a.fecha DESC LIMIT ?");
    params_vec.push(Box::new(limite));

    let mut stmt = conn.prepare(&sql)?;
    let filas = stmt.query_map(params_from_iter(params_vec.iter()), |row| {
        Ok(EventoAuditoria {
            id: row.get(0)?,
            fecha: row.get(1)?,
            usuario_id: row.get(2)?,
            usuario_nombre: row.get(3)?,
            accion: row.get(4)?,
            entidad: row.get(5)?,
            entidad_id: row.get(6)?,
            detalle: row.get(7)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

/// Lista las acciones distintas registradas (para el dropdown de filtro).
pub fn acciones_distintas(conn: &Connection) -> Result<Vec<String>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT accion FROM auditoria ORDER BY accion ASC",
    )?;
    let filas = stmt.query_map([], |row| row.get::<_, String>(0))?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}