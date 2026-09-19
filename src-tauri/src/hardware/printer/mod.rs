//! Adaptador para la impresora térmica ITPOS 8012 (Fase 7, secciones 16-17).
//!
//! A diferencia de la balanza, el protocolo acá SÍ está bien definido
//! (ESC/POS estándar), así que esta implementación es real y funcional para
//! la conexión Ethernet (TCP crudo al puerto 9100, el estándar de facto para
//! impresoras térmicas en red). La conexión USB depende del driver de
//! impresión de Windows (cola de impresión / WinSpool) y se deja marcada
//! explícitamente como pendiente de probar contra el hardware físico real,
//! ya que este entorno no tiene Windows para validarla.

#[cfg(target_os = "windows")]
mod usb;

use crate::hardware::escpos;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::net::TcpStream;
use std::time::Duration;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PrinterError {
    #[error("no se pudo conectar con la impresora: {0}")]
    Conexion(String),
    #[error("conexión USB no implementada todavía en esta plataforma (requiere WinSpool en Windows)")]
    UsbNoSoportado,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConexionImpresora {
    Ethernet { ip: String, puerto: u16 },
    Usb { nombre_cola: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EstadoImpresora {
    Conectada,
    Desconectada,
    Error(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ItemTicket {
    pub nombre: String,
    pub cantidad_display: String, // ej: "2" o "1.250kg"
    pub precio_unitario: f64,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PagoTicket {
    pub metodo: String,
    pub monto: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DatosTicket {
    pub nombre_comercio: String,
    pub direccion: String,
    pub localidad_provincia: String, // ej: "Yataytí Calle, Corrientes"
    pub telefono: String,            // vacío = no se imprime
    pub cuit: String,                // vacío = no se imprime
    pub numero_venta: String,        // ya formateado, ej: "0001-00001234"
    pub fecha: String,               // ej: "12/09/26"
    pub hora: String,                // ej: "14:32"
    pub items: Vec<ItemTicket>,
    pub subtotal: f64,
    pub descuento: f64,
    pub total: f64,
    pub pagos: Vec<PagoTicket>,
    pub vuelto: f64,
    pub mensaje_final: String,
}

pub struct Itpos8012 {
    conexion: ConexionImpresora,
}

impl Itpos8012 {
    pub fn new(conexion: ConexionImpresora) -> Self {
        Self { conexion }
    }

    fn enviar_bytes(&self, datos: &[u8]) -> Result<(), PrinterError> {
        match &self.conexion {
            ConexionImpresora::Ethernet { ip, puerto } => {
                let direccion = format!("{ip}:{puerto}");
                let mut stream = TcpStream::connect_timeout(
                    &direccion
                        .parse()
                        .map_err(|e| PrinterError::Conexion(format!("dirección inválida: {e}")))?,
                    Duration::from_secs(3),
                )
                .map_err(|e| PrinterError::Conexion(e.to_string()))?;
                stream
                    .write_all(datos)
                    .map_err(|e| PrinterError::Conexion(e.to_string()))?;
                Ok(())
            }
            ConexionImpresora::Usb { nombre_cola } => {
                #[cfg(target_os = "windows")]
                {
                    usb::enviar_a_impresora_usb(nombre_cola, datos)
                }
                #[cfg(not(target_os = "windows"))]
                {
                    let _ = nombre_cola;
                    Err(PrinterError::UsbNoSoportado)
                }
            }
        }
    }

    pub fn probar_impresion(&self) -> Result<(), PrinterError> {
        let mut buf = Vec::new();
        buf.extend_from_slice(escpos::INICIALIZAR);
        buf.extend_from_slice(escpos::ALINEAR_CENTRO);
        buf.extend_from_slice(escpos::NEGRITA_ON);
        buf.extend_from_slice(b"PRUEBA DE IMPRESION\n");
        buf.extend_from_slice(escpos::NEGRITA_OFF);
        buf.extend_from_slice(b"Super Yatay\n");
        buf.extend_from_slice(escpos::SALTO_LINEA);
        buf.extend_from_slice(escpos::SALTO_LINEA);
        buf.extend_from_slice(escpos::SALTO_LINEA);
        buf.extend_from_slice(escpos::CORTAR_PAPEL);
        self.enviar_bytes(&buf)
    }

    pub fn cortar_papel(&self) -> Result<(), PrinterError> {
        self.enviar_bytes(escpos::CORTAR_PAPEL)
    }

    pub fn abrir_cajon(&self) -> Result<(), PrinterError> {
        self.enviar_bytes(&escpos::abrir_cajon_pulso())
    }

    pub fn estado(&self) -> EstadoImpresora {
        match &self.conexion {
            ConexionImpresora::Ethernet { ip, puerto } => {
                let direccion = format!("{ip}:{puerto}");
                match direccion.parse().ok().and_then(|addr| {
                    TcpStream::connect_timeout(&addr, Duration::from_millis(800)).ok()
                }) {
                    Some(_) => EstadoImpresora::Conectada,
                    None => EstadoImpresora::Desconectada,
                }
            }
            ConexionImpresora::Usb { .. } => {
                EstadoImpresora::Error("Verificación USB no implementada".into())
            }
        }
    }

    pub fn imprimir_ticket(&self, t: &DatosTicket) -> Result<(), PrinterError> {
        let buf = construir_bytes_ticket(t);
        self.enviar_bytes(&buf)
    }
}

const ANCHO_TICKET: usize = 32;

fn linea_dos_columnas(izquierda: &str, derecha: &str) -> String {
    if izquierda.len() + derecha.len() >= ANCHO_TICKET {
        format!("{izquierda} {derecha}")
    } else {
        let espacio = ANCHO_TICKET - izquierda.len() - derecha.len();
        format!("{izquierda}{}{derecha}", " ".repeat(espacio))
    }
}

fn construir_bytes_ticket(t: &DatosTicket) -> Vec<u8> {
    let mut buf = Vec::new();
    buf.extend_from_slice(escpos::INICIALIZAR);
    buf.extend_from_slice(escpos::ALINEAR_CENTRO);
    buf.extend_from_slice(escpos::NEGRITA_ON);
    buf.extend_from_slice(format!("{}\n", t.nombre_comercio).as_bytes());
    buf.extend_from_slice(escpos::NEGRITA_OFF);
    buf.extend_from_slice(format!("{}\n", t.direccion).as_bytes());
    buf.extend_from_slice(format!("{}\n", t.localidad_provincia).as_bytes());
    if !t.telefono.is_empty() {
        buf.extend_from_slice(format!("Tel: {}\n", t.telefono).as_bytes());
    }
    if !t.cuit.is_empty() {
        buf.extend_from_slice(format!("CUIT: {}\n", t.cuit).as_bytes());
    }
    buf.extend_from_slice(escpos::SALTO_LINEA);

    buf.extend_from_slice(escpos::ALINEAR_IZQUIERDA);
    buf.extend_from_slice(format!("Fecha: {} {}\n", t.fecha, t.hora).as_bytes());
    buf.extend_from_slice(format!("Ticket: {}\n", t.numero_venta).as_bytes());
    buf.extend_from_slice(escpos::SALTO_LINEA);

    for (i, item) in t.items.iter().enumerate() {
        buf.extend_from_slice(format!("{} {}\n", i + 1, item.nombre).as_bytes());
        let izquierda = format!("   {} x ${:.0}", item.cantidad_display, item.precio_unitario);
        let derecha = format!("${:.0}", item.total);
        buf.extend_from_slice(linea_dos_columnas(&izquierda, &derecha).as_bytes());
        buf.extend_from_slice(escpos::SALTO_LINEA);
    }
    buf.extend_from_slice(escpos::SALTO_LINEA);

    if t.descuento > 0.0 {
        buf.extend_from_slice(
            linea_dos_columnas("Subtotal:", &format!("${:.0}", t.subtotal)).as_bytes(),
        );
        buf.extend_from_slice(escpos::SALTO_LINEA);
        buf.extend_from_slice(
            linea_dos_columnas("Descuento:", &format!("${:.0}", t.descuento)).as_bytes(),
        );
        buf.extend_from_slice(escpos::SALTO_LINEA);
    }

    buf.extend_from_slice(escpos::NEGRITA_ON);
    buf.extend_from_slice(
        linea_dos_columnas("TOTAL:", &format!("${:.0}", t.total)).as_bytes(),
    );
    buf.extend_from_slice(escpos::NEGRITA_OFF);
    buf.extend_from_slice(escpos::SALTO_LINEA);

    for pago in &t.pagos {
        let etiqueta = capitalizar(&pago.metodo);
        buf.extend_from_slice(
            linea_dos_columnas(&format!("{etiqueta}:"), &format!("${:.0}", pago.monto)).as_bytes(),
        );
        buf.extend_from_slice(escpos::SALTO_LINEA);
    }
    if t.vuelto > 0.0 {
        buf.extend_from_slice(
            linea_dos_columnas("Vuelto:", &format!("${:.0}", t.vuelto)).as_bytes(),
        );
        buf.extend_from_slice(escpos::SALTO_LINEA);
    }

    buf.extend_from_slice(escpos::SALTO_LINEA);
    buf.extend_from_slice(escpos::ALINEAR_CENTRO);
    buf.extend_from_slice(format!("{}\n", t.mensaje_final).as_bytes());
    buf.extend_from_slice(escpos::SALTO_LINEA);
    buf.extend_from_slice(escpos::SALTO_LINEA);
    buf.extend_from_slice(escpos::CORTAR_PAPEL);

    buf
}

fn capitalizar(s: &str) -> String {
    let mut c = s.to_lowercase();
    if let Some(primera) = c.get_mut(0..1) {
        primera.make_ascii_uppercase();
    }
    c
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;
    use std::net::TcpListener;
    use std::thread;

    fn ticket_de_prueba() -> DatosTicket {
        DatosTicket {
            nombre_comercio: "SUPER YATAY".into(),
            direccion: "Av Raul Alfonsin".into(),
            localidad_provincia: "Yataytí Calle, Corrientes".into(),
            telefono: "".into(),
            cuit: "".into(),
            numero_venta: "0001-00001234".into(),
            fecha: "12/09/26".into(),
            hora: "14:32".into(),
            items: vec![
                ItemTicket { nombre: "Yerba Playadito 1kg".into(), cantidad_display: "1".into(), precio_unitario: 3500.0, total: 3500.0 },
                ItemTicket { nombre: "Aceite Natura 900ml".into(), cantidad_display: "2".into(), precio_unitario: 2800.0, total: 5600.0 },
            ],
            subtotal: 9100.0,
            descuento: 0.0,
            total: 9100.0,
            pagos: vec![PagoTicket { metodo: "EFECTIVO".into(), monto: 10000.0 }],
            vuelto: 900.0,
            mensaje_final: "¡Gracias por su compra!".into(),
        }
    }

    #[test]
    fn imprimir_ticket_envia_bytes_escpos_validos_por_red() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let puerto = listener.local_addr().unwrap().port();

        let manejador = thread::spawn(move || {
            let (mut socket, _) = listener.accept().unwrap();
            let mut recibido = Vec::new();
            socket.read_to_end(&mut recibido).ok();
            recibido
        });

        let impresora = Itpos8012::new(ConexionImpresora::Ethernet { ip: "127.0.0.1".into(), puerto });
        impresora.imprimir_ticket(&ticket_de_prueba()).unwrap();

        let datos = manejador.join().unwrap();
        let texto = String::from_utf8_lossy(&datos);
        assert!(texto.contains("SUPER YATAY"));
        assert!(texto.contains("Ticket: 0001-00001234"));
        assert!(texto.contains("Vuelto"));
        assert!(texto.contains("¡Gracias por su compra!"));
    }

    #[test]
    fn abrir_cajon_envia_el_pulso_estandar() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let puerto = listener.local_addr().unwrap().port();

        let manejador = thread::spawn(move || {
            let (mut socket, _) = listener.accept().unwrap();
            let mut recibido = Vec::new();
            socket.read_to_end(&mut recibido).ok();
            recibido
        });

        let impresora = Itpos8012::new(ConexionImpresora::Ethernet { ip: "127.0.0.1".into(), puerto });
        impresora.abrir_cajon().unwrap();

        let datos = manejador.join().unwrap();
        assert_eq!(datos, escpos::abrir_cajon_pulso());
    }

    #[test]
    fn conexion_usb_devuelve_error_explicito_no_simulado() {
        let impresora = Itpos8012::new(ConexionImpresora::Usb { nombre_cola: "ITPOS8012".into() });
        let resultado = impresora.probar_impresion();
        assert!(matches!(resultado, Err(PrinterError::UsbNoSoportado)));
    }
}