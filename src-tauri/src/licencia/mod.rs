//! Módulo de licencia (Fase 13, secciones 38-44 del prompt).
//!
//! Reglas duras que este módulo implementa:
//! 1. Con Internet: se verifica siempre contra Supabase y esa verificación
//!    manda (secciones 40, 43).
//! 2. Sin Internet: se usa la última verificación local, pero solo dentro
//!    de una ventana de gracia de 7 días (sección 42). Pasada esa ventana,
//!    el sistema debe bloquear ventas hasta poder verificar de nuevo.
//! 3. El registro local de licencia lleva un hash de integridad para
//!    detectar edición manual de la tabla `licencias_local` (sección 43).
//!    Esto no reemplaza una verificación online real — es "tamper evidence"
//!    para saber que hay que forzar una reverificación, no un mecanismo de
//!    seguridad criptográfica fuerte contra alguien con acceso al binario.

pub mod config;

use crate::database::DbError;
use chrono::{DateTime, Duration, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

const VENTANA_GRACIA_DIAS: i64 = 7;
/// Secreto embebido en el binario, usado solo para detectar ediciones
/// manuales del registro local. No es (ni pretende ser) un secreto de
/// Supabase — ver la nota de `config.rs`.
const SECRETO_INTEGRIDAD: &str = "mini-mercado-goya-integridad-v1";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenciaRemota {
    pub cliente_id: String,
    pub nombre_comercio: Option<String>,
    pub activo: bool,
    pub valido_hasta: Option<String>, // fecha ISO
    pub deuda: Option<f64>,
    pub mensaje_soporte: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum EstadoLicencia {
    Activa { dias_restantes: Option<i64> },
    Vencida,
    Desactivada { mensaje_soporte: Option<String> },
    /// Sin verificación local previa: no se puede operar (primer inicio sin Internet).
    SinDatos,
}

/// Consulta la tabla `licencias` en Supabase usando la REST API (PostgREST)
/// con la `anon key` pública. Nunca usa la service role key (sección 58).
pub fn verificar_online(
    supabase_url: &str,
    supabase_anon_key: &str,
    cliente_id: &str,
) -> Result<LicenciaRemota, reqwest::Error> {
    let url = format!(
        "{supabase_url}/rest/v1/licencias?cliente_id=eq.{cliente_id}&select=*"
    );

    let cliente = reqwest::blocking::Client::new();
    let respuesta: Vec<LicenciaRemota> = cliente
        .get(&url)
        .header("apikey", supabase_anon_key)
        .header("Authorization", format!("Bearer {supabase_anon_key}"))
        .send()?
        .json()?;

    Ok(respuesta.into_iter().next().unwrap_or(LicenciaRemota {
        cliente_id: cliente_id.to_string(),
        nombre_comercio: None,
        activo: false,
        valido_hasta: None,
        deuda: None,
        mensaje_soporte: Some("No se encontró una licencia para este cliente_id.".to_string()),
    }))
}

fn calcular_hash(l: &LicenciaRemota, ultima_verificacion: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(SECRETO_INTEGRIDAD.as_bytes());
    hasher.update(l.cliente_id.as_bytes());
    hasher.update([l.activo as u8]);
    hasher.update(l.valido_hasta.as_deref().unwrap_or("").as_bytes());
    hasher.update(ultima_verificacion.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Guarda el resultado de una verificación online como la nueva "verdad"
/// local (sección 40, paso 6-7).
pub fn guardar_verificacion(conn: &Connection, licencia: &LicenciaRemota) -> Result<(), DbError> {
    let ahora = Utc::now().to_rfc3339();
    let hash = calcular_hash(licencia, &ahora);

    conn.execute(
        "INSERT INTO licencias_local (
            id, cliente_id, activo, valido_hasta, deuda, mensaje_soporte,
            ultima_verificacion, hash_integridad
        ) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(id) DO UPDATE SET
            cliente_id = excluded.cliente_id,
            activo = excluded.activo,
            valido_hasta = excluded.valido_hasta,
            deuda = excluded.deuda,
            mensaje_soporte = excluded.mensaje_soporte,
            ultima_verificacion = excluded.ultima_verificacion,
            hash_integridad = excluded.hash_integridad",
        params![
            licencia.cliente_id,
            licencia.activo,
            licencia.valido_hasta,
            licencia.deuda,
            licencia.mensaje_soporte,
            ahora,
            hash
        ],
    )?;
    Ok(())
}

struct RegistroLocal {
    licencia: LicenciaRemota,
    ultima_verificacion: String,
    hash_guardado: String,
}

fn leer_registro_local(conn: &Connection) -> Result<Option<RegistroLocal>, DbError> {
    conn.query_row(
        "SELECT cliente_id, activo, valido_hasta, deuda, mensaje_soporte,
                ultima_verificacion, hash_integridad
         FROM licencias_local WHERE id = 1",
        [],
        |row| {
            Ok(RegistroLocal {
                licencia: LicenciaRemota {
                    cliente_id: row.get(0)?,
                    nombre_comercio: None,
                    activo: row.get::<_, i64>(1)? != 0,
                    valido_hasta: row.get(2)?,
                    deuda: row.get(3)?,
                    mensaje_soporte: row.get(4)?,
                },
                ultima_verificacion: row.get(5)?,
                hash_guardado: row.get(6)?,
            })
        },
    )
    .optional()
    .map_err(DbError::from)
}

/// Evalúa el estado de licencia a partir de LO QUE HAYA LOCAL, aplicando la
/// ventana de gracia de 7 días (sección 42). El llamador (capa de comando)
/// decide primero si intentar `verificar_online`; si esa verificación tuvo
/// éxito, debe llamar a `guardar_verificacion` antes de esto. Esta función
/// es el fallback: "¿puedo operar con lo que tengo guardado?"
pub fn evaluar_estado_local(conn: &Connection) -> Result<EstadoLicencia, DbError> {
    let registro = match leer_registro_local(conn)? {
        Some(r) => r,
        None => return Ok(EstadoLicencia::SinDatos),
    };

    let hash_esperado = calcular_hash(&registro.licencia, &registro.ultima_verificacion);
    if hash_esperado != registro.hash_guardado {
        log::warn!(
            "Detectada manipulación del registro de licencia local (cliente_id={})",
            registro.licencia.cliente_id
        );
        // Sección 43: manipulación detectada -> no confiar en el registro,
        // tratar como si no hubiera datos válidos (fuerza reverificación online).
        return Ok(EstadoLicencia::SinDatos);
    }

    if !registro.licencia.activo {
        return Ok(EstadoLicencia::Desactivada {
            mensaje_soporte: registro.licencia.mensaje_soporte.clone(),
        });
    }

    let ultima_verificacion: DateTime<Utc> = registro
        .ultima_verificacion
        .parse()
        .unwrap_or_else(|_| Utc::now());
    let dentro_de_gracia = Utc::now() - ultima_verificacion < Duration::days(VENTANA_GRACIA_DIAS);

    if let Some(valido_hasta_str) = &registro.licencia.valido_hasta {
        if let Ok(valido_hasta) = valido_hasta_str.parse::<DateTime<Utc>>() {
            if Utc::now() > valido_hasta {
                return Ok(EstadoLicencia::Vencida);
            }
        }
    }

    if dentro_de_gracia {
        let dias_restantes = registro
            .licencia
            .valido_hasta
            .as_deref()
            .and_then(|v| v.parse::<DateTime<Utc>>().ok())
            .map(|fecha| (fecha - Utc::now()).num_days());
        Ok(EstadoLicencia::Activa { dias_restantes })
    } else {
        // Pasaron más de 7 días sin poder verificar online: no se puede
        // seguir operando con esta copia local (sección 42).
        Ok(EstadoLicencia::Desactivada {
            mensaje_soporte: Some(
                "No se pudo verificar la licencia en los últimos 7 días. Conecte Internet."
                    .to_string(),
            ),
        })
    }
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

    fn licencia_activa() -> LicenciaRemota {
        LicenciaRemota {
            cliente_id: "GOYA-000001".into(),
            nombre_comercio: Some("Mini Mercado Goya".into()),
            activo: true,
            valido_hasta: Some((Utc::now() + Duration::days(90)).to_rfc3339()),
            deuda: Some(0.0),
            mensaje_soporte: None,
        }
    }

    #[test]
    fn licencia_activa_recien_verificada_permite_operar() {
        let conn = conn_de_prueba();
        guardar_verificacion(&conn, &licencia_activa()).unwrap();

        let estado = evaluar_estado_local(&conn).unwrap();
        matches!(estado, EstadoLicencia::Activa { .. })
            .then_some(())
            .expect("debería estar activa");
    }

    #[test]
    fn licencia_desactivada_bloquea_aunque_sea_reciente() {
        let conn = conn_de_prueba();
        let mut licencia = licencia_activa();
        licencia.activo = false;
        licencia.mensaje_soporte = Some("Cuenta con deuda pendiente.".into());
        guardar_verificacion(&conn, &licencia).unwrap();

        let estado = evaluar_estado_local(&conn).unwrap();
        assert_eq!(
            estado,
            EstadoLicencia::Desactivada {
                mensaje_soporte: Some("Cuenta con deuda pendiente.".into())
            }
        );
    }

    #[test]
    fn manipulacion_del_registro_local_se_detecta() {
        let conn = conn_de_prueba();
        guardar_verificacion(&conn, &licencia_activa()).unwrap();

        // Alguien edita `activo` directamente en la base sin pasar por guardar_verificacion.
        conn.execute("UPDATE licencias_local SET activo = 0 WHERE id = 1", [])
            .unwrap();
        // También podría intentar "reactivarse" editando el campo:
        conn.execute("UPDATE licencias_local SET activo = 1 WHERE id = 1", [])
            .unwrap();

        // El hash ya no corresponde al contenido real -> se trata como SinDatos,
        // forzando una reverificación online real.
        let estado = evaluar_estado_local(&conn).unwrap();
        assert_eq!(estado, EstadoLicencia::SinDatos);
    }

    #[test]
    fn fuera_de_la_ventana_de_gracia_bloquea() {
        let conn = conn_de_prueba();
        let licencia = licencia_activa();
        let ahora = Utc::now();
        let hace_diez_dias = (ahora - Duration::days(10)).to_rfc3339();
        let hash = calcular_hash(&licencia, &hace_diez_dias);

        conn.execute(
            "INSERT INTO licencias_local (id, cliente_id, activo, valido_hasta, deuda, mensaje_soporte, ultima_verificacion, hash_integridad)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                licencia.cliente_id, licencia.activo, licencia.valido_hasta,
                licencia.deuda, licencia.mensaje_soporte, hace_diez_dias, hash
            ],
        ).unwrap();

        let estado = evaluar_estado_local(&conn).unwrap();
        matches!(estado, EstadoLicencia::Desactivada { .. })
            .then_some(())
            .expect("pasados 7 días sin verificar, debe bloquear");
    }

    #[test]
    fn dentro_de_la_ventana_de_gracia_permite_operar() {
        let conn = conn_de_prueba();
        let licencia = licencia_activa();
        let ahora = Utc::now();
        let hace_tres_dias = (ahora - Duration::days(3)).to_rfc3339();
        let hash = calcular_hash(&licencia, &hace_tres_dias);

        conn.execute(
            "INSERT INTO licencias_local (id, cliente_id, activo, valido_hasta, deuda, mensaje_soporte, ultima_verificacion, hash_integridad)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                licencia.cliente_id, licencia.activo, licencia.valido_hasta,
                licencia.deuda, licencia.mensaje_soporte, hace_tres_dias, hash
            ],
        ).unwrap();

        let estado = evaluar_estado_local(&conn).unwrap();
        matches!(estado, EstadoLicencia::Activa { .. })
            .then_some(())
            .expect("dentro de los 7 días de gracia, debe permitir operar");
    }
}

// ============================================================
// Licencia simple offline: botón "Activar 30 días"
// ============================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct EstadoLicenciaSimple {
    pub activa: bool,
    pub vence_en: String,
    pub dias_restantes: i64,
    pub por_vencer: bool,
    pub horas_desde_ultima_activacion: i64,
}

pub const USUARIO_SOPORTE: &str = "hlsistemas";
const DIAS_AVISO: i64 = 5;

/// Lee el estado actual de la licencia simple.
pub fn estado_licencia_simple(conn: &Connection) -> Result<EstadoLicenciaSimple, DbError> {
    let (vence_en, activada_en): (String, String) = conn.query_row(
        "SELECT vence_en, activada_en FROM licencia_local WHERE id = 1",
        [],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;

    let vence = vence_en.parse::<DateTime<Utc>>()
        .unwrap_or_else(|_| Utc::now() - Duration::days(1));
    let activacion = activada_en.parse::<DateTime<Utc>>()
        .unwrap_or_else(|_| Utc::now());

    let ahora = Utc::now();
    let dias_restantes = (vence - ahora).num_days();
    let activa = dias_restantes >= 0;
    let por_vencer = activa && dias_restantes <= DIAS_AVISO;
    let horas_desde_ultima = (ahora - activacion).num_hours();

    Ok(EstadoLicenciaSimple {
        activa,
        vence_en,
        dias_restantes,
        por_vencer,
        horas_desde_ultima_activacion: horas_desde_ultima,
    })
}

/// Activa 30 días más. SOLO funciona si `usuario_nombre == USUARIO_SOPORTE`.
/// Suma los 30 días al vencimiento actual (o desde hoy si ya venció).
pub fn activar_licencia_30_dias(
    conn: &Connection,
    usuario_nombre: &str,
) -> Result<String, DbError> {
    if usuario_nombre != USUARIO_SOPORTE {
        return Err(DbError::Negocio(
            "Solo HL Sistemas puede activar la licencia.".into(),
        ));
    }

    let vence_actual: String = conn.query_row(
        "SELECT vence_en FROM licencia_local WHERE id = 1",
        [],
        |r| r.get(0),
    )?;

    let base = vence_actual.parse::<DateTime<Utc>>()
        .unwrap_or_else(|_| Utc::now());
    let ahora = Utc::now();
    let desde = if base > ahora { base } else { ahora };
    let nuevo_vence = desde + Duration::days(30);

    conn.execute(
        "UPDATE licencia_local
         SET vence_en = ?1, activada_en = ?2, activada_por = ?3
         WHERE id = 1",
        params![nuevo_vence.to_rfc3339(), ahora.to_rfc3339(), usuario_nombre],
    )?;

    Ok(nuevo_vence.to_rfc3339())
}
