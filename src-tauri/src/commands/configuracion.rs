use crate::database::repositories::configuracion;
use crate::database::DbPool;
use crate::hardware::printer::{ConexionImpresora, DatosTicket, EstadoImpresora, Itpos8012, PrinterError};
use crate::hardware::scale::KretzReportLtAdapter;
use tauri::State;

#[tauri::command]
pub fn obtener_configuracion(pool: State<DbPool>, clave: String) -> Result<Option<String>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    configuracion::obtener(&conn, &clave).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn guardar_configuracion(pool: State<DbPool>, clave: String, valor: String) -> Result<(), String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    configuracion::guardar(&conn, &clave, &valor).map_err(|e| e.to_string())
}

// --- Diagnóstico de hardware (sección 53) ---

#[tauri::command]
pub fn probar_impresora_ethernet(ip: String, puerto: u16) -> Result<(), String> {
    let impresora = Itpos8012::new(ConexionImpresora::Ethernet { ip, puerto });
    impresora.probar_impresion().map_err(traducir_error_impresora)
}

#[tauri::command]
pub fn estado_impresora_ethernet(ip: String, puerto: u16) -> EstadoImpresora {
    Itpos8012::new(ConexionImpresora::Ethernet { ip, puerto }).estado()
}

#[tauri::command]
pub fn abrir_cajon_ethernet(ip: String, puerto: u16) -> Result<(), String> {
    let impresora = Itpos8012::new(ConexionImpresora::Ethernet { ip, puerto });
    impresora.abrir_cajon().map_err(traducir_error_impresora)
}

#[tauri::command]
pub fn imprimir_ticket_ethernet(ip: String, puerto: u16, ticket: DatosTicket) -> Result<(), String> {
    let impresora = Itpos8012::new(ConexionImpresora::Ethernet { ip, puerto });
    impresora.imprimir_ticket(&ticket).map_err(traducir_error_impresora)
}

fn traducir_error_impresora(_e: PrinterError) -> String {
    // Sección 57: nunca mostrar el error técnico crudo al cajero.
    "No se pudo comunicar con la impresora. Verifique la conexión.".to_string()
}

#[tauri::command]
pub fn detectar_puertos_balanza() -> Result<Vec<String>, String> {
    KretzReportLtAdapter::detectar_puertos_disponibles().map_err(|_| {
        "No se pudieron listar los puertos serie disponibles.".to_string()
    })
}

#[tauri::command]
pub fn imprimir_ticket_usb(nombre_impresora: String, ticket: DatosTicket) -> Result<(), String> {
    let impresora = Itpos8012::new(ConexionImpresora::Usb {
        nombre_cola: nombre_impresora,
    });
    impresora.imprimir_ticket(&ticket).map_err(traducir_error_impresora)
}

#[tauri::command]
pub fn probar_impresora_usb(nombre_impresora: String) -> Result<(), String> {
    let impresora = Itpos8012::new(ConexionImpresora::Usb {
        nombre_cola: nombre_impresora,
    });
    impresora.probar_impresion().map_err(traducir_error_impresora)
}

#[tauri::command]
pub fn abrir_cajon_usb(nombre_impresora: String) -> Result<(), String> {
    let impresora = Itpos8012::new(ConexionImpresora::Usb {
        nombre_cola: nombre_impresora,
    });
    impresora.abrir_cajon().map_err(traducir_error_impresora)
}
