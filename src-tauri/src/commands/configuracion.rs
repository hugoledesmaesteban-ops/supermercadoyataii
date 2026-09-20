use crate::database::repositories::configuracion;
use crate::database::DbPool;
use crate::hardware::printer::{ConexionImpresora, DatosPresupuesto, DatosTicket, EstadoImpresora, ItemReposicion, Itpos8012, PrinterError};
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

#[tauri::command]
pub fn imprimir_lista_reposicion_ethernet(ip: String, puerto: u16, items: Vec<ItemReposicion>) -> Result<(), String> {
    let impresora = Itpos8012::new(ConexionImpresora::Ethernet { ip, puerto });
    impresora.imprimir_lista_reposicion(&items).map_err(traducir_error_impresora)
}

fn traducir_error_impresora(_e: PrinterError) -> String {
    "No se pudo comunicar con la impresora. Verifique la conexion.".to_string()
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
pub fn imprimir_lista_reposicion_usb(nombre_impresora: String, items: Vec<ItemReposicion>) -> Result<(), String> {
    let impresora = Itpos8012::new(ConexionImpresora::Usb {
        nombre_cola: nombre_impresora,
    });
    impresora.imprimir_lista_reposicion(&items).map_err(traducir_error_impresora)
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

#[tauri::command]
pub fn imprimir_presupuesto_ethernet(ip: String, puerto: u16, presupuesto: DatosPresupuesto) -> Result<(), String> {
    let impresora = Itpos8012::new(ConexionImpresora::Ethernet { ip, puerto });
    impresora.imprimir_presupuesto(&presupuesto).map_err(traducir_error_impresora)
}

#[tauri::command]
pub fn imprimir_presupuesto_usb(nombre_impresora: String, presupuesto: DatosPresupuesto) -> Result<(), String> {
    let impresora = Itpos8012::new(ConexionImpresora::Usb {
        nombre_cola: nombre_impresora,
    });
    impresora.imprimir_presupuesto(&presupuesto).map_err(traducir_error_impresora)
}