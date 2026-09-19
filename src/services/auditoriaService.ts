import { invoke } from "@tauri-apps/api/tauri";

export interface EventoAuditoria {
  id: number;
  fecha: string;
  usuario_id: number | null;
  usuario_nombre: string | null;
  accion: string;
  entidad: string | null;
  entidad_id: number | null;
  detalle: string | null;
}

export interface FiltrosAuditoria {
  usuarioId?: number | null;
  accion?: string | null;
  desde?: string | null;
  hasta?: string | null;
  limite?: number;
}

export async function listarAuditoria(
  filtros: FiltrosAuditoria = {},
): Promise<EventoAuditoria[]> {
  return invoke<EventoAuditoria[]>("listar_auditoria", {
    usuarioId: filtros.usuarioId ?? null,
    accion: filtros.accion ?? null,
    desde: filtros.desde ?? null,
    hasta: filtros.hasta ?? null,
    limite: filtros.limite ?? 200,
  });
}

export async function listarAccionesAuditoria(): Promise<string[]> {
  return invoke<string[]>("listar_acciones_auditoria");
}