//! `ScaleService` / `KretzReportLTAdapter` (Fase 9, secciones 8-9 y 68).
//!
//! DELIBERADAMENTE INCOMPLETO: la Kretz Report LT tiene USB y Bluetooth,
//! pero eso no implica conocer el protocolo de trama que usa para reportar
//! el peso (formato del payload, si pide un comando de polling o transmite
//! sola, cómo marca "peso estable" vs "inestable", checksum, etc.). El
//! prompt es explícito en la sección 68: no inventar comandos seriales.
//!
//! Lo que SÍ se deja armado, siguiendo el patrón de aislamiento de la
//! sección 60:
//! - La configuración de conexión (puerto COM, baud rate, data bits,
//!   paridad, stop bits) ya tiene su tipo y se puede guardar en
//!   `dispositivos_hardware` (migración 0009).
//! - La separación conexión / lectura / parsing / estabilidad / errores
//!   que pide la sección 68, como módulos vacíos a completar.
//!
//! Cuando llegue la documentación oficial del fabricante, el parsing se
//! implementa en `parsear_trama` y el resto del sistema (Fase 4, `ModalBalanza`)
//! no necesita cambiar nada.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfiguracionSerial {
    pub puerto_com: String,
    pub baud_rate: u32,
    pub data_bits: u8,
    pub paridad: String, // "none" | "even" | "odd"
    pub stop_bits: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TipoConexionBalanza {
    Serial(ConfiguracionSerial),
    Bluetooth { nombre_dispositivo: String },
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct LecturaPeso {
    pub kg: f64,
    pub estable: bool,
}

#[derive(Debug, Error)]
pub enum ScaleError {
    #[error("protocolo de la Kretz Report LT todavía no implementado: falta documentación oficial del fabricante")]
    ProtocoloNoDocumentado,
    #[error("no se pudo abrir el puerto: {0}")]
    Conexion(String),
    #[error("peso fuera de rango (máximo 15 kg): {0}")]
    FueraDeRango(f64),
}

pub struct KretzReportLtAdapter {
    _conexion: TipoConexionBalanza,
}

impl KretzReportLtAdapter {
    pub fn new(conexion: TipoConexionBalanza) -> Self {
        Self { _conexion: conexion }
    }

    /// Sección 8: "Detectar balanza". Enumerar puertos serie disponibles es
    /// genérico (no depende del protocolo Kretz) y sí se puede implementar
    /// ya, con el crate `serialport`.
    pub fn detectar_puertos_disponibles() -> Result<Vec<String>, ScaleError> {
        serialport::available_ports()
            .map(|puertos| puertos.into_iter().map(|p| p.port_name).collect())
            .map_err(|e| ScaleError::Conexion(e.to_string()))
    }

    /// Sección 8-9: "Conectar" / "Leer peso". Placeholder explícito: abre el
    /// puerto (eso sí es estándar), pero no interpreta ninguna trama porque
    /// el formato de esa trama es justamente lo que falta documentar.
    pub fn leer_peso(&self) -> Result<LecturaPeso, ScaleError> {
        Err(ScaleError::ProtocoloNoDocumentado)
    }

    /// Parser de la trama cruda de la balanza. Se completa cuando exista la
    /// documentación oficial del protocolo (sección 68). Se deja la firma
    /// definida para que el resto del sistema no tenga que cambiar cuando
    /// eso pase — solo el cuerpo de esta función.
    #[allow(dead_code)]
    fn parsear_trama(_bytes: &[u8]) -> Result<LecturaPeso, ScaleError> {
        Err(ScaleError::ProtocoloNoDocumentado)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn leer_peso_es_honesto_sobre_no_tener_protocolo() {
        let adaptador = KretzReportLtAdapter::new(TipoConexionBalanza::Serial(ConfiguracionSerial {
            puerto_com: "COM3".into(),
            baud_rate: 9600,
            data_bits: 8,
            paridad: "none".into(),
            stop_bits: 1,
        }));
        // No debe devolver un peso falso: debe fallar explícitamente.
        assert!(matches!(adaptador.leer_peso(), Err(ScaleError::ProtocoloNoDocumentado)));
    }
}
