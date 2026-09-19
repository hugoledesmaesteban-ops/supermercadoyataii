//! Comandos ESC/POS estándar. A diferencia de la balanza Kretz (sección 68),
//! ESC/POS SÍ es un protocolo público y ampliamente documentado que
//! prácticamente toda impresora térmica de 80mm (incluida la ITPOS 8012)
//! implementa, así que acá no hay nada "inventado": son los comandos de la
//! especificación estándar (Epson ESC/POS y sus clones).

pub const INICIALIZAR: &[u8] = &[0x1B, 0x40]; // ESC @

pub const ALINEAR_IZQUIERDA: &[u8] = &[0x1B, 0x61, 0x00];
pub const ALINEAR_CENTRO: &[u8] = &[0x1B, 0x61, 0x01];

pub const NEGRITA_ON: &[u8] = &[0x1B, 0x45, 0x01];
pub const NEGRITA_OFF: &[u8] = &[0x1B, 0x45, 0x00];

pub const FUENTE_DOBLE_ALTO_ANCHO: &[u8] = &[0x1D, 0x21, 0x11];
pub const FUENTE_NORMAL: &[u8] = &[0x1D, 0x21, 0x00];

/// Corte parcial de papel (GS V 1). La ITPOS 8012 soporta corte automático.
pub const CORTAR_PAPEL: &[u8] = &[0x1D, 0x56, 0x01];

pub const SALTO_LINEA: &[u8] = &[0x0A];

/// Pulso de apertura de cajón (ESC p m t1 t2), el comando estándar de la
/// especificación ESC/POS para activar el conector RJ11 de un cajón como el
/// 3nStar CD350 conectado a la impresora. `pin 0` es el más común en cajones
/// de 2 pines (24V).
pub fn abrir_cajon_pulso() -> Vec<u8> {
    vec![0x1B, 0x70, 0x00, 0x19, 0xFA]
}

pub fn linea_separadora(ancho: usize) -> Vec<u8> {
    let mut v = "-".repeat(ancho).into_bytes();
    v.extend_from_slice(SALTO_LINEA);
    v
}
