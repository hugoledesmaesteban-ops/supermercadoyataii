import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSesionStore } from "@/store/sesionStore";
import { puedeAcceder } from "@/config/permisosPorRol";

interface Props {
  ruta: string;
  children: ReactNode;
}

/**
 * Envuelve una ruta y bloquea el acceso si el rol del usuario no está
 * autorizado. Redirige a /venta si intenta entrar a una ruta prohibida.
 */
export default function RutaProtegidaPorRol({ ruta, children }: Props) {
  const usuario = useSesionStore((s) => s.usuario);
  if (!usuario) return <Navigate to="/login" replace />;
  if (!puedeAcceder(usuario.rol, ruta)) return <Navigate to="/venta" replace />;
  return <>{children}</>;
}
