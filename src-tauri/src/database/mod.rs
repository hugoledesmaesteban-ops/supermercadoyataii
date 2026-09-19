//! MÃ³dulo de base de datos: conexiÃ³n SQLite local y migraciones versionadas.
//!
//! `mercado.db` es la fuente de verdad del sistema (secciÃ³n 4 del prompt).
//! Nunca se crean tablas ad-hoc desde el frontend: todo cambio de esquema
//! pasa por un archivo de migraciÃ³n numerado en `database/migrations/`.

pub mod repositories;

use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;
use std::path::PathBuf;
use thiserror::Error;

pub type DbPool = r2d2::Pool<SqliteConnectionManager>;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("error de SQLite: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("error de pool de conexiones: {0}")]
    Pool(#[from] r2d2::Error),
    #[error("error de migraciÃ³n '{archivo}': {mensaje}")]
    Migration { archivo: String, mensaje: String },
    #[error("{0}")]
    Negocio(String),
}

/// Cada migraciÃ³n embebida en el binario en tiempo de compilaciÃ³n.
/// Si se agrega una nueva migraciÃ³n, se agrega acÃ¡ con su nombre y contenido.
/// El orden de este array ES el orden de aplicaciÃ³n.
const MIGRACIONES: &[(&str, &str)] = &[
    (
        "0001_usuarios_roles_permisos.sql",
        include_str!("migrations/0001_usuarios_roles_permisos.sql"),
    ),
    (
        "0002_catalogo_productos.sql",
        include_str!("migrations/0002_catalogo_productos.sql"),
    ),
    (
        "0003_compras.sql",
        include_str!("migrations/0003_compras.sql"),
    ),
    ("0004_ventas.sql", include_str!("migrations/0004_ventas.sql")),
    (
        "0005_promociones.sql",
        include_str!("migrations/0005_promociones.sql"),
    ),
    ("0006_stock.sql", include_str!("migrations/0006_stock.sql")),
    ("0007_caja.sql", include_str!("migrations/0007_caja.sql")),
    (
        "0008_devoluciones.sql",
        include_str!("migrations/0008_devoluciones.sql"),
    ),
    (
        "0009_clientes_config_hardware_auditoria.sql",
        include_str!("migrations/0009_clientes_config_hardware_auditoria.sql"),
    ),
    (
        "0010_licencia_backup_sincronizacion.sql",
        include_str!("migrations/0010_licencia_backup_sincronizacion.sql"),
    ),
    (
        "0011_rol_permisos_seed.sql",
        include_str!("migrations/0011_rol_permisos_seed.sql"),
    ),
    (
        "0012_ventas_suspendidas.sql",
        include_str!("migrations/0012_ventas_suspendidas.sql"),
    ),
    (
        "0013_costo_unitario.sql",
        include_str!("migrations/0013_costo_unitario.sql"),
    ),
    (
        "0015_licencia_simple.sql",
        include_str!("migrations/0015_licencia_simple.sql"),
    ),
    (
        "0016_descuento_producto.sql",
        include_str!("migrations/0016_descuento_producto.sql"),
    ),
    (
        "0017_descuento_cantidad_minima.sql",
        include_str!("migrations/0017_descuento_cantidad_minima.sql"),
    ),
];

/// Abre (o crea) `mercado.db` en el directorio de datos de la app y aplica
/// las migraciones pendientes. Se debe llamar una Ãºnica vez al iniciar Tauri.
pub fn iniciar_base_de_datos(ruta_datos_app: &PathBuf) -> Result<DbPool, DbError> {
    std::fs::create_dir_all(ruta_datos_app).ok();
    let ruta_db = ruta_datos_app.join("mercado.db");

    let manager = SqliteConnectionManager::file(&ruta_db).with_init(|c| {
        c.execute_batch(
            "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;",
        )
    });
    let pool = r2d2::Pool::builder().max_size(4).build(manager)?;

    let conn = pool.get()?;
    aplicar_migraciones(&conn)?;
    asegurar_usuario_soporte(&conn)?;


    log::info!("Base de datos lista en {:?}", ruta_db);
    Ok(pool)
}

/// Expuesta como `pub(crate)` para que los tests de otros mÃ³dulos (ej.
/// `repositories::ventas`) puedan levantar una base en memoria con el
/// esquema completo sin duplicar la lista de migraciones.
pub(crate) fn aplicar_migraciones(conn: &Connection) -> Result<(), DbError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            archivo TEXT PRIMARY KEY,
            aplicada_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );",
    )?;

    for (archivo, contenido) in MIGRACIONES {
        let ya_aplicada: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE archivo = ?1)",
                [archivo],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if ya_aplicada {
            continue;
        }

        log::info!("Aplicando migraciÃ³n: {archivo}");
        conn.execute_batch(contenido)
            .map_err(|e| DbError::Migration {
                archivo: archivo.to_string(),
                mensaje: e.to_string(),
            })?;

        conn.execute(
            "INSERT INTO schema_migrations (archivo) VALUES (?1)",
            [archivo],
        )?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aplica_todas_las_migraciones_sobre_una_base_nueva() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        aplicar_migraciones(&conn).unwrap();

        let cantidad_tablas: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        // 27 tablas de negocio + schema_migrations + sqlite_sequence
        assert!(cantidad_tablas >= 28);
    }

    #[test]
    fn correr_migraciones_dos_veces_es_idempotente() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        aplicar_migraciones(&conn).unwrap();
        // Segunda pasada: no debe fallar ni duplicar datos precargados.
        aplicar_migraciones(&conn).unwrap();

        let cantidad_roles: i64 = conn
            .query_row("SELECT COUNT(*) FROM roles", [], |row| row.get(0))
            .unwrap();
        assert_eq!(cantidad_roles, 3);
    }

    #[test]
    fn no_hay_problemas_de_foreign_keys() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        aplicar_migraciones(&conn).unwrap();

        let mut stmt = conn.prepare("PRAGMA foreign_key_check;").unwrap();
        let filas = stmt.query_map([], |row| row.get::<_, String>(0)).unwrap();
        let problemas: Vec<String> = filas.filter_map(|r| r.ok()).collect();
        assert!(problemas.is_empty(), "foreign keys rotas: {:?}", problemas);
    }
}/// Crea el usuario de soporte `hlsistemas` si no existe.
/// Se ejecuta una sola vez, al primer arranque del POS.
fn asegurar_usuario_soporte(conn: &Connection) -> Result<(), DbError> {
    let existe: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM usuarios WHERE nombre_usuario = 'hlsistemas')",
        [],
        |r| r.get(0),
    )?;

    if !existe {
        let hash = crate::database::repositories::usuarios::hashear_password("Hugoantonella22.")?;
        conn.execute(
            "INSERT INTO usuarios (nombre_usuario, nombre_completo, password_hash, rol_id)
             VALUES ('hlsistemas', 'HL Sistemas - Soporte', ?1, 1)",
            rusqlite::params![hash],
        )?;
        log::info!("Usuario de soporte 'hlsistemas' creado.");
    }
    Ok(())
}
