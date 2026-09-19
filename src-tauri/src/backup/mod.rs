//! Backup local (Fase 14, sección 48). Copia física de `mercado.db` — no
//! hay nada que "simular" acá, es un `std::fs::copy` real más el registro
//! correspondiente en la tabla `backups` para que la sección de Soporte
//! (sección 45) pueda mostrar cuándo fue el último backup.

use chrono::Local;
use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum BackupError {
    #[error("error de archivo: {0}")]
    Io(#[from] std::io::Error),
    #[error("error de base de datos: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("no se encontró el backup solicitado")]
    NoEncontrado,
}

fn dir_backups(dir_datos_app: &Path) -> PathBuf {
    dir_datos_app.join("backups")
}

/// Sección 48: botón [CREAR BACKUP]. Nombre con fecha y hora legible:
/// `backup_2026-09-11_2030.db`.
pub fn crear_backup(
    conn: &Connection,
    dir_datos_app: &Path,
    usuario_id: Option<i64>,
    tipo: &str, // "MANUAL" | "AUTOMATICO_PRE_RESTAURACION" | "PROGRAMADO"
) -> Result<PathBuf, BackupError> {
    let ruta_db = dir_datos_app.join("mercado.db");
    let carpeta = dir_backups(dir_datos_app);
    std::fs::create_dir_all(&carpeta)?;

    let nombre = format!("backup_{}.db", Local::now().format("%Y-%m-%d_%H%M"));
    let destino = carpeta.join(&nombre);

    std::fs::copy(&ruta_db, &destino)?;

    conn.execute(
        "INSERT INTO backups (archivo, ruta, tipo, usuario_id) VALUES (?1, ?2, ?3, ?4)",
        params![nombre, destino.to_string_lossy(), tipo, usuario_id],
    )?;

    Ok(destino)
}

/// Sección 48: "Antes de restaurar: crear backup de seguridad automático."
/// Restaurar reemplaza `mercado.db` por el contenido del backup elegido.
/// IMPORTANTE: esto requiere que ninguna conexión del pool esté escribiendo
/// en ese momento; la capa de comando debe cerrar/recrear el pool alrededor
/// de esta llamada (no se resuelve acá para no acoplar este módulo a Tauri).
pub fn restaurar_backup(
    conn: &Connection,
    dir_datos_app: &Path,
    ruta_backup: &Path,
    usuario_id: Option<i64>,
) -> Result<(), BackupError> {
    if !ruta_backup.exists() {
        return Err(BackupError::NoEncontrado);
    }

    // Backup de seguridad automático antes de tocar nada.
    crear_backup(conn, dir_datos_app, usuario_id, "AUTOMATICO_PRE_RESTAURACION")?;

    let ruta_db = dir_datos_app.join("mercado.db");
    std::fs::copy(ruta_backup, &ruta_db)?;

    Ok(())
}

pub fn listar_backups(conn: &Connection) -> Result<Vec<String>, BackupError> {
    let mut stmt = conn.prepare("SELECT archivo FROM backups ORDER BY fecha DESC")?;
    let filas = stmt.query_map([], |row| row.get::<_, String>(0))?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn conn_de_prueba() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crate::database::aplicar_migraciones(&conn).unwrap();
        conn
    }

    #[test]
    fn crear_backup_copia_el_archivo_real_y_registra_en_la_tabla() {
        let dir_temporal = std::env::temp_dir().join(format!("mmg_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir_temporal).unwrap();
        fs::write(dir_temporal.join("mercado.db"), b"contenido de prueba de la base").unwrap();

        let conn = conn_de_prueba();
        let destino = crear_backup(&conn, &dir_temporal, None, "MANUAL").unwrap();

        assert!(destino.exists());
        assert_eq!(fs::read(&destino).unwrap(), b"contenido de prueba de la base");

        let backups = listar_backups(&conn).unwrap();
        assert_eq!(backups.len(), 1);

        fs::remove_dir_all(&dir_temporal).ok();
    }

    #[test]
    fn restaurar_crea_backup_de_seguridad_antes_de_sobrescribir() {
        let dir_temporal = std::env::temp_dir().join(format!("mmg_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir_temporal).unwrap();
        fs::write(dir_temporal.join("mercado.db"), b"version actual").unwrap();

        let conn = conn_de_prueba();
        // Backup viejo que se va a restaurar.
        let backup_viejo = dir_temporal.join("backups").join("backup_viejo.db");
        fs::create_dir_all(backup_viejo.parent().unwrap()).unwrap();
        fs::write(&backup_viejo, b"version anterior").unwrap();

        restaurar_backup(&conn, &dir_temporal, &backup_viejo, None).unwrap();

        // mercado.db ahora debe tener el contenido restaurado...
        assert_eq!(
            fs::read(dir_temporal.join("mercado.db")).unwrap(),
            b"version anterior"
        );
        // ...y debe existir un backup de seguridad con la versión anterior a la restauración.
        let backups = listar_backups(&conn).unwrap();
        assert_eq!(backups.len(), 1);

        fs::remove_dir_all(&dir_temporal).ok();
    }
}
