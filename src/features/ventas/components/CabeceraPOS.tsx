import { useEffect, useState } from "react";
import { useSesionStore } from "@/store/sesionStore";
import {
  leerConfigImpresora,
  estadoImpresora,
  type ConfigImpresora,
} from "@/services/impresionService";
import { useContadorAlertas } from "@/hooks/useContadorAlertas";

interface Props {
  numeroCaja?: string;
  onAbrirAlertas?: () => void;
}

const formatoFechaHora = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
});

function useHoraActual() {
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

type EstadoImp = "conectada" | "desconectada" | "sin_configurar" | "chequeando";

function useEstadoImpresora(): EstadoImp {
  const [estado, setEstado] = useState<EstadoImp>("chequeando");

  useEffect(() => {
    let cancelado = false;

    async function chequear() {
      let config: ConfigImpresora | null = null;
      try {
        config = await leerConfigImpresora();
      } catch {
        if (!cancelado) setEstado("sin_configurar");
        return;
      }
      if (!config) {
        if (!cancelado) setEstado("sin_configurar");
        return;
      }
      try {
        const resultado = await estadoImpresora(config);
        if (cancelado) return;
        if ("Conectada" in resultado) setEstado("conectada");
        else setEstado("desconectada");
      } catch {
        if (!cancelado) setEstado("desconectada");
      }
    }

    chequear();
    const t = setInterval(chequear, 30_000);
    return () => {
      cancelado = true;
      clearInterval(t);
    };
  }, []);

  return estado;
}

function Indicador({
  etiqueta,
  valor,
  colorPunto,
  sinPunto,
}: {
  etiqueta: string;
  valor: string;
  colorPunto: "verde" | "rojo" | "gris";
  sinPunto?: boolean;
}) {
  const clases = {
    verde: "bg-emerald-400",
    rojo: "bg-red-500",
    gris: "bg-slate-500",
  };
  return (
    <div className="flex items-center gap-2">
      {!sinPunto && <span className={`w-2 h-2 rounded-full ${clases[colorPunto]}`} />}
      <div className="leading-tight">
        {etiqueta && (
          <div className="text-[10px] uppercase tracking-wide text-slate-400">{etiqueta}</div>
        )}
        <div className="font-semibold text-sm">{valor}</div>
      </div>
    </div>
  );
}

async function alternarPantallaCompleta() {
  try {
    const { appWindow } = await import("@tauri-apps/api/window");
    const estaFullscreen = await appWindow.isFullscreen();
    await appWindow.setFullscreen(!estaFullscreen);
  } catch (err) {
    console.warn("No se pudo alternar pantalla completa:", err);
  }
}

async function minimizarVentana() {
  try {
    const { appWindow } = await import("@tauri-apps/api/window");
    // Si está en fullscreen, primero salir (sino Windows ignora el minimize)
    const estaFullscreen = await appWindow.isFullscreen();
    if (estaFullscreen) {
      await appWindow.setFullscreen(false);
      // Dar tiempo a que el SO procese el cambio
      await new Promise((r) => setTimeout(r, 200));
    }
    await appWindow.minimize();
  } catch (err) {
    console.warn("No se pudo minimizar:", err);
  }
}

async function cerrarVentana() {
  try {
    const { appWindow } = await import("@tauri-apps/api/window");
    await appWindow.close();
  } catch (err) {
    console.warn("No se pudo cerrar:", err);
  }
}

export default function CabeceraPOS({
  numeroCaja = "01",
  onAbrirAlertas,
}: Props) {
  const usuario = useSesionStore((s) => s.usuario);
  const cajaId = useSesionStore((s) => s.cajaId);
  const ahora = useHoraActual();
  const online = useOnline();
  const estadoImp = useEstadoImpresora();
  const { total: totalAlertas } = useContadorAlertas();

  // F11 → toggle fullscreen
  useEffect(() => {
    async function manejarF11(e: KeyboardEvent) {
      if (e.key !== "F11") return;
      e.preventDefault();
      await alternarPantallaCompleta();
    }
    window.addEventListener("keydown", manejarF11);
    return () => window.removeEventListener("keydown", manejarF11);
  }, []);

  const impresora: { valor: string; color: "verde" | "rojo" | "gris" } =
    estadoImp === "conectada"
      ? { valor: "Conectada", color: "verde" }
      : estadoImp === "desconectada"
      ? { valor: "Desconectada", color: "rojo" }
      : estadoImp === "sin_configurar"
      ? { valor: "Sin configurar", color: "gris" }
      : { valor: "Chequeando…", color: "gris" };

  return (
    <header className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between gap-3 flex-wrap shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-lg">
          🛒
        </div>
        <div className="leading-tight">
          <div className="text-base font-black tracking-tight">
            HL SISTEMAS <span className="text-emerald-400">POS</span>
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest">
            Modo Seguro
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs flex-wrap">
        <Indicador
          etiqueta="Caja"
          valor={`#${numeroCaja} · ${cajaId ? "ABIERTA" : "CERRADA"}`}
          colorPunto={cajaId ? "verde" : "rojo"}
        />
        <Indicador
          etiqueta="Cajero"
          valor={usuario?.nombre_completo ?? "—"}
          colorPunto="verde"
        />
        <Indicador
          etiqueta=""
          valor={formatoFechaHora.format(ahora)}
          colorPunto="gris"
          sinPunto
        />
        <Indicador
          etiqueta="Conexión"
          valor={online ? "En línea" : "Offline"}
          colorPunto={online ? "verde" : "rojo"}
        />
        <Indicador
          etiqueta="Impresora"
          valor={impresora.valor}
          colorPunto={impresora.color}
        />
        <Indicador etiqueta="Lector" valor="Conectado" colorPunto="verde" />

        <button
          type="button"
          onClick={alternarPantallaCompleta}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          title="Pantalla completa (F11)"
        >
          <span className="text-lg">⛶</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-300 font-semibold">
            Pantalla
          </span>
        </button>

        <button
          type="button"
          onClick={onAbrirAlertas}
          className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          title="Ver alertas"
        >
          <span className="text-lg">🔔</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-300 font-semibold">
            Alertas
          </span>
          {totalAlertas > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
              {totalAlertas > 99 ? "99+" : totalAlertas}
            </span>
          )}
        </button>

        {/* Botones de ventana */}
        <button
          type="button"
          onClick={minimizarVentana}
          className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-600 transition-colors flex items-center justify-center"
          title="Minimizar"
        >
          <span className="text-base leading-none">—</span>
        </button>

        <button
          type="button"
          onClick={cerrarVentana}
          className="w-9 h-9 rounded-lg bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-center"
          title="Cerrar POS"
        >
          <span className="text-base leading-none font-bold">✕</span>
        </button>
      </div>
    </header>
  );
}
