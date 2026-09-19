import { invoke } from "@tauri-apps/api/tauri";

export interface ResumenDashboard {
  ventas_hoy: number;
  ventas_semana: number;
  ventas_mes: number;
  ganancia_estimada_mes: number;
  ticket_promedio_mes: number;
  cantidad_ventas_mes: number;
}

export interface ProductoMasVendido {
  producto_id: number;
  nombre: string;
  unidades_vendidas: number;
}

export interface TotalPorMetodoPago {
  metodo: string;
  total: number;
}

export const obtenerResumenDashboard = () =>
  invoke<ResumenDashboard>("obtener_resumen_dashboard");

export const obtenerProductosMasVendidos = (dias: number) =>
  invoke<ProductoMasVendido[]>("obtener_productos_mas_vendidos", { dias });

export const obtenerTotalesPorMetodoPago = (dias: number) =>
  invoke<TotalPorMetodoPago[]>("obtener_totales_por_metodo_pago", { dias });

export interface GananciaPeriodo {
  facturacion: number;
  descuento: number;
  costo: number;
  ganancia: number;
  margen_pct: number;
  cantidad_tickets: number;
  cantidad_unidades: number;
}

export interface GananciaPorProducto {
  producto_id: number;
  nombre: string;
  unidades: number;
  facturacion: number;
  costo: number;
  ganancia: number;
  margen_pct: number;
}

export async function obtenerGananciaPeriodo(
  desde: string,
  hasta: string,
): Promise<GananciaPeriodo> {
  return invoke<GananciaPeriodo>("obtener_ganancia_periodo", { desde, hasta });
}

export async function obtenerGananciaPorProducto(
  desde: string,
  hasta: string,
  limite: number = 50,
): Promise<GananciaPorProducto[]> {
  return invoke<GananciaPorProducto[]>("obtener_ganancia_por_producto", {
    desde,
    hasta,
    limite,
  });
}
