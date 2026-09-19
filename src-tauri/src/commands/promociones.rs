use crate::database::repositories::productos;
use crate::database::repositories::promociones::{self, Promocion, ResultadoPromocion};
use crate::database::DbPool;
use tauri::State;

#[tauri::command]
pub fn listar_promociones(pool: State<DbPool>) -> Result<Vec<Promocion>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    promociones::listar_todas(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn crear_promocion(
    pool: State<DbPool>,
    promocion: Promocion,
    productos_asociados: Vec<i64>,
) -> Result<i64, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    let id = promociones::crear_promocion(&conn, &promocion, promocion.categoria_id)
        .map_err(|e| e.to_string())?;
    for producto_id in productos_asociados {
        promociones::asociar_producto(&conn, id, producto_id).map_err(|e| e.to_string())?;
    }
    Ok(id)
}


/// Invocado desde el frontend al agregar/modificar una línea del carrito,
/// para mostrar el descuento en vivo antes de cobrar (sección 21: "La
/// promoción debe calcularse automáticamente durante la venta").
#[tauri::command]
pub fn calcular_promocion_linea(
    pool: State<DbPool>,
    producto_id: i64,
    cantidad: f64,
    precio_unitario: f64,
) -> Result<Option<ResultadoPromocion>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;

    let producto = productos::buscar_por_id(&conn, producto_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Producto no encontrado.".to_string())?;

    let promos = promociones::promociones_aplicables_a_producto(
        &conn,
        producto_id,
        producto.categoria_id,
    )
    .map_err(|e| e.to_string())?;

    Ok(promociones::calcular_mejor_descuento(&promos, cantidad, precio_unitario))
}
