import { useState } from "react";
import { useSesionStore } from "@/store/sesionStore";
import {
  aplicarDescuentoProducto,
  quitarDescuentoProducto,
} from "@/services/descuentosService";
import type { Producto } from "@/types/producto";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
});

interface Props {
  producto: Producto;
  onCerrar: () => void;
  onGuardado: () => void;
}

const PORCENTAJES_RAPIDOS = [5, 10, 15, 20, 25, 30, 40, 50, 70];

export default function ModalEditarDescuento({ producto, onCerrar, onGuardado }: Props) {
  const usuario = useSesionStore((s) => s.usuario);
  const [porcentaje, setPorcentaje] = useState<number>(producto.descuento_porcentaje || 0);
  const [cantidadMinima, setCantidadMinima] = useState<number>(producto.descuento_cantidad_minima || 1);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const precioOriginal = producto.precio_venta;
  const descuento = precioOriginal * (porcentaje / 100);
  const precioFinal = precioOriginal - descuento;
  const tieneDescuento = porcentaje > 0;

  async function manejarAplicar() {
    if (!usuario || producto.id === null) return;
    if (porcentaje <= 0 || porcentaje > 100) {
      setError("El porcentaje debe estar entre 1 y 100.");
      return;
    }
    if (cantidadMinima < 1) {
      setError("La cantidad mínima debe ser 1 o más.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await aplicarDescuentoProducto(producto.id, porcentaje, cantidadMinima, usuario.id);
      onGuardado();
    } catch (e) {
      setError(String(e));
    } finally {
      setGuardando(false);
    }
  }

  async function manejarQuitar() {
    if (!usuario || producto.id === null) return;
    setGuardando(true);
    setError(null);
    try {
      await quitarDescuentoProducto(producto.id, usuario.id);
      onGuardado();
    } catch (e) {
      setError(String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-[80] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-brand text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏷️</span>
            <div>
              <h2 className="text-base font-black leading-tight">DESCUENTO</h2>
              <p className="text-xs opacity-80 truncate max-w-[280px]">{producto.nombre}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-white/80 hover:text-white text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Precio unitario</span>
              <span className="font-semibold tabular-nums">{formatoMoneda.format(precioOriginal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Descuento aplicado</span>
              <span className={`font-semibold tabular-nums ${tieneDescuento ? "text-emerald-700" : "text-slate-400"}`}>
                {porcentaje.toFixed(0)}% ({formatoMoneda.format(descuento)})
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-1">
              <span className="font-semibold text-base">Precio final</span>
              <span className={`font-black text-xl tabular-nums ${tieneDescuento ? "text-emerald-700" : "text-slate-800"}`}>
                {formatoMoneda.format(precioFinal)}
              </span>
            </div>
          </div>

          {tieneDescuento && cantidadMinima > 1 && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ Este descuento <b>solo se aplica</b> cuando el cliente lleva <b>{cantidadMinima} unidades o más</b>.
              Si lleva menos, se cobra el precio normal.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              PORCENTAJE DE DESCUENTO
            </label>
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {PORCENTAJES_RAPIDOS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPorcentaje(p)}
                  className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                    porcentaje === p ? "bg-brand text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={0}
                max={100}
                value={porcentaje}
                onChange={(e) => setPorcentaje(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="flex-1 h-12 px-3 text-lg border-2 border-slate-300 rounded-lg focus:border-brand outline-none tabular-nums"
              />
              <span className="text-lg font-bold text-slate-600">%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              CANTIDAD MÍNIMA PARA APLICAR
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                value={cantidadMinima}
                onChange={(e) => setCantidadMinima(Math.max(1, Number(e.target.value)))}
                className="flex-1 h-12 px-3 text-lg border-2 border-slate-300 rounded-lg focus:border-brand outline-none tabular-nums"
              />
              <span className="text-sm text-slate-600">unidades</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ej: 1 = siempre. 3 = solo si lleva 3 o más.
            </p>
          </div>

          {error && <p className="text-red-600 text-sm text-center">🔴 {error}</p>}
        </div>

        <div className="p-4 border-t bg-slate-50 flex gap-2 flex-wrap justify-end">
          <button onClick={onCerrar} disabled={guardando}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50">
            CANCELAR
          </button>
          {producto.descuento_porcentaje > 0 && (
            <button onClick={manejarQuitar} disabled={guardando}
              className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50">
              🗑️ QUITAR DESCUENTO
            </button>
          )}
          <button onClick={manejarAplicar} disabled={guardando || porcentaje <= 0}
            className="bg-brand hover:bg-brand-dark text-white font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50">
            {guardando ? "Guardando…" : "✅ APLICAR"}
          </button>
        </div>
      </div>
    </div>
  );
}
