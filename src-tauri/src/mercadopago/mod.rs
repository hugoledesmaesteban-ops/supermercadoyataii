//! Integración con Mercado Pago: QR dinámico interoperable + verificación
//! de pagos. Endpoints verificados contra la documentación oficial:
//! - Crear QR:   POST /instore/orders/qr/seller/collectors/{user_id}/pos/{external_pos_id}/qrs
//! - Buscar pago: GET /v1/payments/search?external_reference=...
//!
//! Mercado Pago devuelve `qr_data`: un string EMVCo (el contenido a
//! codificar como imagen QR), NO una imagen ya generada. La imagen se
//! genera en el frontend con la librería `qrcode` de npm.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MpError {
    #[error("error de red: {0}")]
    Red(#[from] reqwest::Error),
    #[error("Mercado Pago devolvió un error: {0}")]
    Api(String),
}

#[derive(Debug, Serialize)]
pub struct QRData {
    pub qr_texto: String,
    pub external_reference: String,
    pub in_store_order_id: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct RespuestaQr {
    qr_data: Option<String>,
    in_store_order_id: Option<String>,
    message: Option<String>,
}

/// Crea un QR dinámico por el monto exacto indicado. El monto lo fija el
/// sistema (nunca el cliente): quien llama a esta función decide el monto.
pub fn crear_qr(
    access_token: &str,
    user_id: &str,
    external_pos_id: &str,
    external_reference: &str,
    monto: f64,
    titulo: &str,
) -> Result<QRData, MpError> {
    let url = format!(
        "https://api.mercadopago.com/instore/orders/qr/seller/collectors/{user_id}/pos/{external_pos_id}/qrs"
    );

    let cuerpo = serde_json::json!({
        "external_reference": external_reference,
        "title": titulo,
        "description": titulo,
        "total_amount": monto,
        "items": [{
            "sku_number": "VENTA-POS",
            "category": "marketplace",
            "title": titulo,
            "description": titulo,
            "unit_price": monto,
            "quantity": 1,
            "unit_measure": "unit",
            "total_amount": monto
        }]
    });

    let cliente = reqwest::blocking::Client::new();
    let respuesta = cliente.post(&url).bearer_auth(access_token).json(&cuerpo).send()?;
    let estado = respuesta.status();
    let cuerpo_respuesta: RespuestaQr = respuesta.json().unwrap_or_default();

    if !estado.is_success() {
        return Err(MpError::Api(cuerpo_respuesta.message.unwrap_or_else(|| format!("HTTP {estado}"))));
    }

    let qr_texto = cuerpo_respuesta
        .qr_data
        .ok_or_else(|| MpError::Api("Mercado Pago no devolvió qr_data.".to_string()))?;

    Ok(QRData {
        qr_texto,
        external_reference: external_reference.to_string(),
        in_store_order_id: cuerpo_respuesta.in_store_order_id,
    })
}

#[derive(Debug, Serialize, Clone)]
pub struct EstadoPagoMp {
    pub aprobado: bool,
    pub payment_id: Option<i64>,
    pub monto: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct RespuestaBusquedaPagos {
    results: Vec<PagoEncontrado>,
}

#[derive(Debug, Deserialize)]
struct PagoEncontrado {
    id: i64,
    status: String,
    transaction_amount: f64,
    date_created: String,
}

/// Camino confiable: busca por `external_reference` exacto (el QR dinámico
/// ya viaja con esta referencia embebida, así que no hay ambigüedad).
pub fn buscar_pago_por_referencia(access_token: &str, external_reference: &str) -> Result<EstadoPagoMp, MpError> {
    let url = format!(
        "https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&external_reference={external_reference}&range=date_created&begin_date=NOW-1DAY&end_date=NOW"
    );

    let cliente = reqwest::blocking::Client::new();
    let respuesta = cliente.get(&url).bearer_auth(access_token).send()?;
    if !respuesta.status().is_success() {
        return Err(MpError::Api(format!("HTTP {}", respuesta.status())));
    }

    let cuerpo: RespuestaBusquedaPagos = respuesta.json()?;
    match cuerpo.results.first() {
        Some(pago) if pago.status == "approved" => Ok(EstadoPagoMp {
            aprobado: true,
            payment_id: Some(pago.id),
            monto: Some(pago.transaction_amount),
        }),
        _ => Ok(EstadoPagoMp { aprobado: false, payment_id: None, monto: None }),
    }
}

/// Camino alternativo (transferencia manual por alias, SIN QR de por
/// medio): busca por monto exacto dentro de una ventana de minutos.
///
/// ADVERTENCIA REAL: esto es inherentemente ambiguo. Si dos clientes
/// transfieren el mismo monto redondo en la misma ventana, este método
/// puede confundirlos. Usar el flujo de QR (con external_reference)
/// siempre que sea posible.
pub fn buscar_pago_por_monto_reciente(
    access_token: &str,
    monto_esperado: f64,
    minutos_ventana: i64,
) -> Result<EstadoPagoMp, MpError> {
    let url = "https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&range=date_created&begin_date=NOW-1DAY&end_date=NOW&status=approved";

    let cliente = reqwest::blocking::Client::new();
    let respuesta = cliente.get(url).bearer_auth(access_token).send()?;
    if !respuesta.status().is_success() {
        return Err(MpError::Api(format!("HTTP {}", respuesta.status())));
    }

    let cuerpo: RespuestaBusquedaPagos = respuesta.json()?;
    let ahora = Utc::now();

    let coincidencia = cuerpo.results.into_iter().find(|p| {
        let dentro_de_ventana = p
            .date_created
            .parse::<DateTime<Utc>>()
            .map(|fecha| (ahora - fecha).num_minutes() <= minutos_ventana)
            .unwrap_or(false);
        p.status == "approved"
            && dentro_de_ventana
            && (p.transaction_amount - monto_esperado).abs() < 0.01
    });

    match coincidencia {
        Some(pago) => Ok(EstadoPagoMp { aprobado: true, payment_id: Some(pago.id), monto: Some(pago.transaction_amount) }),
        None => Ok(EstadoPagoMp { aprobado: false, payment_id: None, monto: None }),
    }
}