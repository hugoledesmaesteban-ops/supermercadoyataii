import { invoke } from "@tauri-apps/api/tauri";

export interface DatosComercio {
  nombre: string;
  direccion: string;
  localidad: string;
  provincia: string;
  telefono: string;
  cuit: string;
  email: string;
  mensajeFinal: string;
}

export async function obtenerDatosComercio(): Promise<DatosComercio | null> {
  const valor = await invoke<string | null>("obtener_configuracion", { clave: "comercio" });
  return valor ? JSON.parse(valor) : null;
}

export async function guardarDatosComercio(datos: DatosComercio): Promise<void> {
  return invoke<void>("guardar_configuracion", { clave: "comercio", valor: JSON.stringify(datos) });
}

export type EstadoImpresora = "Conectada" | "Desconectada" | { Error: string };

export const probarImpresoraEthernet = (ip: string, puerto: number) =>
  invoke<void>("probar_impresora_ethernet", { ip, puerto });

export const estadoImpresoraEthernet = (ip: string, puerto: number) =>
  invoke<EstadoImpresora>("estado_impresora_ethernet", { ip, puerto });

export const abrirCajonEthernet = (ip: string, puerto: number) =>
  invoke<void>("abrir_cajon_ethernet", { ip, puerto });

export const detectarPuertosBalanza = () => invoke<string[]>("detectar_puertos_balanza");
