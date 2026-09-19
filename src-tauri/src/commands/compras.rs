use crate::database::repositories::compras::{self, CompraConfirmada, ItemCompraInput};
use crate::database::repositories::proveedores::{self, HistorialCompraProveedor, Proveedor};
use crate::database::DbPool;
use tauri::State;

#[tauri::command]
pub fn listar_proveedores(pool: State<DbPool>) -> Result<Vec<Proveedor>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    proveedores::listar(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn crear_proveedor(pool: State<DbPool>, proveedor: Proveedor) -> Result<i64, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    proveedores::crear(&conn, &proveedor).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn historial_compras_proveedor(
    pool: State<DbPool>,
    proveedor_id: i64,
) -> Result<Vec<HistorialCompraProveedor>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    proveedores::historial_compras(&conn, proveedor_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn confirmar_compra(
    pool: State<DbPool>,
    proveedor_id: i64,
    usuario_id: i64,
    numero_comprobante: Option<String>,
    items: Vec<ItemCompraInput>,
) -> Result<CompraConfirmada, String> {
    let mut conn = pool.get().map_err(|_| "No se pudo completar la operación.".to_string())?;
    compras::confirmar_compra(&mut conn, proveedor_id, usuario_id, numero_comprobante.as_deref(), &items)
        .map_err(|e| e.to_string())
}
