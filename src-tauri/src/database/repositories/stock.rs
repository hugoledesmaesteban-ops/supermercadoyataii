//! Repositorio de stock (Fase 3).
//!
//! Regla del prompt (sección 19): "Nunca modificar stock sin registrar el
//! movimiento correspondiente." Por eso `ajustar_stock` es la ÚNICA función
//! de todo el sistema que puede cambiar `productos.stock`, y siempre lo hace
//! junto con un INSERT en `stock_movimientos` dentro de la misma conexión
//! (el llamador decide si eso va envuelto en una transacción más grande,
//! como en la venta de la Fase 5).

use crate::database::DbError;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum TipoMovimiento {
    Entrada,
    Venta,
    Devolucion,
    Ajuste,
    Perdida,
    Rotura,
    Vencimiento,
    Compra,
}

impl TipoMovimiento {
    fn as_db_str(&self) -> &'static str {
        match self {
            TipoMovimiento::Entrada => "ENTRADA",
            TipoMovimiento::Venta => "VENTA",
            TipoMovimiento::Devolucion => "DEVOLUCION",
            TipoMovimiento::Ajuste => "AJUSTE",
            TipoMovimiento::Perdida => "PERDIDA",
            TipoMovimiento::Rotura => "ROTURA",
            TipoMovimiento::Vencimiento => "VENCIMIENTO",
            TipoMovimiento::Compra => "COMPRA",
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockBajo {
    pub id: i64,
    pub nombre: String,
    pub stock: f64,
    pub stock_minimo: f64,
    pub unidad_medida: String,
}

/// Aplica una variación de stock (positiva = entrada, negativa = salida) y
/// registra el movimiento en la misma operación. `cantidad_delta` es la
/// variación, no el nuevo total.
///
/// Devuelve el stock resultante, o un error de negocio si la operación
/// dejaría el stock en negativo (nunca debe pasar en una venta real).
pub fn ajustar_stock(
    conn: &Connection,
    producto_id: i64,
    cantidad_delta: f64,
    tipo: TipoMovimiento,
    motivo: Option<&str>,
    referencia_tipo: Option<&str>,
    referencia_id: Option<i64>,
    usuario_id: i64,
) -> Result<f64, DbError> {
    let stock_actual: f64 = conn.query_row(
        "SELECT stock FROM productos WHERE id = ?1",
        params![producto_id],
        |row| row.get(0),
    )?;

    let stock_resultante = stock_actual + cantidad_delta;

    if stock_resultante < 0.0 {
        return Err(DbError::Negocio(format!(
            "Stock insuficiente para producto {producto_id}: actual {stock_actual}, se pidió {cantidad_delta}"
        )));
    }

    conn.execute(
        "UPDATE productos SET stock = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?2",
        params![stock_resultante, producto_id],
    )?;

    conn.execute(
        "INSERT INTO stock_movimientos (
            producto_id, cantidad, tipo, motivo, referencia_tipo, referencia_id,
            usuario_id, stock_resultante
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![
            producto_id,
            cantidad_delta,
            tipo.as_db_str(),
            motivo,
            referencia_tipo,
            referencia_id,
            usuario_id,
            stock_resultante
        ],
    )?;

    Ok(stock_resultante)
}

/// Sección 20: productos con `stock <= stock_minimo` (incluye sin stock).
pub fn listar_stock_bajo(conn: &Connection) -> Result<Vec<StockBajo>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, nombre, stock, stock_minimo, unidad_medida
         FROM productos
         WHERE activo = 1 AND stock <= stock_minimo
         ORDER BY stock ASC",
    )?;
    let filas = stmt.query_map([], |row| {
        Ok(StockBajo {
            id: row.get(0)?,
            nombre: row.get(1)?,
            stock: row.get(2)?,
            stock_minimo: row.get(3)?,
            unidad_medida: row.get(4)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}
// ============================================================
// Alertas de stock y vencimientos (sección 36)
// ============================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductoVencimiento {
    pub id: i64,
    pub nombre: String,
    pub stock: f64,
    pub unidad_medida: String,
    pub vencimiento: String,
    pub dias_restantes: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContadorAlertas {
    pub stock_bajo: i64,
    pub vencidos: i64,
    pub por_vencer: i64,
}

/// Productos con vencimiento pasado (antes de hoy) que todavía tienen stock.
pub fn listar_productos_vencidos(conn: &Connection) -> Result<Vec<ProductoVencimiento>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, nombre, stock, unidad_medida, vencimiento,
                CAST(julianday(date('now')) - julianday(date(vencimiento)) AS INTEGER) AS dias
         FROM productos
         WHERE activo = 1
           AND vencimiento IS NOT NULL
           AND date(vencimiento) < date('now')
           AND stock > 0
         ORDER BY date(vencimiento) ASC",
    )?;
    let filas = stmt.query_map([], |row| {
        Ok(ProductoVencimiento {
            id: row.get(0)?,
            nombre: row.get(1)?,
            stock: row.get(2)?,
            unidad_medida: row.get(3)?,
            vencimiento: row.get(4)?,
            dias_restantes: -row.get::<_, i64>(5)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

/// Productos que vencen dentro de los próximos `dias` días (incluyendo hoy).
pub fn listar_productos_proximos_vencer(
    conn: &Connection,
    dias: i64,
) -> Result<Vec<ProductoVencimiento>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, nombre, stock, unidad_medida, vencimiento,
                CAST(julianday(date(vencimiento)) - julianday(date('now')) AS INTEGER) AS dias
         FROM productos
         WHERE activo = 1
           AND vencimiento IS NOT NULL
           AND date(vencimiento) >= date('now')
           AND date(vencimiento) <= date('now', '+' || ?1 || ' days')
           AND stock > 0
         ORDER BY date(vencimiento) ASC",
    )?;
    let filas = stmt.query_map(params![dias], |row| {
        Ok(ProductoVencimiento {
            id: row.get(0)?,
            nombre: row.get(1)?,
            stock: row.get(2)?,
            unidad_medida: row.get(3)?,
            vencimiento: row.get(4)?,
            dias_restantes: row.get(5)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

/// Cuenta rápida de alertas para el badge de la cabecera.
pub fn contar_alertas(conn: &Connection, dias_proximos: i64) -> Result<ContadorAlertas, DbError> {
    let stock_bajo: i64 = conn.query_row(
        "SELECT COUNT(*) FROM productos WHERE activo = 1 AND stock <= stock_minimo",
        [],
        |r| r.get(0),
    )?;

    let vencidos: i64 = conn.query_row(
        "SELECT COUNT(*) FROM productos
         WHERE activo = 1 AND vencimiento IS NOT NULL
           AND date(vencimiento) < date('now') AND stock > 0",
        [],
        |r| r.get(0),
    )?;

    let por_vencer: i64 = conn.query_row(
        "SELECT COUNT(*) FROM productos
         WHERE activo = 1 AND vencimiento IS NOT NULL
           AND date(vencimiento) >= date('now')
           AND date(vencimiento) <= date('now', '+' || ?1 || ' days')
           AND stock > 0",
        params![dias_proximos],
        |r| r.get(0),
    )?;

    Ok(ContadorAlertas { stock_bajo, vencidos, por_vencer })
}