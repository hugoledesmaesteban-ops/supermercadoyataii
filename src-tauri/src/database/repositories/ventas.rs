//! Repositorio de ventas (Fase 5).
//!
//! `confirmar_venta` implementa al pie de la letra la secciÃ³n 18 del prompt:
//! crear venta -> detalle -> pagos -> descontar stock -> movimiento de stock
//! -> movimiento de caja, todo dentro de UNA transacciÃ³n SQLite. Si cualquier
//! paso falla, `rusqlite::Transaction` hace rollback automÃ¡tico al salir de
//! scope sin `commit()` â€” nunca queda una venta a medio guardar.
//!
//! La impresiÃ³n del ticket es responsabilidad de la capa de comando (fuera
//! de esta transacciÃ³n): si guardar la venta funciona pero imprimir falla,
//! la venta ya estÃ¡ confirmada y el frontend ofrece "Reimprimir ticket"
//! (secciÃ³n 18), no se pierde el dato.

use crate::database::repositories::stock::{ajustar_stock, TipoMovimiento};
use crate::database::DbError;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ItemVentaInput {
    pub producto_id: i64,
    pub cantidad: f64,
    pub es_pesable: bool,
    pub origen_peso: Option<String>,
    pub precio_unitario: f64,
    pub descuento: f64,
    pub promocion_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct PagoInput {
    pub metodo: String,
    pub monto: f64,
    pub monto_recibido: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct VentaConfirmada {
    pub venta_id: i64,
    pub numero: String,
    pub subtotal: f64,
    pub descuento: f64,
    pub total: f64,
    pub vuelto_total: f64,
}

const EPSILON: f64 = 0.01;

pub fn confirmar_venta(
    conn: &mut Connection,
    caja_id: i64,
    usuario_id: i64,
    cliente_id: Option<i64>,
    items: &[ItemVentaInput],
    pagos: &[PagoInput],
) -> Result<VentaConfirmada, DbError> {
    if items.is_empty() {
        return Err(error_negocio("La venta no tiene productos."));
    }

    let subtotal: f64 = items
        .iter()
        .map(|i| i.cantidad * i.precio_unitario)
        .sum();
    let descuento_items: f64 = items.iter().map(|i| i.descuento).sum();
    let total = (subtotal - descuento_items).max(0.0);

    let total_pagado: f64 = pagos.iter().map(|p| p.monto).sum();
    if total_pagado + EPSILON < total {
        return Err(error_negocio(&format!(
            "El pago (${total_pagado:.2}) es menor al total de la venta (${total:.2})."
        )));
    }

    for item in items {
        if item.es_pesable && item.origen_peso.is_none() {
            return Err(error_negocio(
                "Falta registrar el origen del peso (AUTOMATICO/MANUAL) para un producto pesable.",
            ));
        }
    }

    let tx = conn.transaction()?;

    let numero = siguiente_numero_venta(&tx)?;
    let sync_uuid = Uuid::new_v4().to_string();

    tx.execute(
        "INSERT INTO ventas (
            numero, caja_id, usuario_id, cliente_id, subtotal, descuento, total, sync_uuid
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![numero, caja_id, usuario_id, cliente_id, subtotal, descuento_items, total, sync_uuid],
    )?;
    let venta_id = tx.last_insert_rowid();

    for item in items {
        let subtotal_item = item.cantidad * item.precio_unitario - item.descuento;

        // Congelamos el costo del momento (precio_compra actual del producto)
        // para que los reportes históricos de ganancia no cambien si mañana
        // se edita el precio de compra.
        let costo_unitario: f64 = tx
            .query_row(
                "SELECT COALESCE(precio_compra, 0) FROM productos WHERE id = ?1",
                params![item.producto_id],
                |r| r.get(0),
            )
            .unwrap_or(0.0);

        tx.execute(
            "INSERT INTO detalle_venta (
                venta_id, producto_id, cantidad, es_pesable, origen_peso,
                precio_unitario, descuento, promocion_id, subtotal, costo_unitario
            ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
            params![
                venta_id,
                item.producto_id,
                item.cantidad,
                item.es_pesable,
                item.origen_peso,
                item.precio_unitario,
                item.descuento,
                item.promocion_id,
                subtotal_item,
                costo_unitario
            ],
        )?;

        ajustar_stock(
            &tx,
            item.producto_id,
            -item.cantidad,
            TipoMovimiento::Venta,
            None,
            Some("venta"),
            Some(venta_id),
            usuario_id,
        )?;
    }

    let mut vuelto_total = 0.0;
    for pago in pagos {
        let vuelto = if pago.metodo == "EFECTIVO" {
            pago.monto_recibido.map(|recibido| (recibido - pago.monto).max(0.0))
        } else {
            None
        };
        vuelto_total += vuelto.unwrap_or(0.0);

        tx.execute(
            "INSERT INTO pagos (venta_id, metodo, monto, monto_recibido, vuelto)
             VALUES (?1,?2,?3,?4,?5)",
            params![venta_id, pago.metodo, pago.monto, pago.monto_recibido, vuelto],
        )?;

        tx.execute(
            "INSERT INTO movimientos_caja (
                caja_id, tipo, metodo_pago, monto, referencia_tipo, referencia_id, usuario_id
            ) VALUES (?1, 'VENTA', ?2, ?3, 'venta', ?4, ?5)",
            params![caja_id, pago.metodo, pago.monto, venta_id, usuario_id],
        )?;
    }

    tx.commit()?;

    Ok(VentaConfirmada {
        venta_id,
        numero,
        subtotal,
        descuento: descuento_items,
        total,
        vuelto_total,
    })
}

fn siguiente_numero_venta(conn: &Connection) -> Result<String, DbError> {
    let cantidad: i64 = conn.query_row("SELECT COUNT(*) FROM ventas", [], |row| row.get(0))?;
    Ok(format!("{:06}", cantidad + 1))
}

fn error_negocio(mensaje: &str) -> DbError {
    DbError::Negocio(mensaje.to_string())
}

// ============================================================
// BÃºsqueda de ventas para devoluciÃ³n (Fase 6, secciÃ³n 23)
// ============================================================

#[derive(Debug, Serialize)]
pub struct ItemVentaParaDevolucion {
    pub detalle_venta_id: i64,
    pub producto_id: i64,
    pub nombre_producto: String,
    pub cantidad: f64,
    pub es_pesable: bool,
    pub precio_unitario: f64,
    pub subtotal: f64,
    pub cantidad_ya_devuelta: f64,
    pub cantidad_disponible: f64,
}

#[derive(Debug, Serialize)]
pub struct VentaParaDevolucion {
    pub venta_id: i64,
    pub numero: String,
    pub fecha: String,
    pub total: f64,
    pub usuario_id: i64,
    pub items: Vec<ItemVentaParaDevolucion>,
}

pub fn buscar_venta_para_devolucion(
    conn: &Connection,
    numero: &str,
) -> Result<Option<VentaParaDevolucion>, DbError> {
    let venta: Option<(i64, String, String, f64, i64)> = conn
        .query_row(
            "SELECT id, numero, fecha, total, usuario_id
             FROM ventas WHERE numero = ?1
             ORDER BY id DESC LIMIT 1",
            params![numero],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .optional()?;

    let Some((venta_id, numero, fecha, total, usuario_id)) = venta else {
        return Ok(None);
    };

    let mut stmt = conn.prepare(
        "SELECT
            dv.id, dv.producto_id, p.nombre, dv.cantidad, dv.es_pesable,
            dv.precio_unitario, dv.subtotal,
            COALESCE((SELECT SUM(dd.cantidad) FROM detalle_devolucion dd
                      WHERE dd.detalle_venta_id = dv.id), 0) AS ya_devuelta
         FROM detalle_venta dv
         JOIN productos p ON p.id = dv.producto_id
         WHERE dv.venta_id = ?1
         ORDER BY dv.id",
    )?;

    let items: Vec<ItemVentaParaDevolucion> = stmt
        .query_map(params![venta_id], |r| {
            let cantidad: f64 = r.get(3)?;
            let ya_devuelta: f64 = r.get(7)?;
            Ok(ItemVentaParaDevolucion {
                detalle_venta_id: r.get(0)?,
                producto_id: r.get(1)?,
                nombre_producto: r.get(2)?,
                cantidad,
                es_pesable: r.get(4)?,
                precio_unitario: r.get(5)?,
                subtotal: r.get(6)?,
                cantidad_ya_devuelta: ya_devuelta,
                cantidad_disponible: (cantidad - ya_devuelta).max(0.0),
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(Some(VentaParaDevolucion {
        venta_id,
        numero,
        fecha,
        total,
        usuario_id,
        items,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::repositories::caja;

    fn conn_de_prueba() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::database::aplicar_migraciones(&conn).unwrap();
        conn
    }

    fn crear_usuario_y_producto(conn: &Connection) -> (i64, i64) {
        conn.execute(
            "INSERT INTO usuarios (nombre_usuario, nombre_completo, password_hash, rol_id)
             VALUES ('cajero1', 'Cajero Uno', 'hash', 3)",
            [],
        )
        .unwrap();
        let usuario_id = conn.last_insert_rowid();

        conn.execute(
            "INSERT INTO productos (codigo_barra, nombre, precio_compra, precio_venta, stock, stock_minimo)
             VALUES ('7790001', 'Coca Cola 500ml', 1000, 2500, 50, 5)",
            [],
        )
        .unwrap();
        let producto_id = conn.last_insert_rowid();

        (usuario_id, producto_id)
    }

    #[test]
    fn confirmar_venta_descuenta_stock_y_registra_todo() {
        let mut conn = conn_de_prueba();
        let (usuario_id, producto_id) = crear_usuario_y_producto(&conn);
        let caja_id = caja::abrir_caja(&conn, usuario_id, 10_000.0).unwrap();

        let items = vec![ItemVentaInput {
            producto_id,
            cantidad: 2.0,
            es_pesable: false,
            origen_peso: None,
            precio_unitario: 2500.0,
            descuento: 0.0,
            promocion_id: None,
        }];
        let pagos = vec![PagoInput {
            metodo: "EFECTIVO".into(),
            monto: 5000.0,
            monto_recibido: Some(10_000.0),
        }];

        let resultado = confirmar_venta(&mut conn, caja_id, usuario_id, None, &items, &pagos).unwrap();

        assert_eq!(resultado.total, 5000.0);
        assert_eq!(resultado.vuelto_total, 5000.0);

        let stock_restante: f64 = conn
            .query_row("SELECT stock FROM productos WHERE id = ?1", params![producto_id], |r| r.get(0))
            .unwrap();
        assert_eq!(stock_restante, 48.0);
    }

    #[test]
    fn rechaza_venta_si_el_pago_no_alcanza() {
        let mut conn = conn_de_prueba();
        let (usuario_id, producto_id) = crear_usuario_y_producto(&conn);
        let caja_id = caja::abrir_caja(&conn, usuario_id, 10_000.0).unwrap();

        let items = vec![ItemVentaInput {
            producto_id,
            cantidad: 2.0,
            es_pesable: false,
            origen_peso: None,
            precio_unitario: 2500.0,
            descuento: 0.0,
            promocion_id: None,
        }];
        let pagos = vec![PagoInput {
            metodo: "EFECTIVO".into(),
            monto: 1000.0,
            monto_recibido: Some(1000.0),
        }];

        let resultado = confirmar_venta(&mut conn, caja_id, usuario_id, None, &items, &pagos);
        assert!(resultado.is_err());

        let cantidad_ventas: i64 = conn.query_row("SELECT COUNT(*) FROM ventas", [], |r| r.get(0)).unwrap();
        assert_eq!(cantidad_ventas, 0);
    }

    #[test]
    fn rechaza_venta_sin_stock_suficiente() {
        let mut conn = conn_de_prueba();
        let (usuario_id, producto_id) = crear_usuario_y_producto(&conn);
        let caja_id = caja::abrir_caja(&conn, usuario_id, 10_000.0).unwrap();

        let items = vec![ItemVentaInput {
            producto_id,
            cantidad: 999.0,
            es_pesable: false,
            origen_peso: None,
            precio_unitario: 2500.0,
            descuento: 0.0,
            promocion_id: None,
        }];
        let pagos = vec![PagoInput {
            metodo: "EFECTIVO".into(),
            monto: 999.0 * 2500.0,
            monto_recibido: Some(999.0 * 2500.0),
        }];

        let resultado = confirmar_venta(&mut conn, caja_id, usuario_id, None, &items, &pagos);
        assert!(resultado.is_err());

        let cantidad_ventas: i64 = conn.query_row("SELECT COUNT(*) FROM ventas", [], |r| r.get(0)).unwrap();
        assert_eq!(cantidad_ventas, 0);
    }
}