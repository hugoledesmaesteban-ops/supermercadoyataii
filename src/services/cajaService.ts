import { invoke } from "@tauri-apps/api/tauri";

export interface Caja {
  id: number;
  monto_apertura: number;
  fecha_apertura: string;
  estado: string;
}

export interface ResumenCierre {
  cantidad_tickets: number;
  total_vendido: number;
  efectivo: number;
  transferencia: number;
  tarjeta: number;
  qr: number;
  otros: number;
  retiros: number;
  ingresos: number;
  gastos: number;
  efectivo_esperado: number;
}

export interface MovimientoCaja {
  id: number;
  fecha: string;
  tipo: string;
  metodo_pago: string | null;
  monto: number;
  motivo: string | null;
  usuario_id: number;
  usuario_nombre: string | null;
}

export interface CierreAnterior {
  id: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
  monto_apertura: number;
  efectivo_esperado: number | null;
  efectivo_declarado: number | null;
  diferencia: number | null;
  usuario_apertura_id: number;
  usuario_apertura_nombre: string | null;
  usuario_cierre_id: number | null;
  usuario_cierre_nombre: string | null;
}

export type TipoMovimientoCaja = "RETIRO" | "INGRESO" | "GASTO";

export async function obtenerCajaAbierta(): Promise<Caja | null> {
  return invoke<Caja | null>("obtener_caja_abierta");
}

export async function abrirCaja(usuarioId: number, montoApertura: number): Promise<number> {
  return invoke<number>("abrir_caja", { usuarioId, montoApertura });
}

export async function registrarMovimientoCaja(
  cajaId: number,
  tipo: TipoMovimientoCaja,
  monto: number,
  motivo: string,
  usuarioId: number,
): Promise<void> {
  return invoke<void>("registrar_movimiento_caja", {
    cajaId, tipo, monto, motivo, usuarioId,
  });
}

export async function calcularResumenCierre(cajaId: number): Promise<ResumenCierre> {
  return invoke<ResumenCierre>("calcular_resumen_cierre", { cajaId });
}

export async function cerrarCaja(
  cajaId: number,
  usuarioId: number,
  efectivoDeclarado: number,
): Promise<number> {
  return invoke<number>("cerrar_caja", { cajaId, usuarioId, efectivoDeclarado });
}

export async function listarMovimientosCaja(
  cajaId: number,
  incluirVentas = false,
): Promise<MovimientoCaja[]> {
  return invoke<MovimientoCaja[]>("listar_movimientos_caja", { cajaId, incluirVentas });
}

export async function listarCierresAnteriores(limite = 30): Promise<CierreAnterior[]> {
  return invoke<CierreAnterior[]>("listar_cierres_anteriores", { limite });
}
