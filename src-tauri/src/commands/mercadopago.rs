use crate::database::repositories::configuracion;
use crate::database::DbPool;
use crate::mercadopago::{self, EstadoPagoMp, QRData};
use crate::seguridad;
use serde::Serialize;
use tauri::{Manager, State};
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct ConfigMercadoPagoPublica {
    pub user_id: String,
    pub external_pos_id: String,
    pub alias: String,
    pub configurado: bool,
}

/// Guarda la configuración de Mercado Pago. El access token se cifra antes
/// de guardarse y nunca se devuelve al frontend en ningún comando de
/// lectura (ni cifrado ni descifrado).
#[tauri::command]
pub fn guardar_config_mercadopago(
    app: tauri::AppHandle,
    pool: State<DbPool>,
    user_id: String,
    external_pos_id: String,
    alias: String,
    access_token: String,
) -> Result<(), String> {
    let dir_datos = app
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "No se pudo resolver el directorio de datos.".to_string())?;
    let conn = pool.get().map_err(|_| "No se pudo completar la operación.".to_string())?;

    let token_cifrado = seguridad::cifrar(&dir_datos, &access_token)
        .map_err(|_| "No se pudo proteger el access token.".to_string())?;

    configuracion::guardar(&conn, "mp_user_id", &user_id).map_err(|e| e.to_string())?;
    configuracion::guardar(&conn, "mp_external_pos_id", &external_pos_id).map_err(|e| e.to_string())?;
    configuracion::guardar(&conn, "mp_alias", &alias).map_err(|e| e.to_string())?;
    configuracion::guardar(&conn, "mp_access_token_enc", &token_cifrado).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn obtener_config_mercadopago(pool: State<DbPool>) -> Result<ConfigMercadoPagoPublica, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    let user_id = configuracion::obtener(&conn, "mp_user_id").map_err(|e| e.to_string())?.unwrap_or_default();
    let external_pos_id = configuracion::obtener(&conn, "mp_external_pos_id").map_err(|e| e.to_string())?.unwrap_or_default();
    let alias = configuracion::obtener(&conn, "mp_alias").map_err(|e| e.to_string())?.unwrap_or_default();
    let token_enc = configuracion::obtener(&conn, "mp_access_token_enc").map_err(|e| e.to_string())?;

    Ok(ConfigMercadoPagoPublica { user_id, external_pos_id, alias, configurado: token_enc.is_some() })
}

fn cargar_credenciales(app: &tauri::AppHandle, pool: &DbPool) -> Result<(String, String, String), String> {
    let dir_datos = app.path_resolver().app_data_dir().ok_or_else(|| "No se pudo resolver el directorio de datos.".to_string())?;
    let conn = pool.get().map_err(|_| "No se pudo completar la operación.".to_string())?;

    let user_id = configuracion::obtener(&conn, "mp_user_id").map_err(|e| e.to_string())?
        .ok_or_else(|| "Falta configurar el User ID de Mercado Pago.".to_string())?;
    let external_pos_id = configuracion::obtener(&conn, "mp_external_pos_id").map_err(|e| e.to_string())?
        .ok_or_else(|| "Falta configurar el POS ID de Mercado Pago.".to_string())?;
    let token_enc = configuracion::obtener(&conn, "mp_access_token_enc").map_err(|e| e.to_string())?
        .ok_or_else(|| "Falta configurar el Access Token de Mercado Pago.".to_string())?;

    let access_token = seguridad::descifrar(&dir_datos, &token_enc)
        .map_err(|_| "No se pudo leer el access token guardado.".to_string())?;

    Ok((access_token, user_id, external_pos_id))
}

#[tauri::command]
pub fn crear_qr_mercadopago(app: tauri::AppHandle, pool: State<DbPool>, monto: f64) -> Result<QRData, String> {
    let (access_token, user_id, external_pos_id) = cargar_credenciales(&app, &pool)?;
    let external_reference = format!("yatai-{}-{}", chrono::Utc::now().timestamp(), Uuid::new_v4().simple());

    mercadopago::crear_qr(&access_token, &user_id, &external_pos_id, &external_reference, monto, "Venta Super Yatay")
        .map_err(|_| "No se pudo generar el QR de Mercado Pago. Verifique la conexión y las credenciales.".to_string())
}

#[tauri::command]
pub fn verificar_pago_mercadopago(app: tauri::AppHandle, pool: State<DbPool>, external_reference: String) -> Result<EstadoPagoMp, String> {
    let (access_token, _, _) = cargar_credenciales(&app, &pool)?;
    mercadopago::buscar_pago_por_referencia(&access_token, &external_reference)
        .map_err(|_| "No se pudo verificar el pago con Mercado Pago.".to_string())
}

#[tauri::command]
pub fn verificar_transferencia_por_alias(app: tauri::AppHandle, pool: State<DbPool>, monto: f64) -> Result<EstadoPagoMp, String> {
    let (access_token, _, _) = cargar_credenciales(&app, &pool)?;
    mercadopago::buscar_pago_por_monto_reciente(&access_token, monto, 5)
        .map_err(|_| "No se pudo verificar la transferencia.".to_string())
}