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

export interface VentaParaAnular {
  id: number;
  numero: string;
  fecha: string;
  total: number;
  estado: string;
  cantidad_items: number;
}

export async function listarVentasParaAnular(
  desde: string | null,
  hasta: string | null,
  limite?: number,
): Promise<VentaParaAnular[]> {
  return invoke<VentaParaAnular[]>("listar_ventas_para_anular", {
    desde,
    hasta,
    limite: limite ?? 200,
  });
}

export async function anularVenta(
  ventaId: number,
  usuarioId: number,
  password: string,
): Promise<void> {
  return invoke<void>("anular_venta", { ventaId, usuarioId, password });
}
