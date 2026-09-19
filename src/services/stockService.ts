import { invoke } from "@tauri-apps/api/tauri";

export interface StockBajo {
  id: number;
  nombre: string;
  stock: number;
  stock_minimo: number;
  unidad_medida: string;
}

export interface ProductoVencimiento {
  id: number;
  nombre: string;
  stock: number;
  unidad_medida: string;
  vencimiento: string;
  dias_restantes: number;
}

export interface ContadorAlertas {
  stock_bajo: number;
  vencidos: number;
  por_vencer: number;
}

export async function listarStockBajo(): Promise<StockBajo[]> {
  return invoke<StockBajo[]>("listar_stock_bajo");
}

export async function listarProductosVencidos(): Promise<ProductoVencimiento[]> {
  return invoke<ProductoVencimiento[]>("listar_productos_vencidos");
}

export async function listarProductosProximosVencer(
  dias: number,
): Promise<ProductoVencimiento[]> {
  return invoke<ProductoVencimiento[]>("listar_productos_proximos_vencer", { dias });
}

export async function contarAlertasStock(diasProximos: number): Promise<ContadorAlertas> {
  return invoke<ContadorAlertas>("contar_alertas_stock", { diasProximos });
}

export type TipoAjusteStock =
  | "AJUSTE"
  | "PERDIDA"
  | "ROTURA"
  | "VENCIMIENTO"
  | "ENTRADA";

export async function ajustarStockManual(
  productoId: number,
  cantidadDelta: number,
  tipo: TipoAjusteStock,
  motivo: string,
  usuarioId: number,
): Promise<number> {
  return invoke<number>("ajustar_stock_manual", {
    productoId,
    cantidadDelta,
    tipo,
    motivo,
    usuarioId,
  });
}