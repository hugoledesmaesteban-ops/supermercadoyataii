import { invoke } from "@tauri-apps/api/tauri";
import type { VentaSuspendida } from "@/types/venta";

/** Guarda el carrito actual (serializado a JSON) y devuelve el número asignado (SUSP-000123). */
export async function suspenderVenta(
  cajaId: number,
  usuarioId: number,
  carritoJson: string,
): Promise<string> {
  return invoke<string>("suspender_venta", { cajaId, usuarioId, carritoJson });
}

/** Lista las ventas suspendidas de una caja, más recientes primero. */
export async function listarVentasSuspendidas(cajaId: number): Promise<VentaSuspendida[]> {
  return invoke<VentaSuspendida[]>("listar_ventas_suspendidas", { cajaId });
}

/** Recupera y ELIMINA la venta suspendida. Devuelve el JSON del carrito. */
export async function recuperarVentaSuspendida(id: number): Promise<string> {
  return invoke<string>("recuperar_venta_suspendida", { id });
}

/** Elimina una venta suspendida sin recuperarla. */
export async function eliminarVentaSuspendida(id: number): Promise<void> {
  return invoke<void>("eliminar_venta_suspendida", { id });
}