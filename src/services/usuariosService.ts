import { invoke } from "@tauri-apps/api/tauri";

export interface UsuarioSesion {
  id: number;
  nombre_usuario: string;
  nombre_completo: string;
  rol: string;
}

export interface UsuarioListado {
  id: number;
  nombre_usuario: string;
  nombre_completo: string;
  rol: string;
  activo: boolean;
  ultimo_login: string | null;
}

export interface Rol {
  id: number;
  nombre: string;
}

export async function iniciarSesion(nombreUsuario: string, password: string): Promise<UsuarioSesion | null> {
  return invoke<UsuarioSesion | null>("iniciar_sesion", { nombreUsuario, password });
}

export async function usuarioTienePermiso(usuarioId: number, clavePermiso: string): Promise<boolean> {
  return invoke<boolean>("usuario_tiene_permiso", { usuarioId, clavePermiso });
}

export async function crearUsuario(
  nombreUsuario: string,
  nombreCompleto: string,
  password: string,
  rolId: number,
): Promise<number> {
  return invoke<number>("crear_usuario", { nombreUsuario, nombreCompleto, password, rolId });
}

export async function verificarAutorizacion(
  nombreUsuario: string,
  password: string,
  permiso: string,
): Promise<boolean> {
  return invoke<boolean>("verificar_autorizacion", { nombreUsuario, password, permiso });
}

export async function listarUsuarios(): Promise<UsuarioListado[]> {
  return invoke<UsuarioListado[]>("listar_usuarios");
}

export async function listarRoles(): Promise<Rol[]> {
  return invoke<Rol[]>("listar_roles");
}

export async function cambiarPasswordUsuario(
  usuarioId: number,
  nuevaPassword: string,
  adminId: number,
): Promise<void> {
  return invoke<void>("cambiar_password_usuario", { usuarioId, nuevaPassword, adminId });
}

export async function toggleActivoUsuario(
  usuarioId: number,
  activo: boolean,
  adminId: number,
): Promise<void> {
  return invoke<void>("toggle_activo_usuario", { usuarioId, activo, adminId });
}

export async function contarUsuarios(): Promise<number> {
  return invoke<number>("contar_usuarios");
}

export async function inicializarSistema(
  nombreUsuario: string,
  nombreCompleto: string,
  password: string,
): Promise<number> {
  return invoke<number>("inicializar_sistema", {
    nombreUsuario,
    nombreCompleto,
    password,
  });
}
