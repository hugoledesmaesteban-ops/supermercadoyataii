use crate::database::repositories::auditoria;
use crate::database::repositories::productos::{self, Producto};
use crate::database::DbPool;
use tauri::State;

#[tauri::command]
pub fn buscar_producto_por_codigo(
    pool: State<DbPool>,
    codigo_barra: String,
) -> Result<Option<Producto>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    productos::buscar_por_codigo_barra(&conn, &codigo_barra).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn buscar_productos_por_texto(
    pool: State<DbPool>,
    texto: String,
) -> Result<Vec<Producto>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    productos::buscar_por_texto(&conn, &texto, 200).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn listar_productos_filtrado(
    pool: State<DbPool>,
    texto: Option<String>,
    solo_activos: bool,
    solo_stock_bajo: bool,
    solo_por_vencer_dias: Option<i64>,
) -> Result<Vec<Producto>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    productos::listar_filtrado(
        &conn,
        texto.as_deref(),
        solo_activos,
        solo_stock_bajo,
        solo_por_vencer_dias,
        500,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn crear_producto(pool: State<DbPool>, producto: Producto, usuario_id: i64) -> Result<i64, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    let id = productos::crear(&conn, &producto).map_err(|e| e.to_string())?;
    auditoria::registrar(
        &conn,
        Some(usuario_id),
        "PRODUCTO_CREADO",
        Some("producto"),
        Some(id),
        None,
    )
    .ok();
    Ok(id)
}

#[tauri::command]
pub fn actualizar_producto(pool: State<DbPool>, producto: Producto, usuario_id: i64) -> Result<(), String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    productos::actualizar(&conn, &producto).map_err(|e| e.to_string())?;
    auditoria::registrar(
        &conn,
        Some(usuario_id),
        "PRODUCTO_EDITADO",
        Some("producto"),
        producto.id,
        None,
    )
    .ok();
    Ok(())
}

#[tauri::command]
pub fn actualizar_precio_producto(
    pool: State<DbPool>,
    producto_id: i64,
    nuevo_precio: f64,
    usuario_id: i64,
) -> Result<(), String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    let producto = productos::buscar_por_id(&conn, producto_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Producto no encontrado.".to_string())?;
    let precio_anterior = producto.precio_venta;

    conn.execute(
        "UPDATE productos SET precio_venta = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?2",
        rusqlite::params![nuevo_precio, producto_id],
    )
    .map_err(|e| e.to_string())?;

    auditoria::registrar(
        &conn,
        Some(usuario_id),
        "CAMBIO_PRECIO",
        Some("producto"),
        Some(producto_id),
        Some(&format!("{{\"anterior\":{precio_anterior},\"nuevo\":{nuevo_precio}}}")),
    )
    .ok();

    Ok(())
}

#[tauri::command]
pub fn desactivar_producto(pool: State<DbPool>, producto_id: i64, usuario_id: i64) -> Result<(), String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    productos::desactivar(&conn, producto_id).map_err(|e| e.to_string())?;
    auditoria::registrar(
        &conn,
        Some(usuario_id),
        "PRODUCTO_DESACTIVADO",
        Some("producto"),
        Some(producto_id),
        None,
    )
    .ok();
    Ok(())
}

#[tauri::command]
pub fn reactivar_producto(pool: State<DbPool>, producto_id: i64, usuario_id: i64) -> Result<(), String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    productos::reactivar(&conn, producto_id).map_err(|e| e.to_string())?;
    auditoria::registrar(
        &conn,
        Some(usuario_id),
        "PRODUCTO_REACTIVADO",
        Some("producto"),
        Some(producto_id),
        None,
    )
    .ok();
    Ok(())
}

#[tauri::command]
pub fn aplicar_descuento_producto(
    pool: State<DbPool>,
    producto_id: i64,
    porcentaje: f64,
    cantidad_minima: i64,
    usuario_id: i64,
) -> Result<(), String> {
    if !(0.0..=100.0).contains(&porcentaje) {
        return Err("El porcentaje debe estar entre 0 y 100.".to_string());
    }
    if cantidad_minima < 1 {
        return Err("La cantidad mínima debe ser 1 o más.".to_string());
    }

    let conn = pool.get().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE productos SET descuento_porcentaje = ?1,
                descuento_cantidad_minima = ?2,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id = ?3",
        rusqlite::params![porcentaje, cantidad_minima, producto_id],
    )
    .map_err(|e| e.to_string())?;

    auditoria::registrar(
        &conn,
        Some(usuario_id),
        "DESCUENTO_APLICADO",
        Some("producto"),
        Some(producto_id),
        Some(&format!("{{\"porcentaje\":{porcentaje},\"cantidad_minima\":{cantidad_minima}}}")),
    )
    .ok();

    Ok(())
}

#[tauri::command]
pub fn quitar_descuento_producto(
    pool: State<DbPool>,
    producto_id: i64,
    usuario_id: i64,
) -> Result<(), String> {
    let conn = pool.get().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE productos SET descuento_porcentaje = 0,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id = ?1",
        rusqlite::params![producto_id],
    )
    .map_err(|e| e.to_string())?;

    auditoria::registrar(
        &conn,
        Some(usuario_id),
        "DESCUENTO_QUITADO",
        Some("producto"),
        Some(producto_id),
        None,
    )
    .ok();

    Ok(())
}
