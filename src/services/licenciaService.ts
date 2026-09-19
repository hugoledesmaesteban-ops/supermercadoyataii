import { invoke } from "@tauri-apps/api/tauri";

export type EstadoLicencia =
  | { Activa: { dias_restantes: number | null } }
  | "Vencida"
  | { Desactivada: { mensaje_soporte: string | null } }
  | "SinDatos";

export const verificarEstadoLicencia = () => invoke<EstadoLicencia>("verificar_estado_licencia");
