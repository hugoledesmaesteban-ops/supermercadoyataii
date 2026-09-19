import { invoke } from "@tauri-apps/api/tauri";

export interface ItemTicket {
  nombre: string;
  cantidad_display: string;
  precio_unitario: number;
  total: number;
}

export interface PagoTicket {
  metodo: string;
  monto: number;
}

export interface DatosTicket {
  nombre_comercio: string;
  direccion: string;
  localidad_provincia: string;
  telefono: string;
  cuit: string;
  numero_venta: string;
  fecha: string;
  hora: string;
  items: ItemTicket[];
  subtotal: number;
  descuento: number;
  total: number;
  pagos: PagoTicket[];
  vuelto: number;
  mensaje_final: string;
}

export interface ConfigImpresora {
  ip: string;
  puerto: number;
}

export type ModoImpresora = "ethernet" | "usb";

export interface EstadoImpresora {
  Conectada?: null;
  Desconectada?: null;
  Error?: string;
}

const CLAVES = {
  modo: "impresora_modo",
  ip: "impresora_ip",
  puerto: "impresora_puerto",
  nombreWindows: "impresora_nombre_windows",
  nombre: "comercio_nombre",
  direccion: "comercio_direccion",
  localidad: "comercio_localidad",
  telefono: "comercio_telefono",
  cuit: "comercio_cuit",
  mensaje: "ticket_mensaje_final",
} as const;

async function leerClave(clave: string): Promise<string> {
  try {
    const v = await invoke<string | null>("obtener_configuracion", { clave });
    return v ?? "";
  } catch {
    return "";
  }
}

async function guardarClave(clave: string, valor: string): Promise<void> {
  await invoke<void>("guardar_configuracion", { clave, valor });
}

// ---------- Modo de impresora ----------

export async function leerModoImpresora(): Promise<ModoImpresora> {
  const m = await leerClave(CLAVES.modo);
  return m === "usb" ? "usb" : "ethernet";
}

export async function guardarModoImpresora(modo: ModoImpresora): Promise<void> {
  await guardarClave(CLAVES.modo, modo);
}

// ---------- Ethernet ----------

export async function leerConfigImpresora(): Promise<ConfigImpresora | null> {
  const ip = await leerClave(CLAVES.ip);
  const puertoStr = await leerClave(CLAVES.puerto);
  if (!ip || !puertoStr) return null;
  const puerto = parseInt(puertoStr, 10);
  if (isNaN(puerto) || puerto <= 0 || puerto > 65535) return null;
  return { ip, puerto };
}

// ---------- USB (Windows) ----------

export async function leerNombreImpresoraUsb(): Promise<string | null> {
  const n = await leerClave(CLAVES.nombreWindows);
  return n || null;
}

export async function guardarNombreImpresoraUsb(nombre: string): Promise<void> {
  await guardarClave(CLAVES.nombreWindows, nombre);
}

// ---------- Comercio ----------

export interface ConfigComercio {
  nombre_comercio: string;
  direccion: string;
  localidad_provincia: string;
  telefono: string;
  cuit: string;
  mensaje_final: string;
}

export async function leerConfigComercio(): Promise<ConfigComercio> {
  const [nombre, direccion, localidad, telefono, cuit, mensaje] = await Promise.all([
    leerClave(CLAVES.nombre),
    leerClave(CLAVES.direccion),
    leerClave(CLAVES.localidad),
    leerClave(CLAVES.telefono),
    leerClave(CLAVES.cuit),
    leerClave(CLAVES.mensaje),
  ]);
  return {
    nombre_comercio: nombre || "SUPER YATAY",
    direccion,
    localidad_provincia: localidad,
    telefono,
    cuit,
    mensaje_final: mensaje || "¡Gracias por su compra!",
  };
}

// ---------- Operaciones de impresión ----------

export async function imprimirTicket(
  config: ConfigImpresora,
  ticket: DatosTicket,
): Promise<void> {
  return invoke<void>("imprimir_ticket_ethernet", {
    ip: config.ip,
    puerto: config.puerto,
    ticket,
  });
}

export async function imprimirTicketUsb(
  nombreImpresora: string,
  ticket: DatosTicket,
): Promise<void> {
  return invoke<void>("imprimir_ticket_usb", { nombreImpresora, ticket });
}

export async function abrirCajon(config: ConfigImpresora): Promise<void> {
  return invoke<void>("abrir_cajon_ethernet", { ip: config.ip, puerto: config.puerto });
}

export async function abrirCajonUsb(nombreImpresora: string): Promise<void> {
  return invoke<void>("abrir_cajon_usb", { nombreImpresora });
}

export async function probarImpresora(config: ConfigImpresora): Promise<void> {
  return invoke<void>("probar_impresora_ethernet", { ip: config.ip, puerto: config.puerto });
}

export async function probarImpresoraUsb(nombreImpresora: string): Promise<void> {
  return invoke<void>("probar_impresora_usb", { nombreImpresora });
}

export async function estadoImpresora(config: ConfigImpresora): Promise<EstadoImpresora> {
  return invoke<EstadoImpresora>("estado_impresora_ethernet", {
    ip: config.ip,
    puerto: config.puerto,
  });
}

export function formatearFechaHora(d: Date): { fecha: string; hora: string } {
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return { fecha: `${dia}/${mes}/${anio}`, hora: `${hh}:${mm}` };
}
