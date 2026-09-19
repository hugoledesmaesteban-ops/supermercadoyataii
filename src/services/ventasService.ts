import { invoke } from "@tauri-apps/api/tauri";
import type { ItemVentaInput, PagoInput, VentaConfirmada } from "@/types/venta";

export async function confirmarVenta(
  cajaId: number,
  usuarioId: number,
  clienteId: number | null,
  items: ItemVentaInput[],
  pagos: PagoInput[],
): Promise<VentaConfirmada> {
  return invoke<VentaConfirmada>("confirmar_venta", {
    cajaId,
    usuarioId,
    clienteId,
    items,
    pagos,
  });
}
