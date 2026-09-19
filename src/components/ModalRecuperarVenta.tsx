import { useEffect, useRef, useState } from "react";
import {
  listarVentasSuspendidas,
  recuperarVentaSuspendida,
  eliminarVentaSuspendida,
} from "@/services/ventasSuspendidasService";
import type { VentaSuspendida } from "@/types/venta";

interface Props {
  cajaId: number;
  onCerrar: () => void;
  /** Recibe el JSON del carrito recuperado. El padre decide qué hacer con él. */
  onRecuperada: (carritoJson: string) => void;
}

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

/** Sección 21-22: lista de ventas suspendidas, navegable con flechas, ENTER y doble click. */
export default function ModalRecuperarVenta({ cajaId, onCerrar, onRecuperada }: Props) {
  const [suspendidas, setSuspendidas] = useState<VentaSuspendida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => { contenedorRef.current?.focus(); }, []);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const lista = await listarVentasSuspendidas(cajaId);
      setSuspendidas(lista);
      setIndiceSeleccionado(0);
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cajaId]);

  async function recuperar(v: VentaSuspendida) {
    try {
      const json = await recuperarVentaSuspendida(v.id);
      onRecuperada(json);
    } catch (e) {
      setError(String(e));
    }
  }

  async function eliminar(v: VentaSuspendida) {
    try {
      await eliminarVentaSuspendida(v.id);
      await cargar();
    } catch (e) {
      setError(String(e));
    }
  }

  function manejarTecla(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onCerrar(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceSeleccionado((i) => Math.min(i + 1, suspendidas.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceSeleccionado((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && suspendidas[indiceSeleccionado]) {
      recuperar(suspendidas[indiceSeleccionado]);
    }
  }

  return (
    <div
      ref={contenedorRef}
      tabIndex={-1}
      onKeyDown={manejarTecla}
      className="fixed inset-0 bg-black/40 flex items-start justify-center pt-20 z-50 outline-none"
    >
      <div className="bg-white rounded-xl shadow-xl w-[640px] max-h-[70vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-brand">Ventas suspendidas</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {cargando && <p className="p-6 text-center text-gray-400">Cargando…</p>}

          {!cargando && suspendidas.length === 0 && (
            <p className="p-6 text-center text-gray-400">No hay ventas suspendidas en esta caja.</p>
          )}

          {suspendidas.map((v, i) => (
            <div
              key={v.id}
              onClick={() => setIndiceSeleccionado(i)}
              onDoubleClick={() => recuperar(v)}
              className={`px-4 py-3 flex justify-between items-center cursor-pointer border-b border-gray-100 ${
                i === indiceSeleccionado ? "bg-brand/10" : "hover:bg-gray-50"
              }`}
            >
              <div>
                <p className="font-medium">{v.numero}</p>
                <p className="text-sm text-gray-500">{formatoFecha.format(new Date(v.fecha))}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); recuperar(v); }}
                  className="btn-pos bg-brand text-white text-sm px-3"
                >↩ RECUPERAR</button>
                <button
                  onClick={(e) => { e.stopPropagation(); eliminar(v); }}
                  className="btn-pos bg-red-50 text-red-700 text-sm px-3"
                  title="Eliminar sin recuperar"
                >🗑️</button>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-red-600 text-center p-2 text-sm border-t">{error}</p>}

        <div className="p-3 border-t text-xs text-gray-400 flex justify-between">
          <span>↑↓ Navegar · ENTER Recuperar · Doble click</span>
          <span>ESC Cerrar</span>
        </div>
      </div>
    </div>
  );
}