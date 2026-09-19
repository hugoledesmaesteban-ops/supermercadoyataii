//! Cifrado local de secretos (access token de Mercado Pago).
//!
//! El token NUNCA se guarda en texto plano en `mercado.db`. Se cifra con
//! AES-256-GCM usando una clave que se genera una sola vez (al azar) y se
//! guarda en un archivo separado (`secreto.key`), nunca dentro de la base
//! de datos ni en el código fuente. Si alguien copia solo `mercado.db`
//! (por ejemplo, un backup), el token queda inútil sin ese archivo.

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::{engine::general_purpose::STANDARD, Engine};
use rand::RngCore;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SeguridadError {
    #[error("error de archivo: {0}")]
    Io(#[from] std::io::Error),
    #[error("error de cifrado")]
    Cifrado,
    #[error("dato cifrado con formato inválido")]
    FormatoInvalido,
}

fn ruta_clave(dir_datos_app: &Path) -> PathBuf {
    dir_datos_app.join("secreto.key")
}

fn rellenar_aleatorio(buf: &mut [u8]) {
    rand::rngs::OsRng.fill_bytes(buf);
}

fn generar_o_cargar_clave(dir_datos_app: &Path) -> Result<[u8; 32], SeguridadError> {
    let ruta = ruta_clave(dir_datos_app);

    if let Ok(bytes) = std::fs::read(&ruta) {
        if bytes.len() == 32 {
            let mut clave = [0u8; 32];
            clave.copy_from_slice(&bytes);
            return Ok(clave);
        }
    }

    std::fs::create_dir_all(dir_datos_app)?;
    let mut clave = [0u8; 32];
    rellenar_aleatorio(&mut clave);
    std::fs::write(&ruta, clave)?;
    Ok(clave)
}

/// Cifra un texto (ej. el access token) y devuelve un string base64 listo
/// para guardar en la tabla `configuracion`.
pub fn cifrar(dir_datos_app: &Path, texto_plano: &str) -> Result<String, SeguridadError> {
    let clave = generar_o_cargar_clave(dir_datos_app)?;
    let cipher = Aes256Gcm::new_from_slice(&clave).map_err(|_| SeguridadError::Cifrado)?;

    let mut nonce_bytes = [0u8; 12];
    rellenar_aleatorio(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, texto_plano.as_bytes())
        .map_err(|_| SeguridadError::Cifrado)?;

    let mut blob = nonce_bytes.to_vec();
    blob.extend_from_slice(&ciphertext);
    Ok(STANDARD.encode(blob))
}

/// Descifra un valor generado por `cifrar`.
pub fn descifrar(dir_datos_app: &Path, valor_cifrado: &str) -> Result<String, SeguridadError> {
    let clave = generar_o_cargar_clave(dir_datos_app)?;
    let cipher = Aes256Gcm::new_from_slice(&clave).map_err(|_| SeguridadError::Cifrado)?;

    let blob = STANDARD
        .decode(valor_cifrado)
        .map_err(|_| SeguridadError::FormatoInvalido)?;
    if blob.len() < 12 {
        return Err(SeguridadError::FormatoInvalido);
    }
    let (nonce_bytes, ciphertext) = blob.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let texto_plano = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| SeguridadError::Cifrado)?;

    String::from_utf8(texto_plano).map_err(|_| SeguridadError::FormatoInvalido)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cifrar_y_descifrar_devuelve_el_texto_original() {
        let dir = std::env::temp_dir().join(format!("mmg_seg_{}", uuid::Uuid::new_v4()));
        let cifrado = cifrar(&dir, "APP_USR-1234-token-secreto").unwrap();
        assert_ne!(cifrado, "APP_USR-1234-token-secreto");
        let descifrado = descifrar(&dir, &cifrado).unwrap();
        assert_eq!(descifrado, "APP_USR-1234-token-secreto");
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn cada_cifrado_produce_un_resultado_distinto_aunque_el_texto_sea_igual() {
        let dir = std::env::temp_dir().join(format!("mmg_seg_{}", uuid::Uuid::new_v4()));
        let a = cifrar(&dir, "mismo-texto").unwrap();
        let b = cifrar(&dir, "mismo-texto").unwrap();
        assert_ne!(a, b);
        std::fs::remove_dir_all(&dir).ok();
    }
}