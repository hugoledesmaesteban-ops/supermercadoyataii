//! Repositorio de caja (Fase 6, secciones 27-28).

use crate::database::DbError;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Caja {
    pub id: i64,
    pub monto_apertura: f64,
    pub fecha_apertura: String,
    pub estado: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResumenCierre {
    pub cantidad_tickets: i64,
    pub total_vendido: f64,
    pub efectivo: f64,
    pub transferencia: f64,
    pub tarjeta: f64,
    pub qr: f64,
    pub otros: f64,
    pub retiros: f64,
    pub ingresos: f64,
    pub gastos: f64,
    pub efectivo_esperado: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MovimientoCaja {
    pub id: i64,
    pub fecha: String,
    pub tipo: String,
    pub metodo_pago: Option<String>,
    pub monto: f64,
    pub motivo: Option<String>,
    pub usuario_id: i64,
    pub usuario_nombre: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CierreAnterior {
    pub id: i64,
    pub fecha_apertura: String,
    pub fecha_cierre: Option<String>,
    pub monto_apertura: f64,
    pub efectivo_esperado: Option<f64>,
    pub efectivo_declarado: Option<f64>,
    pub diferencia: Option<f64>,
    pub usuario_apertura_id: i64,
    pub usuario_apertura_nombre: Option<String>,
    pub usuario_cierre_id: Option<i64>,
    pub usuario_cierre_nombre: Option<String>,
}

pub fn caja_abierta(conn: &Connection) -> Result<Option<Caja>, DbError> {
    conn.query_row(
        "SELECT id, monto_apertura, fecha_apertura, estado
         FROM cajas WHERE estado = 'ABIERTA' ORDER BY id DESC LIMIT 1",
        [],
        |row| {
            Ok(Caja {
                id: row.get(0)?,
                monto_apertura: row.get(1)?,
                fecha_apertura: row.get(2)?,
                estado: row.get(3)?,
            })
        },
    )
    .optional()
    .map_err(DbError::from)
}

pub fn abrir_caja(conn: &Connection, usuario_id: i64, monto_apertura: f64) -> Result<i64, DbError> {
    if caja_abierta(conn)?.is_some() {
        return Err(DbError::Negocio(
            "Ya hay una caja abierta. Debe cerrarse antes de abrir otra.".into(),
        ));
    }

    conn.execute(
        "INSERT INTO cajas (usuario_apertura_id, monto_apertura) VALUES (?1, ?2)",
        params![usuario_id, monto_apertura],
    )?;
    let caja_id = conn.last_insert_rowid();

    conn.execute(
        "INSERT INTO movimientos_caja (caja_id, tipo, monto, usuario_id)
         VALUES (?1, 'APERTURA', ?2, ?3)",
        params![caja_id, monto_apertura, usuario_id],
    )?;

    Ok(caja_id)
}

/// Retiro, ingreso o gasto manual de efectivo (sección 27).
/// `monto` siempre positivo; el `tipo` determina cómo afecta al efectivo esperado:
/// - INGRESO: suma
/// - RETIRO: resta
/// - GASTO: resta (pago de un gasto operativo con la plata de la caja)
pub fn registrar_movimiento_manual(
    conn: &Connection,
    caja_id: i64,
    tipo: &str,
    monto: f64,
    motivo: &str,
    usuario_id: i64,
) -> Result<(), DbError> {
    if !matches!(tipo, "RETIRO" | "INGRESO" | "GASTO") {
        return Err(DbError::Negocio(
            "Tipo de movimiento inválido (RETIRO/INGRESO/GASTO).".into(),
        ));
    }
    if monto <= 0.0 {
        return Err(DbError::Negocio("El monto debe ser mayor a cero.".into()));
    }

    conn.execute(
        "INSERT INTO movimientos_caja (caja_id, tipo, monto, motivo, usuario_id)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![caja_id, tipo, monto, motivo, usuario_id],
    )?;
    Ok(())
}

pub fn calcular_resumen_cierre(conn: &Connection, caja_id: i64) -> Result<ResumenCierre, DbError> {
    let caja: Caja = conn.query_row(
        "SELECT id, monto_apertura, fecha_apertura, estado FROM cajas WHERE id = ?1",
        params![caja_id],
        |row| {
            Ok(Caja {
                id: row.get(0)?,
                monto_apertura: row.get(1)?,
                fecha_apertura: row.get(2)?,
                estado: row.get(3)?,
            })
        },
    )?;

    let suma_por_metodo = |metodo: &str| -> Result<f64, DbError> {
        conn.query_row(
            "SELECT COALESCE(SUM(monto), 0) FROM movimientos_caja
             WHERE caja_id = ?1 AND tipo = 'VENTA' AND metodo_pago = ?2",
            params![caja_id, metodo],
            |row| row.get(0),
        )
        .map_err(DbError::from)
    };

    let efectivo = suma_por_metodo("EFECTIVO")?;
    let transferencia = suma_por_metodo("TRANSFERENCIA")?;
    let tarjeta = suma_por_metodo("TARJETA")?;
    let qr = suma_por_metodo("QR")?;
    let otros = suma_por_metodo("OTRO")?;

    let cantidad_tickets: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT referencia_id) FROM movimientos_caja
         WHERE caja_id = ?1 AND tipo = 'VENTA'",
        params![caja_id],
        |row| row.get(0),
    )?;

    let retiros: f64 = conn.query_row(
        "SELECT COALESCE(SUM(monto), 0) FROM movimientos_caja WHERE caja_id = ?1 AND tipo = 'RETIRO'",
        params![caja_id],
        |row| row.get(0),
    )?;
    let ingresos: f64 = conn.query_row(
        "SELECT COALESCE(SUM(monto), 0) FROM movimientos_caja WHERE caja_id = ?1 AND tipo = 'INGRESO'",
        params![caja_id],
        |row| row.get(0),
    )?;
    let gastos: f64 = conn.query_row(
        "SELECT COALESCE(SUM(monto), 0) FROM movimientos_caja WHERE caja_id = ?1 AND tipo = 'GASTO'",
        params![caja_id],
        |row| row.get(0),
    )?;

    let efectivo_esperado = caja.monto_apertura + efectivo + ingresos - retiros - gastos;

    Ok(ResumenCierre {
        cantidad_tickets,
        total_vendido: efectivo + transferencia + tarjeta + qr + otros,
        efectivo,
        transferencia,
        tarjeta,
        qr,
        otros,
        retiros,
        ingresos,
        gastos,
        efectivo_esperado,
    })
}

pub fn cerrar_caja(
    conn: &Connection,
    caja_id: i64,
    usuario_id: i64,
    efectivo_declarado: f64,
    cierre_pdf_path: Option<&str>,
) -> Result<f64, DbError> {
    let resumen = calcular_resumen_cierre(conn, caja_id)?;
    let diferencia = efectivo_declarado - resumen.efectivo_esperado;

    conn.execute(
        "UPDATE cajas SET
            usuario_cierre_id = ?1,
            fecha_cierre = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
            efectivo_esperado = ?2,
            efectivo_declarado = ?3,
            diferencia = ?4,
            estado = 'CERRADA',
            bloqueada = 1,
            cierre_pdf_path = ?5
         WHERE id = ?6",
        params![
            usuario_id,
            resumen.efectivo_esperado,
            efectivo_declarado,
            diferencia,
            cierre_pdf_path,
            caja_id
        ],
    )?;

    Ok(diferencia)
}

/// Lista los movimientos de una caja (excluye los VENTA para no ensuciar; esos
/// ya están en el resumen). Se pueden incluir todos si `incluir_ventas = true`.
pub fn listar_movimientos(
    conn: &Connection,
    caja_id: i64,
    incluir_ventas: bool,
) -> Result<Vec<MovimientoCaja>, DbError> {
    let filtro = if incluir_ventas {
        ""
    } else {
        " AND m.tipo <> 'VENTA'"
    };
    let sql = format!(
        "SELECT m.id, m.fecha, m.tipo, m.metodo_pago, m.monto, m.motivo,
                m.usuario_id, u.nombre_completo
         FROM movimientos_caja m
         LEFT JOIN usuarios u ON u.id = m.usuario_id
         WHERE m.caja_id = ?1{filtro}
         ORDER BY m.fecha DESC, m.id DESC
         LIMIT 500",
    );
    let mut stmt = conn.prepare(&sql)?;
    let filas = stmt.query_map(params![caja_id], |row| {
        Ok(MovimientoCaja {
            id: row.get(0)?,
            fecha: row.get(1)?,
            tipo: row.get(2)?,
            metodo_pago: row.get(3)?,
            monto: row.get(4)?,
            motivo: row.get(5)?,
            usuario_id: row.get(6)?,
            usuario_nombre: row.get(7)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

/// Lista las últimas cajas cerradas (para histórico).
pub fn listar_cierres_anteriores(
    conn: &Connection,
    limite: i64,
) -> Result<Vec<CierreAnterior>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.fecha_apertura, c.fecha_cierre, c.monto_apertura,
                c.efectivo_esperado, c.efectivo_declarado, c.diferencia,
                c.usuario_apertura_id, ua.nombre_completo,
                c.usuario_cierre_id, uc.nombre_completo
         FROM cajas c
         LEFT JOIN usuarios ua ON ua.id = c.usuario_apertura_id
         LEFT JOIN usuarios uc ON uc.id = c.usuario_cierre_id
         WHERE c.estado = 'CERRADA'
         ORDER BY c.fecha_cierre DESC
         LIMIT ?1",
    )?;
    let filas = stmt.query_map(params![limite], |row| {
        Ok(CierreAnterior {
            id: row.get(0)?,
            fecha_apertura: row.get(1)?,
            fecha_cierre: row.get(2)?,
            monto_apertura: row.get(3)?,
            efectivo_esperado: row.get(4)?,
            efectivo_declarado: row.get(5)?,
            diferencia: row.get(6)?,
            usuario_apertura_id: row.get(7)?,
            usuario_apertura_nombre: row.get(8)?,
            usuario_cierre_id: row.get(9)?,
            usuario_cierre_nombre: row.get(10)?,
        })
    })?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}