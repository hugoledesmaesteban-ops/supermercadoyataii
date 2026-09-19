//! Actualizador seguro (sección 46-47 del prompt).
//!
//! Flujo real implementado acá:
//! 1. `verificar_actualizacion_disponible`: descarga `version.txt` desde el
//!    servidor/Storage configurado y la compara contra la versión instalada.
//! 2. `descargar_actualizacion`: descarga el instalador a un archivo temporal.
//! 3. `verificar_integridad`: compara el SHA-256 del archivo descargado
//!    contra un hash esperado (publicado junto al instalador) — si no
//!    coincide, el archivo se descarta y NUNCA se ejecuta.
//! 4. `lanzar_actualizador_y_salir`: delega el reemplazo del ejecutable a un
//!    proceso externo (`scripts/actualizador.ps1`, sección 47: "no
//!    reemplazar el ejecutable directamente mientras está ejecutándose") y
//!    cierra el POS.
//!
//! Este módulo asume un backend HTTP simple sirviendo `version.txt`,
//! `instalador.exe` y `instalador.exe.sha256` (por ejemplo, Supabase
//! Storage con esos tres archivos). No asume nada del protocolo de
//! Supabase más allá de "es una URL https que devuelve esos archivos".

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::Write;
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum UpdaterError {
    #[error("error de red: {0}")]
    Red(#[from] reqwest::Error),
    #[error("error de archivo: {0}")]
    Io(#[from] std::io::Error),
    #[error("la integridad del archivo descargado no coincide con el hash esperado")]
    IntegridadInvalida,
    #[error("no se pudo lanzar el actualizador externo: {0}")]
    NoSePudoLanzar(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InfoActualizacion {
    pub version_actual: String,
    pub version_remota: String,
    pub hay_actualizacion: bool,
}

/// Compara dos versiones estilo semver simple ("1.0.0"). No usa el crate
/// `semver` para no agregar una dependencia más solo para esto; el formato
/// que pide la sección 46 es siempre `X.Y.Z` numérico.
pub fn hay_version_mas_nueva(actual: &str, remota: &str) -> bool {
    fn partes(v: &str) -> Vec<u32> {
        v.trim()
            .split('.')
            .map(|p| p.parse::<u32>().unwrap_or(0))
            .collect()
    }
    let (a, r) = (partes(actual), partes(remota));
    for i in 0..a.len().max(r.len()) {
        let va = a.get(i).copied().unwrap_or(0);
        let vr = r.get(i).copied().unwrap_or(0);
        if vr > va {
            return true;
        }
        if vr < va {
            return false;
        }
    }
    false
}

pub fn verificar_actualizacion_disponible(
    url_version_txt: &str,
    version_actual: &str,
) -> Result<InfoActualizacion, UpdaterError> {
    let version_remota = reqwest::blocking::get(url_version_txt)?
        .text()?
        .trim()
        .to_string();

    Ok(InfoActualizacion {
        hay_actualizacion: hay_version_mas_nueva(version_actual, &version_remota),
        version_actual: version_actual.to_string(),
        version_remota,
    })
}

pub fn descargar_actualizacion(url_instalador: &str, destino: &Path) -> Result<(), UpdaterError> {
    let bytes = reqwest::blocking::get(url_instalador)?.bytes()?;
    let mut archivo = std::fs::File::create(destino)?;
    archivo.write_all(&bytes)?;
    Ok(())
}

fn sha256_de_archivo(ruta: &Path) -> Result<String, UpdaterError> {
    let contenido = std::fs::read(ruta)?;
    let mut hasher = Sha256::new();
    hasher.update(&contenido);
    Ok(format!("{:x}", hasher.finalize()))
}

/// Sección 47: "Verificar integridad del archivo descargado. No ejecutar
/// archivos descargados si la validación falla."
pub fn verificar_integridad(ruta_instalador: &Path, sha256_esperado: &str) -> Result<(), UpdaterError> {
    let hash_real = sha256_de_archivo(ruta_instalador)?;
    if hash_real.eq_ignore_ascii_case(sha256_esperado.trim()) {
        Ok(())
    } else {
        // Descartar el archivo no verificado en vez de dejarlo tirado.
        std::fs::remove_file(ruta_instalador).ok();
        Err(UpdaterError::IntegridadInvalida)
    }
}

/// Lanza el script updater externo (`scripts/actualizador.ps1`) y termina
/// el proceso actual. El script espera a que el POS cierre, corre el
/// instalador de forma silenciosa, y vuelve a abrir el POS — nunca se
/// sobreescribe el .exe mientras está corriendo (sección 47).
pub fn lanzar_actualizador_y_salir(
    ruta_script_actualizador: &Path,
    ruta_instalador: &Path,
    ruta_exe_pos: &Path,
) -> Result<(), UpdaterError> {
    std::process::Command::new("powershell")
        .args([
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &ruta_script_actualizador.to_string_lossy(),
            "-Instalador",
            &ruta_instalador.to_string_lossy(),
            "-AppPath",
            &ruta_exe_pos.to_string_lossy(),
        ])
        .spawn()
        .map_err(|e| UpdaterError::NoSePudoLanzar(e.to_string()))?;

    std::process::exit(0);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn detecta_version_mas_nueva_por_patch() {
        assert!(hay_version_mas_nueva("1.0.0", "1.0.1"));
        assert!(!hay_version_mas_nueva("1.0.1", "1.0.0"));
    }

    #[test]
    fn detecta_version_mas_nueva_por_minor_aunque_el_patch_sea_menor() {
        assert!(hay_version_mas_nueva("1.5.9", "1.6.0"));
    }

    #[test]
    fn versiones_iguales_no_disparan_actualizacion() {
        assert!(!hay_version_mas_nueva("1.2.3", "1.2.3"));
    }

    #[test]
    fn verificar_integridad_acepta_hash_correcto() {
        let ruta = std::env::temp_dir().join(format!("mmg_upd_{}.bin", uuid::Uuid::new_v4()));
        fs::write(&ruta, b"contenido del instalador").unwrap();
        let hash_correcto = sha256_de_archivo(&ruta).unwrap();

        assert!(verificar_integridad(&ruta, &hash_correcto).is_ok());
        fs::remove_file(&ruta).ok();
    }

    #[test]
    fn verificar_integridad_rechaza_y_borra_archivo_con_hash_incorrecto() {
        let ruta = std::env::temp_dir().join(format!("mmg_upd_{}.bin", uuid::Uuid::new_v4()));
        fs::write(&ruta, b"contenido del instalador").unwrap();

        let resultado = verificar_integridad(&ruta, "hash-incorrecto-a-proposito");
        assert!(matches!(resultado, Err(UpdaterError::IntegridadInvalida)));
        assert!(!ruta.exists(), "el archivo no verificado debe borrarse, nunca ejecutarse");
    }
}

