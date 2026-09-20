import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSesionStore } from "@/store/sesionStore";
import { RUTAS_POR_ROL, type Rol } from "@/config/permisosPorRol";
import logoSuperYatay from "@/assets/logo-super-yatay.png";

interface ItemNav {
  ruta: string;
  etiqueta: string;
  icono: string;
}

const TODOS_LOS_ITEMS: ItemNav[] = [
  { ruta: "/venta", etiqueta: "Venta", icono: "🛒" },
  { ruta: "/productos", etiqueta: "Productos", icono: "📦" },
  { ruta: "/descuentos", etiqueta: "Descuentos", icono: "🏷️" },
  { ruta: "/promociones", etiqueta: "Promociones", icono: "🏷️" },
  { ruta: "/dashboard", etiqueta: "Reportes", icono: "📊" },
  { ruta: "/rentabilidad", etiqueta: "Rentabilidad", icono: "📈" },
  { ruta: "/caja", etiqueta: "Caja", icono: "💰" },
  { ruta: "/auditoria", etiqueta: "Auditoría", icono: "📋" },
  { ruta: "/historial-ventas", etiqueta: "Historial Ventas", icono: "🧾" },
  { ruta: "/configuracion", etiqueta: "Configuración", icono: "⚙️" },
  { ruta: "/cierre-caja", etiqueta: "Cerrar caja", icono: "🔒" },
];

const ETIQUETA_ROL: Record<string, string> = {
  ADMINISTRADOR: "🔧 Developer",
  GERENTE: "👑 Dueño",
  CAJERO: "🧑‍💼 Cajero",
};

export default function Layout() {
  const { usuario, cerrarSesion } = useSesionStore();
  const navigate = useNavigate();

  const rol = usuario?.rol ?? "";
  const rutasPermitidas = (RUTAS_POR_ROL[rol as Rol] ?? []) as string[];
  const itemsVisibles = TODOS_LOS_ITEMS.filter((i) =>
    rutasPermitidas.includes(i.ruta),
  );

  return (
    <div className="min-h-screen flex bg-brand-light">
      <aside className="w-56 bg-brand text-white flex flex-col">
        <div className="p-4 border-b border-white/20 flex justify-center">
          <img src={logoSuperYatay} alt="SUPER YATAY" className="w-40 h-auto object-contain" />
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {itemsVisibles.map((item) => (
            <NavLink
              key={item.ruta}
              to={item.ruta}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg ${
                  isActive ? "bg-white/20" : "hover:bg-white/10"
                }`
              }
            >
              <span className="text-base">{item.icono}</span>
              <span>{item.etiqueta}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/20 text-sm">
          <p className="font-semibold">{usuario?.nombre_completo}</p>
          <p className="text-white/60 text-xs mt-0.5">{ETIQUETA_ROL[rol] ?? rol}</p>
          <button
            onClick={() => {
              cerrarSesion();
              navigate("/login");
            }}
            className="mt-3 w-full bg-white/10 hover:bg-white/20 rounded-lg py-1.5 text-xs font-semibold transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
