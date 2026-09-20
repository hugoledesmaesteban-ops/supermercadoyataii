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
use argon2::{Argon2, PasswordHash, PasswordVerifier};
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


// ============================================================
// Anular venta (solo dueño/developer con contraseña)
// ============================================================

#[derive(Debug, Serialize)]
pub struct VentaParaAnular {
    pub id: i64,
    pub numero: String,
    pub fecha: String,
    pub total: f64,
    pub estado: String,
    pub cantidad_items: i64,
}

pub fn listar_ventas_para_anular(
    conn: &Connection,
    desde: Option<&str>,
    hasta: Option<&str>,
    limite: i64,
) -> Result<Vec<VentaParaAnular>, DbError> {
    let mut sql = String::from(
        "SELECT v.id, v.numero, v.fecha, v.total, COALESCE(v.estado, 'CONFIRMADA'),
                (SELECT COUNT(*) FROM detalle_venta dv WHERE dv.venta_id = v.id)
         FROM ventas v WHERE 1=1"
    );
    if desde.is_some() {
        sql.push_str(" AND date(v.fecha) >= date(?1)");
    }
    if hasta.is_some() {
        sql.push_str(" AND date(v.fecha) <= date(?2)");
    }
    sql.push_str(" ORDER BY v.id DESC LIMIT ?3");

    let mut stmt = conn.prepare(&sql)?;

    let filas: Vec<VentaParaAnular> = if desde.is_some() && hasta.is_some() {
        stmt.query_map(params![desde.unwrap(), hasta.unwrap(), limite], map_venta)?
            .filter_map(|r| r.ok()).collect()
    } else if desde.is_some() {
        stmt.query_map(params![desde.unwrap(), "9999-12-31", limite], map_venta)?
            .filter_map(|r| r.ok()).collect()
    } else if hasta.is_some() {
        stmt.query_map(params!["1900-01-01", hasta.unwrap(), limite], map_venta)?
            .filter_map(|r| r.ok()).collect()
    } else {
        stmt.query_map(params!["1900-01-01", "9999-12-31", limite], map_venta)?
            .filter_map(|r| r.ok()).collect()
    };

    Ok(filas)
}

fn map_venta(r: &rusqlite::Row) -> rusqlite::Result<VentaParaAnular> {
    Ok(VentaParaAnular {
        id: r.get(0)?,
        numero: r.get(1)?,
        fecha: r.get(2)?,
        total: r.get(3)?,
        estado: r.get(4)?,
        cantidad_items: r.get(5)?,
    })
}

fn verificar_password(
    conn: &Connection,
    usuario_id: i64,
    password: &str,
) -> Result<bool, DbError> {
    let hash: String = conn
        .query_row(
            "SELECT password_hash FROM usuarios WHERE id = ?1",
            params![usuario_id],
            |r| r.get(0),
        )
        .map_err(|_| error_negocio("Usuario no encontrado."))?;

    let parsed = PasswordHash::new(&hash)
        .map_err(|_| error_negocio("Error al leer la contraseña guardada."))?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

fn es_dueno(conn: &Connection, usuario_id: i64) -> Result<bool, DbError> {
    let rol_id: i64 = conn
        .query_row(
            "SELECT rol_id FROM usuarios WHERE id = ?1",
            params![usuario_id],
            |r| r.get(0),
        )
        .map_err(|_| error_negocio("Usuario no encontrado."))?;
    Ok(rol_id == 1 || rol_id == 2)
}

pub fn anular_venta(
    conn: &mut Connection,
    venta_id: i64,
    usuario_id: i64,
    password: &str,
) -> Result<(), DbError> {
    // 1. Verificar rol
    if !es_dueno(conn, usuario_id)? {
        return Err(error_negocio(
            "Solo el dueño puede anular ventas.",
        ));
    }

    // 2. Verificar contraseña
    if !verificar_password(conn, usuario_id, password)? {
        return Err(error_negocio("Contraseña incorrecta."));
    }

    // 3. Verificar que existe y no esté anulada
    let (estado, caja_id, total): (String, i64, f64) = conn
        .query_row(
            "SELECT COALESCE(estado, 'CONFIRMADA'), caja_id, total
             FROM ventas WHERE id = ?1",
            params![venta_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|_| error_negocio("Venta no encontrada."))?;

    if estado == "ANULADA" {
        return Err(error_negocio("Esta venta ya fue anulada."));
    }

    // 4. Obtener items para devolver stock
    let items: Vec<(i64, f64)> = {
        let mut stmt = conn.prepare(
            "SELECT producto_id, cantidad FROM detalle_venta WHERE venta_id = ?1",
        )?;
        let rows = stmt
            .query_map(params![venta_id], |r| Ok((r.get(0)?, r.get(1)?)))?
            .filter_map(|r| r.ok())
            .collect();
        rows
    };

    // 5. Transacción
    let tx = conn.transaction()?;

    // 5.1 Devolver stock
    for (producto_id, cantidad) in &items {
        ajustar_stock(
            &tx,
            *producto_id,
            *cantidad,
            TipoMovimiento::Ajuste,
            Some("Anulación de venta"),
            Some("anulacion"),
            Some(venta_id),
            usuario_id,
        )?;
    }

    // 5.2 Borrar movimientos de caja de esa venta
    tx.execute(
        "DELETE FROM movimientos_caja
         WHERE referencia_tipo = 'venta' AND referencia_id = ?1 AND tipo = 'VENTA'",
        params![venta_id],
    )?;

    // 5.3 Marcar venta como anulada
    tx.execute(
        "UPDATE ventas SET estado = 'ANULADA' WHERE id = ?1",
        params![venta_id],
    )?;

    // 5.4 Registrar en auditoría (si la tabla existe)
    let _ = tx.execute(
        "INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle)
         VALUES (?1, 'VENTA_ANULADA', 'venta', ?2, ?3)",
        params![
            usuario_id,
            venta_id,
            format!("Venta anulada. Total original: ${:.2}", total)
        ],
    );

    tx.commit()?;

    let _ = caja_id; // reservado por si a futuro se necesita

    Ok(())
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