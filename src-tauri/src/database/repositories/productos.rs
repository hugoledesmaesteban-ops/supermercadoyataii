//! Repositorio de productos.

use crate::database::DbError;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Producto {
    pub id: Option<i64>,
    pub codigo_barra: Option<String>,
    pub sku: Option<String>,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub categoria_id: Option<i64>,
    pub marca_id: Option<i64>,
    pub precio_compra: f64,
    pub precio_venta: f64,
    pub precio_mayorista: Option<f64>,
    pub stock: f64,
    pub stock_minimo: f64,
    pub unidad_medida: String,
    pub es_pesable: bool,
    pub precio_por_kg: Option<f64>,
    pub iva: f64,
    pub vencimiento: Option<String>,
    pub proveedor_id: Option<i64>,
    pub foto: Option<String>,
    pub activo: bool,
    pub descuento_porcentaje: f64,
    pub descuento_cantidad_minima: i64,
}

pub fn buscar_por_codigo_barra(
    conn: &Connection,
    codigo_barra: &str,
) -> Result<Option<Producto>, DbError> {
    conn.query_row(
        "SELECT id, codigo_barra, sku, nombre, descripcion, categoria_id, marca_id,
                precio_compra, precio_venta, precio_mayorista, stock, stock_minimo,
                unidad_medida, es_pesable, precio_por_kg, iva, vencimiento,
                proveedor_id, foto, activo, descuento_porcentaje, descuento_cantidad_minima
         FROM productos
         WHERE codigo_barra = ?1 AND activo = 1",
        params![codigo_barra],
        mapear_fila,
    )
    .optional()
    .map_err(DbError::from)
}

pub fn buscar_por_id(conn: &Connection, id: i64) -> Result<Option<Producto>, DbError> {
    conn.query_row(
        "SELECT id, codigo_barra, sku, nombre, descripcion, categoria_id, marca_id,
                precio_compra, precio_venta, precio_mayorista, stock, stock_minimo,
                unidad_medida, es_pesable, precio_por_kg, iva, vencimiento,
                proveedor_id, foto, activo, descuento_porcentaje, descuento_cantidad_minima
         FROM productos WHERE id = ?1",
        params![id],
        mapear_fila,
    )
    .optional()
    .map_err(DbError::from)
}

pub fn buscar_por_texto(conn: &Connection, texto: &str, limite: i64) -> Result<Vec<Producto>, DbError> {
    let patron = format!("%{}%", texto);
    let mut stmt = conn.prepare(
        "SELECT id, codigo_barra, sku, nombre, descripcion, categoria_id, marca_id,
                precio_compra, precio_venta, precio_mayorista, stock, stock_minimo,
                unidad_medida, es_pesable, precio_por_kg, iva, vencimiento,
                proveedor_id, foto, activo, descuento_porcentaje, descuento_cantidad_minima
         FROM productos
         WHERE activo = 1 AND (nombre LIKE ?1 OR sku LIKE ?1)
         ORDER BY nombre
         LIMIT ?2",
    )?;
    let filas = stmt.query_map(params![patron, limite], mapear_fila)?;
    Ok(filas.filter_map(|r| r.ok()).collect())
}

/// Búsqueda con filtros para la pantalla de Productos: texto, solo activos,
/// solo stock bajo, solo por vencer en N días.
pub fn listar_filtrado(
    conn: &Connection,
    texto: Option<&str>,
    solo_activos: bool,
    solo_stock_bajo: bool,
    solo_por_vencer_dias: Option<i64>,
    limite: i64,
) -> Result<Vec<Producto>, DbError> {
    let mut sql = String::from(
        "SELECT id, codigo_barra, sku, nombre, descripcion, categoria_id, marca_id,
                precio_compra, precio_venta, precio_mayorista, stock, stock_minimo,
                unidad_medida, es_pesable, precio_por_kg, iva, vencimiento,
                proveedor_id, foto, activo, descuento_porcentaje, descuento_cantidad_minima
         FROM productos WHERE 1=1",
    );

    if solo_activos {
        sql.push_str(" AND activo = 1");
    }
    if solo_stock_bajo {
        sql.push_str(" AND stock <= stock_minimo");
    }
    if let Some(dias) = solo_por_vencer_dias {
        sql.push_str(&format!(
            " AND vencimiento IS NOT NULL AND date(vencimiento) <= date('now', '+{dias} days')"
        ));
    }
    sql.push_str(" ORDER BY nombre LIMIT ?1");

    let mut stmt = conn.prepare(&sql)?;
    let limite_param: i64 = limite;

    let filas = if let Some(t) = texto {
        let patron = format!("%{}%", t);
        let mut stmt2 = conn.prepare(
            &sql.replace("ORDER BY nombre LIMIT ?1", "AND (nombre LIKE ?2 OR sku LIKE ?2 OR codigo_barra LIKE ?2) ORDER BY nombre LIMIT ?1"),
        )?;
        let it = stmt2.query_map(params![limite_param, patron], mapear_fila)?;
        it.filter_map(|r| r.ok()).collect::<Vec<_>>()
    } else {
        let it = stmt.query_map(params![limite_param], mapear_fila)?;
        it.filter_map(|r| r.ok()).collect::<Vec<_>>()
    };

    Ok(filas)
}

pub fn crear(conn: &Connection, p: &Producto) -> Result<i64, DbError> {
    conn.execute(
        "INSERT INTO productos (
            codigo_barra, sku, nombre, descripcion, categoria_id, marca_id,
            precio_compra, precio_venta, precio_mayorista, stock, stock_minimo,
            unidad_medida, es_pesable, precio_por_kg, iva, vencimiento,
            proveedor_id, foto, activo, descuento_porcentaje, descuento_cantidad_minima
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21)",
        params![
            p.codigo_barra, p.sku, p.nombre, p.descripcion, p.categoria_id, p.marca_id,
            p.precio_compra, p.precio_venta, p.precio_mayorista, p.stock, p.stock_minimo,
            p.unidad_medida, p.es_pesable, p.precio_por_kg, p.iva, p.vencimiento,
            p.proveedor_id, p.foto, p.activo, p.descuento_porcentaje, p.descuento_cantidad_minima
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Actualiza todos los campos editables de un producto (no toca `stock` — eso
/// se hace con ajustar_stock para que quede el movimiento registrado).
pub fn actualizar(conn: &Connection, p: &Producto) -> Result<(), DbError> {
    let id = p.id.ok_or_else(|| DbError::Negocio("Falta el ID del producto.".into()))?;
    conn.execute(
        "UPDATE productos SET
            codigo_barra = ?1, sku = ?2, nombre = ?3, descripcion = ?4,
            categoria_id = ?5, marca_id = ?6, precio_compra = ?7, precio_venta = ?8,
            precio_mayorista = ?9, stock_minimo = ?10, unidad_medida = ?11,
            es_pesable = ?12, precio_por_kg = ?13, iva = ?14, vencimiento = ?15,
            proveedor_id = ?16, foto = ?17, activo = ?18,
            descuento_porcentaje = ?19,
            descuento_cantidad_minima = ?20,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id = ?21",
        params![
            p.codigo_barra, p.sku, p.nombre, p.descripcion,
            p.categoria_id, p.marca_id, p.precio_compra, p.precio_venta,
            p.precio_mayorista, p.stock_minimo, p.unidad_medida,
            p.es_pesable, p.precio_por_kg, p.iva, p.vencimiento,
            p.proveedor_id, p.foto, p.activo, p.descuento_porcentaje, p.descuento_cantidad_minima, id
        ],
    )?;
    Ok(())
}

pub fn desactivar(conn: &Connection, id: i64) -> Result<(), DbError> {
    conn.execute("UPDATE productos SET activo = 0 WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn reactivar(conn: &Connection, id: i64) -> Result<(), DbError> {
    conn.execute("UPDATE productos SET activo = 1 WHERE id = ?1", params![id])?;
    Ok(())
}

fn mapear_fila(row: &rusqlite::Row) -> rusqlite::Result<Producto> {
    Ok(Producto {
        id: row.get(0)?,
        codigo_barra: row.get(1)?,
        sku: row.get(2)?,
        nombre: row.get(3)?,
        descripcion: row.get(4)?,
        categoria_id: row.get(5)?,
        marca_id: row.get(6)?,
        precio_compra: row.get(7)?,
        precio_venta: row.get(8)?,
        precio_mayorista: row.get(9)?,
        stock: row.get(10)?,
        stock_minimo: row.get(11)?,
        unidad_medida: row.get(12)?,
        es_pesable: row.get::<_, i64>(13)? != 0,
        precio_por_kg: row.get(14)?,
        iva: row.get(15)?,
        vencimiento: row.get(16)?,
        proveedor_id: row.get(17)?,
        foto: row.get(18)?,
        activo: row.get::<_, i64>(19)? != 0,
        descuento_porcentaje: row.get(20)?,
        descuento_cantidad_minima: row.get(21)?,
    })
}
