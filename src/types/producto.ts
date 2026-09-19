// Espejo del struct `Producto` en src-tauri/src/database/repositories/productos.rs
// y de la tabla `productos` (migración 0002). Mantener sincronizado a mano:
// no hay generación automática de tipos en este proyecto todavía.

export type UnidadMedida = "unidad" | "kg" | "gramos" | "litros" | "metros";

export interface Producto {
  id: number | null;
  codigo_barra: string | null;
  sku: string | null;
  nombre: string;
  descripcion: string | null;
  categoria_id: number | null;
  marca_id: number | null;
  precio_compra: number;
  precio_venta: number;
  precio_mayorista: number | null;
  stock: number;
  stock_minimo: number;
  unidad_medida: UnidadMedida;
  es_pesable: boolean;
  precio_por_kg: number | null;
  iva: number;
  vencimiento: string | null;
  proveedor_id: number | null;
  foto: string | null;
  activo: boolean;
  descuento_porcentaje: number;
  descuento_cantidad_minima: number;
}
