//! Repositorio de devoluciones (sección 23).
//!
//! Registrar una devolución: crear devolucion + detalle_devolucion,
//! reingresar stock, registrar movimiento de caja (salida de dinero) y
//! auditoría. Todo dentro de UNA transacción.

use crate::database::repositories::stock::{ajustar_stock, TipoMovimiento};
use crate::database::DbError;
use rusqlite::{params, Connection};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ItemDevolucionInput {
    pub detalle_venta_id: i64,
    pub producto_id: i64,
    pub cantidad: f64,
    pub subtotal: f64,
}

#[derive(Debug, serde::Serialize)]
pub struct DevolucionRegistrada {
    pub devolucion_id: i64,
    pub numero: String,
    pub total: f64,
}

pub fn registrar(
    conn: &mut Connection,
    venta_id: i64,
    usuario_id: i64,
    motivo: &str,
    items: &[ItemDevolucionInput],
) -> Result<DevolucionRegistrada, DbError> {
    if items.is_empty() {
        return Err(DbError::Negocio("La devolución no tiene ítems.".into()));
    }
    if motivo.trim().is_empty() {
        return Err(DbError::Negocio("Falta el motivo de la devolución.".into()));
    }

    for item in items {
        if item.cantidad <= 0.0 {
            return Err(DbError::Negocio("Cantidad inválida en la devolución.".into()));
        }

        let cant_original: f64 = conn.query_row(
            "SELECT cantidad FROM detalle_venta WHERE id = ?1 AND venta_id = ?2",
            params![item.detalle_venta_id, venta_id],
            |r| r.get(0),
        )?;

        let ya_devuelta: f64 = conn.query_row(
            "SELECT COALESCE(SUM(cantidad), 0) FROM detalle_devolucion WHERE detalle_venta_id = ?1",
            params![item.detalle_venta_id],
            |r| r.get(0),
        )?;

        let disponible = cant_original - ya_devuelta;
        if item.cantidad > disponible + 0.001 {
            return Err(DbError::Negocio(format!(
                "No se puede devolver {:.3}; solo quedan {:.3} disponibles.",
                item.cantidad, disponible
            )));
        }
    }

    let caja_id: i64 = conn.query_row(
        "SELECT caja_id FROM ventas WHERE id = ?1",
        params![venta_id],
        |r| r.get(0),
    )?;

    let total: f64 = items.iter().map(|i| i.subtotal).sum();

    let tx = conn.transaction()?;

    let cantidad: i64 = tx.query_row("SELECT COUNT(*) FROM devoluciones", [], |r| r.get(0))?;
    let numero = format!("DEV-{:06}", cantidad + 1);

    tx.execute(
        "INSERT INTO devoluciones (venta_id, usuario_id, motivo, total)
         VALUES (?1, ?2, ?3, ?4)",
        params![venta_id, usuario_id, motivo.trim(), total],
    )?;
    let devolucion_id = tx.last_insert_rowid();

    for item in items {
        tx.execute(
            "INSERT INTO detalle_devolucion
             (devolucion_id, detalle_venta_id, producto_id, cantidad, subtotal)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                devolucion_id,
                item.detalle_venta_id,
                item.producto_id,
                item.cantidad,
                item.subtotal
            ],
        )?;

        ajustar_stock(
            &tx,
            item.producto_id,
            item.cantidad,
            TipoMovimiento::Devolucion,
            None,
            Some("devolucion"),
            Some(devolucion_id),
            usuario_id,
        )?;
    }

    tx.execute(
        "INSERT INTO movimientos_caja (
            caja_id, tipo, metodo_pago, monto, referencia_tipo, referencia_id, usuario_id
        ) VALUES (?1, 'DEVOLUCION', 'EFECTIVO', ?2, 'devolucion', ?3, ?4)",
        params![caja_id, total, devolucion_id, usuario_id],
    )?;

    tx.commit()?;

    Ok(DevolucionRegistrada {
        devolucion_id,
        numero,
        total,
    })
}