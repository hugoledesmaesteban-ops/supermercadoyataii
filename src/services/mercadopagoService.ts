import { invoke } from "@tauri-apps/api/tauri";

export interface ConfigMercadoPagoPublica {
  user_id: string;
  external_pos_id: string;
  alias: string;
  configurado: boolean;
}

export interface QRData {
  qr_texto: string;
  external_reference: string;
  in_store_order_id: string | null;
}

export interface EstadoPagoMp {
  aprobado: boolean;
  payment_id: number | null;
  monto: number | null;
}

export async function guardarConfigMercadoPago(
  userId: string,
  externalPosId: string,
  alias: string,
  accessToken: string,
): Promise<void> {
  return invoke<void>("guardar_config_mercadopago", {
    userId,
    externalPosId,
    alias,
    accessToken,
  });
}

export async function obtenerConfigMercadoPago(): Promise<ConfigMercadoPagoPublica> {
  return invoke<ConfigMercadoPagoPublica>("obtener_config_mercadopago");
}

export async function crearQrMercadoPago(monto: number): Promise<QRData> {
  return invoke<QRData>("crear_qr_mercadopago", { monto });
}

export async function verificarPagoMercadoPago(externalReference: string): Promise<EstadoPagoMp> {
  return invoke<EstadoPagoMp>("verificar_pago_mercadopago", { externalReference });
}

export async function verificarTransferenciaPorAlias(monto: number): Promise<EstadoPagoMp> {
  return invoke<EstadoPagoMp>("verificar_transferencia_por_alias", { monto });
}
