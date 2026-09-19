import { invoke } from "@tauri-apps/api/tauri";

export interface EstadoLicenciaSimple {
  activa: boolean;
  vence_en: string;
  dias_restantes: number;
  por_vencer: boolean;
  horas_desde_ultima_activacion: number;
}

export async function estadoLicenciaSimple(): Promise<EstadoLicenciaSimple> {
  return invoke<EstadoLicenciaSimple>("estado_licencia_simple");
}

export async function activarLicencia30Dias(usuarioNombre: string): Promise<string> {
  return invoke<string>("activar_licencia_30_dias", { usuarioNombre });
}
