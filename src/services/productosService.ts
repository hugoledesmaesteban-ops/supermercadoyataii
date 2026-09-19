import { invoke } from "@tauri-apps/api/tauri";
import type { Producto } from "@/types/producto";

export async function buscarProductoPorCodigo(codigoBarra: string): Promise<Producto | null> {
  return invoke<Producto | null>("buscar_producto_por_codigo", { codigoBarra });
}

export async function buscarProductosPorTexto(texto: string): Promise<Producto[]> {
  return invoke<Producto[]>("buscar_productos_por_texto", { texto });
}

export interface FiltrosProductos {
  texto?: string | null;
  soloActivos?: boolean;
  soloStockBajo?: boolean;
  soloPorVencerDias?: number | null;
}

export async function listarProductosFiltrado(f: FiltrosProductos = {}): Promise<Producto[]> {
  return invoke<Producto[]>("listar_productos_filtrado", {
    texto: f.texto ?? null,
    soloActivos: f.soloActivos ?? true,
    soloStockBajo: f.soloStockBajo ?? false,
    soloPorVencerDias: f.soloPorVencerDias ?? null,
  });
}

export async function crearProducto(producto: Producto, usuarioId: number): Promise<number> {
  return invoke<number>("crear_producto", { producto, usuarioId });
}

export async function actualizarProducto(producto: Producto, usuarioId: number): Promise<void> {
  return invoke<void>("actualizar_producto", { producto, usuarioId });
}

export async function actualizarPrecioProducto(
  productoId: number,
  nuevoPrecio: number,
  usuarioId: number,
): Promise<void> {
  return invoke<void>("actualizar_precio_producto", { productoId, nuevoPrecio, usuarioId });
}

export async function desactivarProducto(productoId: number, usuarioId: number): Promise<void> {
  return invoke<void>("desactivar_producto", { productoId, usuarioId });
}

export async function reactivarProducto(productoId: number, usuarioId: number): Promise<void> {
  return invoke<void>("reactivar_producto", { productoId, usuarioId });
}

export interface StockBajo {
  id: number;
  nombre: string;
  stock: number;
  stock_minimo: number;
  unidad_medida: string;
}

export async function listarStockBajo(): Promise<StockBajo[]> {
  return invoke<StockBajo[]>("listar_stock_bajo");
}
