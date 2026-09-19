use crate::database::repositories::ventas::{self, ItemVentaInput, PagoInput, VentaConfirmada};
use crate::database::DbPool;
use tauri::State;

/// Comando invocado por el botón COBRAR de la pantalla de venta (sección 13).
/// Toda la transacción (venta + detalle + pagos + stock + caja) ocurre
/// dentro de `ventas::confirmar_venta`. Este comando solo abre la conexión
/// y traduce errores de negocio a mensajes que el frontend puede mostrar
/// directamente al cajero (nunca un error técnico crudo, sección 57).
#[tauri::command]
pub fn confirmar_venta(
    pool: State<DbPool>,
    caja_id: i64,
    usuario_id: i64,
    cliente_id: Option<i64>,
    items: Vec<ItemVentaInput>,
    pagos: Vec<PagoInput>,
) -> Result<VentaConfirmada, String> {
    let mut conn = pool.get().map_err(|_| "No se pudo completar la operación.".to_string())?;
    ventas::confirmar_venta(&mut conn, caja_id, usuario_id, cliente_id, &items, &pagos)
        .map_err(|e| e.to_string())
}
