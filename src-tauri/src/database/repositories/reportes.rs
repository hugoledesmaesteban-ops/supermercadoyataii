//! Repositorio de reportes (Fase 11). Todas las consultas parten de
//! `ventas`/`detalle_venta`/`pagos` reales — nada calculado en el frontend
//! con datos parciales, para que el dashboard y el ticket coincidan siempre.

use crate::database::DbError;
use rusqlite::{params, Connection};
use serde::Serialize;

#[derive(Debug, Serialize, Default)]
pub struct ResumenDashboard {
    pub ventas_hoy: f64,
    pub ventas_semana: f64,
    pub ventas_mes: f64,
    pub ganancia_estimada_mes: f64,
    pub ticket_promedio_mes: f64,
    pub cantidad_ventas_mes: i64,
}

#[derive(Debug, Serialize)]
pub struct ProductoMasVendido {
    pub producto_id: i64,
    pub nombre: String,
    pub unidades_vendidas: f64,
}

#[derive(Debug, Serialize)]
pub struct TotalPorMetodoPago {
    pub metodo: String,
    pub total: f64,
}

#[derive(Debug, Serialize)]
pub struct VentasPorDia {
    pub fecha: String, // YYYY-MM-DD
    pub total: f64,
    pub cantidad: i64,
}

fn total_ventas_desde(conn: &Connection, desde_sql: &str) -> Result<f64, DbError> {
    conn.query_row(
        &format!(
            "SELECT COALESCE(SUM(total), 0) FROM ventas
             WHERE estado = 'CONFIRMADA' AND fecha >= {desde_sql}"
        ),
        [],
        |row| row.get(0),
    )
    .map_err(DbError::from)
}

pub fn resumen_dashboard(conn: &Connection) -> Result<ResumenDashboard, DbError> {
    let ventas_hoy = total_ventas_desde(conn, "date('now','start of day')")?;
    let ventas_semana = total_ventas_desde(conn, "date('now','-7 days')")?;
    let ventas_mes = total_ventas_desde(conn, "date('now','start of month')")?;

    let (cantidad_ventas_mes, ganancia_estimada_mes): (i64, f64) = conn.query_row(
        "SELECT COUNT(DISTINCT v.id),
                COALESCE(SUM((dv.precio_unitario - p.precio_compra) * dv.cantidad), 0)
         FROM ventas v
         JOIN detalle_venta dv ON dv.venta_id = v.id
         JOIN productos p ON p.id = dv.producto_id
         WHERE v.estado = 'CONFIRMADA' AND v.fecha >= date('now','start of month')",
        [],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;

    let ticket_promedio_mes = if cantidad_ventas_mes > 0 {
        ventas_mes / cantidad_ventas_mes as f64
    } else {
        0.0
    };

    Ok(ResumenDashboard {
        ventas_hoy,
        ventas_semana,
        ventas_mes,
        ganancia_estimada_mes,
        ticket_promedio_mes,
        cantidad_ventas_mes,
    })
}

/// Sección 32: ranking con filtro por período (en días; 0 = hoy).
pub fn productos_mas_vendidos(
    conn: &Connection,
    dias: i64,
    limite: i64,
) -> Result<Vec<ProductoMasVendido>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT dv.producto_id, p.nombre, SUM(dv.cantidad) as unidades
         FROM detalle_venta dv
         JOIN ventas v ON v.id = dv.venta_id
         JOIN productos p ON p.id = dv.producto_id
         WHERE v.estado = 'CONFIRMADA' AND v.fecha >= datetime('now', ?1 || ' days')
         GROUP BY dv.producto_id
         ORDER BY unidades DESC
         LIMIT ?2",
    )?;
    let filas = stmt.query_map(params![format!("-{dias}"), limite], |row| {
        Ok(ProductoMasVendido {
            producto_id: row.get(0)?,
            nombre: row.get(1)?,
            unidades_vendidas: row.get(2)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

/// Sección 31: participación por método de pago.
pub fn totales_por_metodo_pago(conn: &Connection, dias: i64) -> Result<Vec<TotalPorMetodoPago>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT pg.metodo, SUM(pg.monto)
         FROM pagos pg
         JOIN ventas v ON v.id = pg.venta_id
         WHERE v.estado = 'CONFIRMADA' AND v.fecha >= datetime('now', ?1 || ' days')
         GROUP BY pg.metodo
         ORDER BY SUM(pg.monto) DESC",
    )?;
    let filas = stmt.query_map(params![format!("-{dias}")], |row| {
        Ok(TotalPorMetodoPago {
            metodo: row.get(0)?,
            total: row.get(1)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

/// Sección 30: ventas por día, para graficar la curva de los últimos N días.
pub fn ventas_por_dia(conn: &Connection, dias: i64) -> Result<Vec<VentasPorDia>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT date(fecha) as dia, SUM(total), COUNT(*)
         FROM ventas
         WHERE estado = 'CONFIRMADA' AND fecha >= datetime('now', ?1 || ' days')
         GROUP BY dia
         ORDER BY dia ASC",
    )?;
    let filas = stmt.query_map(params![format!("-{dias}")], |row| {
        Ok(VentasPorDia {
            fecha: row.get(0)?,
            total: row.get(1)?,
            cantidad: row.get(2)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

// ============================================================
// Análisis de rentabilidad (ganancia real con costo histórico)
// ============================================================

#[derive(Debug, Serialize, Default)]
pub struct GananciaPeriodo {
    pub facturacion: f64,
    pub descuento: f64,
    pub costo: f64,
    pub ganancia: f64,
    pub margen_pct: f64,
    pub cantidad_tickets: i64,
    pub cantidad_unidades: f64,
}

#[derive(Debug, Serialize)]
pub struct GananciaPorProducto {
    pub producto_id: i64,
    pub nombre: String,
    pub unidades: f64,
    pub facturacion: f64,
    pub costo: f64,
    pub ganancia: f64,
    pub margen_pct: f64,
}

/// Resumen de ganancia real en un rango de fechas [desde, hasta] (inclusive).
/// Usa `costo_unitario` histórico (congelado en cada venta).
pub fn ganancia_periodo(
    conn: &Connection,
    desde: &str,
    hasta: &str,
) -> Result<GananciaPeriodo, DbError> {
    let (facturacion, descuento, costo, tickets, unidades): (f64, f64, f64, i64, f64) = conn.query_row(
        "SELECT
            COALESCE(SUM(dv.subtotal + dv.descuento), 0),
            COALESCE(SUM(dv.descuento), 0),
            COALESCE(SUM(dv.costo_unitario * dv.cantidad), 0),
            COUNT(DISTINCT v.id),
            COALESCE(SUM(dv.cantidad), 0)
         FROM ventas v
         JOIN detalle_venta dv ON dv.venta_id = v.id
         WHERE v.estado = 'CONFIRMADA'
           AND date(v.fecha) >= date(?1)
           AND date(v.fecha) <= date(?2)",
        params![desde, hasta],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
    )?;

    let ganancia = facturacion - costo;
    let margen_pct = if facturacion > 0.0 {
        (ganancia / facturacion) * 100.0
    } else {
        0.0
    };

    Ok(GananciaPeriodo {
        facturacion,
        descuento,
        costo,
        ganancia,
        margen_pct,
        cantidad_tickets: tickets,
        cantidad_unidades: unidades,
    })
}

/// Ranking de productos por ganancia en un rango de fechas.
pub fn ganancia_por_producto(
    conn: &Connection,
    desde: &str,
    hasta: &str,
    limite: i64,
) -> Result<Vec<GananciaPorProducto>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT
            dv.producto_id,
            p.nombre,
            SUM(dv.cantidad),
            SUM(dv.subtotal),
            SUM(dv.costo_unitario * dv.cantidad)
         FROM detalle_venta dv
         JOIN ventas v ON v.id = dv.venta_id
         JOIN productos p ON p.id = dv.producto_id
         WHERE v.estado = 'CONFIRMADA'
           AND date(v.fecha) >= date(?1)
           AND date(v.fecha) <= date(?2)
         GROUP BY dv.producto_id
         ORDER BY (SUM(dv.subtotal) - SUM(dv.costo_unitario * dv.cantidad)) DESC
         LIMIT ?3",
    )?;
    let filas = stmt.query_map(params![desde, hasta, limite], |row| {
        let facturacion: f64 = row.get(3)?;
        let costo: f64 = row.get(4)?;
        let ganancia = facturacion - costo;
        let margen_pct = if facturacion > 0.0 {
            (ganancia / facturacion) * 100.0
        } else {
            0.0
        };
        Ok(GananciaPorProducto {
            producto_id: row.get(0)?,
            nombre: row.get(1)?,
            unidades: row.get(2)?,
            facturacion,
            costo,
            ganancia,
            margen_pct,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}
