// Mapa de rutas por rol.

export type Rol = "ADMINISTRADOR" | "GERENTE" | "CAJERO";

export const RUTAS_POR_ROL: Record<Rol, string[]> = {
  // ADMINISTRADOR = Developer (hlsistemas). SOLO ve Configuración.
  ADMINISTRADOR: ["/configuracion"],

  // GERENTE = Dueño del comercio.
  GERENTE: [
    "/venta",
    "/productos",
    "/descuentos",
    "/promociones",
    "/dashboard",
    "/rentabilidad",
    "/auditoria",
    "/configuracion",
    "/cierre-caja",
  ],

  // CAJERO — solo lo mínimo.
  CAJERO: [
    "/venta",
    "/caja",
    "/cierre-caja",
  ],
};

export function puedeAcceder(rol: string | undefined, ruta: string): boolean {
  if (!rol) return false;
  const permitidas = RUTAS_POR_ROL[rol as Rol];
  if (!permitidas) return false;
  return permitidas.includes(ruta);
}

export function primeraRutaPermitida(rol: string | undefined): string {
  if (!rol) return "/login";
  const permitidas = RUTAS_POR_ROL[rol as Rol];
  return permitidas?.[0] ?? "/login";
}
