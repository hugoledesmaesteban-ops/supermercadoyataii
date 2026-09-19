import { invoke } from "@tauri-apps/api/tauri";

export interface ItemVentaParaDevolucion {
  detalle_venta_id: number;
  producto_id: number;
  nombre_producto: string;
  cantidad: number;
  es_pesable: boolean;
  precio_unitario: number;
  subtotal: number;
  cantidad_ya_devuelta: number;
  cantidad_disponible: number;
}

export interface VentaParaDevolucion {
  venta_id: number;
  numero: string;
  fecha: string;
  total: number;
  usuario_id: number;
  items: ItemVentaParaDevolucion[];
}

export interface ItemDevolucionInput {
  detalle_venta_id: number;
  producto_id: number;
  cantidad: number;
  subtotal: number;
}

export interface DevolucionRegistrada {
  devolucion_id: number;
  numero: string;
  total: number;
}

export async function buscarVentaParaDevolucion(
  numero: string,
): Promise<VentaParaDevolucion | null> {
  return invoke<VentaParaDevolucion | null>("buscar_venta_para_devolucion", { numero });
}

export async function registrarDevolucion(
  ventaId: number,
  usuarioId: number,
  motivo: string,
  items: ItemDevolucionInput[],
): Promise<DevolucionRegistrada> {
  return invoke<DevolucionRegistrada>("registrar_devolucion", {
    ventaId,
    usuarioId,
    motivo,
    items,
  });
}