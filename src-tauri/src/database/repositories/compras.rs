//! Repositorio de compras (Fase 25, sección 25). Igual que las ventas, una
//! compra es una transacción: crear compra + detalle + aumentar stock, todo
//! junto o nada.

use crate::database::repositories::stock::{ajustar_stock, TipoMovimiento};
use crate::database::DbError;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ItemCompraInput {
    pub producto_id: i64,
    pub cantidad: f64,
    pub precio_compra_unitario: f64,
}

#[derive(Debug, Serialize)]
pub struct CompraConfirmada {
    pub compra_id: i64,
    pub total: f64,
}

pub fn confirmar_compra(
    conn: &mut Connection,
    proveedor_id: i64,
    usuario_id: i64,
    numero_comprobante: Option<&str>,
    items: &[ItemCompraInput],
) -> Result<CompraConfirmada, DbError> {
    if items.is_empty() {
        return Err(DbError::Negocio("La compra no tiene productos.".into()));
    }

    let total: f64 = items.iter().map(|i| i.cantidad * i.precio_compra_unitario).sum();

    let tx = conn.transaction()?;

    tx.execute(
        "INSERT INTO compras (proveedor_id, usuario_id, numero_comprobante, total)
         VALUES (?1, ?2, ?3, ?4)",
        params![proveedor_id, usuario_id, numero_comprobante, total],
    )?;
    let compra_id = tx.last_insert_rowid();

    for item in items {
        let subtotal = item.cantidad * item.precio_compra_unitario;
        tx.execute(
            "INSERT INTO detalle_compra (compra_id, producto_id, cantidad, precio_compra_unitario, subtotal)
             VALUES (?1,?2,?3,?4,?5)",
            params![compra_id, item.producto_id, item.cantidad, item.precio_compra_unitario, subtotal],
        )?;

        // Sección 25: "Al confirmar: Aumentar stock. Registrar movimiento."
        ajustar_stock(
            &tx,
            item.producto_id,
            item.cantidad,
            TipoMovimiento::Compra,
            None,
            Some("compra"),
            Some(compra_id),
            usuario_id,
        )?;
    }

    tx.commit()?;

    Ok(CompraConfirmada { compra_id, total })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn conn_de_prueba() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::database::aplicar_migraciones(&conn).unwrap();
        conn
    }

    #[test]
    fn confirmar_compra_aumenta_stock_y_registra_movimiento() {
        let mut conn = conn_de_prueba();
        conn.execute(
            "INSERT INTO usuarios (nombre_usuario, nombre_completo, password_hash, rol_id) VALUES ('u','U','h',1)",
            [],
        ).unwrap();
        let usuario_id = conn.last_insert_rowid();
        conn.execute("INSERT INTO proveedores (nombre) VALUES ('Distribuidora X')", []).unwrap();
        let proveedor_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO productos (nombre, precio_compra, precio_venta, stock, stock_minimo) VALUES ('Coca',1000,2500,10,2)",
            [],
        ).unwrap();
        let producto_id = conn.last_insert_rowid();

        let items = vec![ItemCompraInput { producto_id, cantidad: 24.0, precio_compra_unitario: 950.0 }];
        let resultado = confirmar_compra(&mut conn, proveedor_id, usuario_id, Some("F-0001"), &items).unwrap();

        assert_eq!(resultado.total, 24.0 * 950.0);
        let stock: f64 = conn.query_row("SELECT stock FROM productos WHERE id=?1", params![producto_id], |r| r.get(0)).unwrap();
        assert_eq!(stock, 34.0);
    }
}
