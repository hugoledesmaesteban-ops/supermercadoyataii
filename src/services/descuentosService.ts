import { invoke } from "@tauri-apps/api/tauri";

export async function aplicarDescuentoProducto(
  productoId: number,
  porcentaje: number,
  cantidadMinima: number,
  usuarioId: number,
): Promise<void> {
  return invoke<void>("aplicar_descuento_producto", {
    productoId,
    porcentaje,
    cantidadMinima,
    usuarioId,
  });
}

export async function quitarDescuentoProducto(
  productoId: number,
  usuarioId: number,
): Promise<void> {
  return invoke<void>("quitar_descuento_producto", {
    productoId,
    usuarioId,
  });
}
