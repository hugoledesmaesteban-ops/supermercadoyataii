//! Repositorio y motor de promociones (Fase 10, sección 21).
//!
//! El cálculo se hace por producto: dado un producto y una cantidad, busca
//! la promoción activa de mayor prioridad que aplique (por fecha, día,
//! horario y cantidad mínima) y devuelve el descuento resultante. La
//! sección 21 pide 4 tipos; los primeros 3 tienen semántica clara y se
//! implementan completos. `COMBO` (múltiples productos distintos en una
//! misma promoción) no tiene definida en el prompt la regla de qué
//! productos se combinan en qué proporción, así que se deja registrado en
//! el modelo de datos pero el cálculo devuelve explícitamente "no
//! implementado" en vez de adivinar una regla de negocio.

use crate::database::DbError;
use chrono::{Datelike, Local, NaiveTime};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Promocion {
    pub id: i64,
    pub nombre: String,
    pub tipo: String, // PORCENTAJE | 2X1 | PRECIO_FIJO | COMBO
    pub valor: Option<f64>,
    pub categoria_id: Option<i64>,
    pub cantidad_minima: f64,
    pub prioridad: i64,
}

#[derive(Debug, Serialize)]
pub struct ResultadoPromocion {
    pub promocion_id: i64,
    pub descuento: f64,
}

pub fn crear_promocion(conn: &Connection, p: &Promocion, categoria_id: Option<i64>) -> Result<i64, DbError> {
    conn.execute(
        "INSERT INTO promociones (nombre, tipo, valor, categoria_id, cantidad_minima, prioridad, activo)
         VALUES (?1,?2,?3,?4,?5,?6,1)",
        params![p.nombre, p.tipo, p.valor, categoria_id, p.cantidad_minima, p.prioridad],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn asociar_producto(conn: &Connection, promocion_id: i64, producto_id: i64) -> Result<(), DbError> {
    conn.execute(
        "INSERT OR IGNORE INTO promocion_productos (promocion_id, producto_id) VALUES (?1, ?2)",
        params![promocion_id, producto_id],
    )?;
    Ok(())
}

pub fn listar_todas(conn: &Connection) -> Result<Vec<Promocion>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, nombre, tipo, valor, categoria_id, cantidad_minima, prioridad
         FROM promociones WHERE activo = 1 ORDER BY prioridad DESC",
    )?;
    let filas = stmt.query_map([], |row| {
        Ok(Promocion {
            id: row.get(0)?,
            nombre: row.get(1)?,
            tipo: row.get(2)?,
            valor: row.get(3)?,
            categoria_id: row.get(4)?,
            cantidad_minima: row.get(5)?,
            prioridad: row.get(6)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

/// Promociones activas ahora mismo para un producto puntual (por
/// coincidencia directa en `promocion_productos`, o por su categoría),
/// respetando fecha/día/horario, ordenadas por prioridad descendente.
pub fn promociones_aplicables_a_producto(
    conn: &Connection,
    producto_id: i64,
    categoria_id: Option<i64>,
) -> Result<Vec<Promocion>, DbError> {
    let ahora = Local::now();
    let hoy = ahora.date_naive();
    let hora_actual = ahora.time();
    let dia_abrev = dia_abreviado(ahora.weekday().number_from_monday());

    let mut stmt = conn.prepare(
        "SELECT DISTINCT p.id, p.nombre, p.tipo, p.valor, p.categoria_id,
                p.cantidad_minima, p.prioridad, p.fecha_inicio, p.fecha_fin,
                p.dias_activos, p.hora_inicio, p.hora_fin
         FROM promociones p
         LEFT JOIN promocion_productos pp ON pp.promocion_id = p.id
         WHERE p.activo = 1
           AND (pp.producto_id = ?1 OR p.categoria_id = ?2)
         ORDER BY p.prioridad DESC",
    )?;

    let filas = stmt.query_map(params![producto_id, categoria_id], |row| {
        Ok((
            Promocion {
                id: row.get(0)?,
                nombre: row.get(1)?,
                tipo: row.get(2)?,
                valor: row.get(3)?,
                categoria_id: row.get(4)?,
                cantidad_minima: row.get(5)?,
                prioridad: row.get(6)?,
            },
            row.get::<_, Option<String>>(7)?, // fecha_inicio
            row.get::<_, Option<String>>(8)?, // fecha_fin
            row.get::<_, Option<String>>(9)?, // dias_activos
            row.get::<_, Option<String>>(10)?, // hora_inicio
            row.get::<_, Option<String>>(11)?, // hora_fin
        ))
    })?;

    let mut resultado = Vec::new();
    for fila in filas.filter_map(|r| r.ok()) {
        let (promo, fecha_inicio, fecha_fin, dias_activos, hora_inicio, hora_fin) = fila;

        if let Some(fi) = &fecha_inicio {
            if let Ok(fecha) = chrono::NaiveDate::parse_from_str(fi, "%Y-%m-%d") {
                if hoy < fecha {
                    continue;
                }
            }
        }
        if let Some(ff) = &fecha_fin {
            if let Ok(fecha) = chrono::NaiveDate::parse_from_str(ff, "%Y-%m-%d") {
                if hoy > fecha {
                    continue;
                }
            }
        }
        if let Some(dias) = &dias_activos {
            if !dias.split(',').any(|d| d.trim() == dia_abrev) {
                continue;
            }
        }
        if let (Some(hi), Some(hf)) = (&hora_inicio, &hora_fin) {
            let hi = NaiveTime::parse_from_str(hi, "%H:%M");
            let hf = NaiveTime::parse_from_str(hf, "%H:%M");
            if let (Ok(hi), Ok(hf)) = (hi, hf) {
                if hora_actual < hi || hora_actual > hf {
                    continue;
                }
            }
        }

        resultado.push(promo);
    }

    Ok(resultado)
}

fn dia_abreviado(numero_desde_lunes: u32) -> &'static str {
    match numero_desde_lunes {
        1 => "LUN",
        2 => "MAR",
        3 => "MIE",
        4 => "JUE",
        5 => "VIE",
        6 => "SAB",
        _ => "DOM",
    }
}

/// Calcula el descuento resultante de aplicar la mejor promoción disponible
/// a una línea de venta. Devuelve `None` si no corresponde ninguna
/// promoción (ya sea porque no hay o porque no se llegó a la cantidad
/// mínima).
pub fn calcular_mejor_descuento(
    promociones: &[Promocion],
    cantidad: f64,
    precio_unitario: f64,
) -> Option<ResultadoPromocion> {
    promociones
        .iter()
        .filter(|p| cantidad >= p.cantidad_minima)
        .filter_map(|p| {
            let descuento = match p.tipo.as_str() {
                "PORCENTAJE" => {
                    let pct = p.valor.unwrap_or(0.0);
                    Some(cantidad * precio_unitario * (pct / 100.0))
                }
                "2X1" => {
                    // Sección 21: cada 2 unidades, se cobra 1. Se descuenta
                    // el precio de una unidad por cada par completo.
                    let pares = (cantidad / 2.0).floor();
                    Some(pares * precio_unitario)
                }
                "PRECIO_FIJO" => {
                    let precio_fijo = p.valor.unwrap_or(precio_unitario);
                    Some((precio_unitario - precio_fijo).max(0.0) * cantidad)
                }
                "COMBO" => None, // ver nota de módulo: regla de combinación no especificada
                _ => None,
            };
            descuento.map(|d| ResultadoPromocion {
                promocion_id: p.id,
                descuento: d,
            })
        })
        .max_by(|a, b| a.descuento.partial_cmp(&b.descuento).unwrap())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn promo(tipo: &str, valor: Option<f64>, cantidad_minima: f64) -> Promocion {
        Promocion {
            id: 1,
            nombre: "test".into(),
            tipo: tipo.into(),
            valor,
            categoria_id: None,
            cantidad_minima,
            prioridad: 0,
        }
    }

    #[test]
    fn dos_por_uno_descuenta_el_precio_de_los_pares_completos() {
        let promos = vec![promo("2X1", None, 2.0)];
        // 5 gaseosas: 2 pares completos + 1 suelta -> se descuentan 2 unidades
        let resultado = calcular_mejor_descuento(&promos, 5.0, 1000.0).unwrap();
        assert_eq!(resultado.descuento, 2000.0);
    }

    #[test]
    fn porcentaje_calcula_sobre_el_subtotal_de_la_linea() {
        let promos = vec![promo("PORCENTAJE", Some(20.0), 1.0)];
        let resultado = calcular_mejor_descuento(&promos, 3.0, 1000.0).unwrap();
        assert_eq!(resultado.descuento, 600.0); // 20% de 3000
    }

    #[test]
    fn no_aplica_si_no_llega_a_la_cantidad_minima() {
        let promos = vec![promo("2X1", None, 2.0)];
        assert!(calcular_mejor_descuento(&promos, 1.0, 1000.0).is_none());
    }

    #[test]
    fn elige_la_promocion_con_mayor_descuento_resultante() {
        let promos = vec![
            promo("PORCENTAJE", Some(5.0), 1.0),
            promo("2X1", None, 2.0),
        ];
        // Con 2 unidades de $1000: 5% = $100 de descuento; 2x1 = $1000 de descuento.
        let resultado = calcular_mejor_descuento(&promos, 2.0, 1000.0).unwrap();
        assert_eq!(resultado.descuento, 1000.0);
    }
}
