// Espejo de src-tauri/src/database/repositories/ventas.rs

export type MetodoPago = "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "QR" | "OTRO";
export type OrigenPeso = "AUTOMATICO" | "MANUAL";

export interface ItemVentaInput {
  producto_id: number;
  cantidad: number;
  es_pesable: boolean;
  origen_peso: OrigenPeso | null;
  precio_unitario: number;
  descuento: number;
  promocion_id: number | null;
}

export interface PagoInput {
  metodo: MetodoPago;
  monto: number;
  monto_recibido: number | null;
}

export interface VentaConfirmada {
  venta_id: number;
  numero: string;
  subtotal: number;
  descuento: number;
  total: number;
  vuelto_total: number;
}

/** Espejo de database::repositories::ventas_suspendidas::VentaSuspendida */
export interface VentaSuspendida {
  id: number;
  numero: string;
  usuario_id: number;
  fecha: string; // ISO 8601 UTC
}