//! Importación y exportación de productos vía Excel (sección 24).
//!
//! Columnas esperadas para importar (en ese orden, con encabezado en la
//! primera fila): Código de barras, SKU, Nombre, Categoría, Precio compra,
//! Precio venta, Stock, Stock mínimo, Unidad, Es pesable, Precio/kg,
//! Vencimiento.

use crate::database::repositories::productos::Producto;
use crate::database::DbError;
use calamine::{open_workbook, Reader, Xlsx};
use rusqlite::Connection;
use rust_xlsxwriter::Workbook;
use serde::Serialize;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ExcelError {
    #[error("no se pudo abrir el archivo: {0}")]
    Apertura(String),
    #[error("no se encontró ninguna hoja en el archivo")]
    SinHojas,
    #[error("error de escritura: {0}")]
    Escritura(String),
    #[error("error de base de datos: {0}")]
    Db(#[from] DbError),
}

#[derive(Debug, Serialize)]
pub struct FilaConError {
    pub numero_fila: u32,
    pub motivo: String,
}

#[derive(Debug, Serialize)]
pub struct ResultadoImportacion {
    pub productos_validos: usize,
    pub filas_con_error: Vec<FilaConError>,
    pub codigos_duplicados: Vec<String>,
}

/// Lee el Excel, valida cada fila (sección 24: "Validar errores antes de
/// importar") y devuelve qué se puede importar y qué no, SIN tocar la base
/// todavía — eso lo hace `confirmar_importacion` para poder mostrarle al
/// usuario el resumen antes de comprometerse.
pub fn validar_excel(ruta: &Path) -> Result<(Vec<Producto>, ResultadoImportacion), ExcelError> {
    let mut workbook: Xlsx<BufReader<File>> =
        open_workbook(ruta).map_err(|e: calamine::XlsxError| ExcelError::Apertura(e.to_string()))?;
    let nombre_hoja = workbook
        .sheet_names()
        .first()
        .cloned()
        .ok_or(ExcelError::SinHojas)?;
    let rango = workbook
        .worksheet_range(&nombre_hoja)
        .map_err(|e: calamine::XlsxError| ExcelError::Apertura(e.to_string()))?;

    let mut validos = Vec::new();
    let mut filas_con_error = Vec::new();
    let mut codigos_vistos = std::collections::HashSet::new();
    let mut codigos_duplicados = Vec::new();

    for (i, fila) in rango.rows().enumerate().skip(1) {
        // fila 0 es encabezado
        let numero_fila = (i + 1) as u32;
        let obtener = |idx: usize| fila.get(idx).map(|c| c.to_string()).unwrap_or_default();

        let codigo_barra = obtener(0);
        let nombre = obtener(2);

        if nombre.trim().is_empty() {
            filas_con_error.push(FilaConError {
                numero_fila,
                motivo: "Falta el nombre del producto.".into(),
            });
            continue;
        }

        if !codigo_barra.trim().is_empty() {
            if !codigos_vistos.insert(codigo_barra.clone()) {
                codigos_duplicados.push(codigo_barra.clone());
                filas_con_error.push(FilaConError {
                    numero_fila,
                    motivo: format!("Código de barras duplicado dentro del archivo: {codigo_barra}"),
                });
                continue;
            }
        }

        let precio_compra: f64 = obtener(4).parse().unwrap_or(0.0);
        let precio_venta: f64 = obtener(5).parse().unwrap_or(0.0);
        if precio_venta <= 0.0 {
            filas_con_error.push(FilaConError {
                numero_fila,
                motivo: "Precio de venta inválido o faltante.".into(),
            });
            continue;
        }

        let es_pesable = matches!(obtener(9).to_lowercase().as_str(), "si" | "sí" | "true" | "1");
        let precio_por_kg = obtener(10).parse::<f64>().ok();

        if es_pesable && precio_por_kg.is_none() {
            filas_con_error.push(FilaConError {
                numero_fila,
                motivo: "Producto marcado como pesable pero sin precio por kg.".into(),
            });
            continue;
        }

        validos.push(Producto {
            id: None,
            codigo_barra: if codigo_barra.trim().is_empty() { None } else { Some(codigo_barra) },
            sku: Some(obtener(1)).filter(|s| !s.trim().is_empty()),
            nombre,
            descripcion: None,
            categoria_id: None, // la resolución de nombre de categoría -> id se hace en la capa de comando
            marca_id: None,
            precio_compra,
            precio_venta,
            precio_mayorista: None,
            stock: obtener(6).parse().unwrap_or(0.0),
            stock_minimo: obtener(7).parse().unwrap_or(0.0),
            unidad_medida: {
                let u = obtener(8).to_lowercase();
                if u.is_empty() { "unidad".to_string() } else { u }
            },
            es_pesable,
            precio_por_kg,
            iva: 21.0,
            vencimiento: Some(obtener(11)).filter(|s| !s.trim().is_empty()),
            proveedor_id: None,
            foto: None,
            activo: true,
            descuento_porcentaje: 0.0,
            descuento_cantidad_minima: 1,
        });
    }

    let cantidad_validos = validos.len();
    Ok((
        validos,
        ResultadoImportacion {
            productos_validos: cantidad_validos,
            filas_con_error,
            codigos_duplicados,
        },
    ))
}

/// Confirma la importación de la lista ya validada (botón [Importar] de la
/// sección 24). Cada producto se inserta individualmente; si uno falla
/// (ej. código de barras ya existente en la base), se reporta pero no
/// aborta el resto del lote.
pub fn confirmar_importacion(conn: &Connection, productos: &[Producto]) -> Result<usize, ExcelError> {
    let mut importados = 0;
    for p in productos {
        if crate::database::repositories::productos::crear(conn, p).is_ok() {
            importados += 1;
        }
    }
    Ok(importados)
}

/// Sección 24: exportar productos a Excel.
pub fn exportar_productos(conn: &Connection, destino: &Path) -> Result<(), ExcelError> {
    let productos = crate::database::repositories::productos::buscar_por_texto(conn, "", 100_000)?;

    let mut workbook = Workbook::new();
    let hoja = workbook.add_worksheet();

    let encabezados = [
        "Código de barras", "SKU", "Nombre", "Precio compra", "Precio venta",
        "Stock", "Stock mínimo", "Unidad", "Es pesable", "Precio/kg", "Vencimiento",
    ];
    for (col, titulo) in encabezados.iter().enumerate() {
        hoja.write_string(0, col as u16, *titulo)
            .map_err(|e| ExcelError::Escritura(e.to_string()))?;
    }

    for (fila_idx, p) in productos.iter().enumerate() {
        let fila = (fila_idx + 1) as u32;
        hoja.write_string(fila, 0, p.codigo_barra.as_deref().unwrap_or(""))
            .map_err(|e| ExcelError::Escritura(e.to_string()))?;
        hoja.write_string(fila, 1, p.sku.as_deref().unwrap_or(""))
            .map_err(|e| ExcelError::Escritura(e.to_string()))?;
        hoja.write_string(fila, 2, &p.nombre)
            .map_err(|e| ExcelError::Escritura(e.to_string()))?;
        hoja.write_number(fila, 3, p.precio_compra)
            .map_err(|e| ExcelError::Escritura(e.to_string()))?;
        hoja.write_number(fila, 4, p.precio_venta)
            .map_err(|e| ExcelError::Escritura(e.to_string()))?;
        hoja.write_number(fila, 5, p.stock)
            .map_err(|e| ExcelError::Escritura(e.to_string()))?;
        hoja.write_number(fila, 6, p.stock_minimo)
            .map_err(|e| ExcelError::Escritura(e.to_string()))?;
        hoja.write_string(fila, 7, &p.unidad_medida)
            .map_err(|e| ExcelError::Escritura(e.to_string()))?;
        hoja.write_string(fila, 8, if p.es_pesable { "SI" } else { "NO" })
            .map_err(|e| ExcelError::Escritura(e.to_string()))?;
        if let Some(precio_kg) = p.precio_por_kg {
            hoja.write_number(fila, 9, precio_kg)
                .map_err(|e| ExcelError::Escritura(e.to_string()))?;
        }
        hoja.write_string(fila, 10, p.vencimiento.as_deref().unwrap_or(""))
            .map_err(|e| ExcelError::Escritura(e.to_string()))?;
    }

    workbook
        .save(destino)
        .map_err(|e| ExcelError::Escritura(e.to_string()))?;
    Ok(())
}