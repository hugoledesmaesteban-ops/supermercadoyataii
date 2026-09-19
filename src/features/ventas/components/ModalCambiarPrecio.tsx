import { useState } from "react";
import { useCarritoStore } from "@/store/carritoStore";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", minimumFractionDigits: 0,
});

interface Props {
  onCerrar: () => void;
  onSolicitarAutorizacion: (accion: () => void) => void;
}

export default function ModalCambiarPrecio({ onCerrar, onSolicitarAutorizacion }: Props) {
  const { lineaSeleccionada, cambiarPrecioLinea } = useCarritoStore();
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [motivo, setMotivo] = useState("");

  const linea = lineaSeleccionada();
  if (!linea) return null;

  const precioNumerico = parseFloat(nuevoPrecio.replace(",", "."));
  const valido = !isNaN(precioNumerico) && precioNumerico > 0;

  function aplicar() {
    if (!valido || !motivo.trim()) return;
    onSolicitarAutorizacion(() => {
      cambiarPrecioLinea(linea!.clave, precioNumerico);
      onCerrar();
    });
  }

  const diferencia = valido ? precioNumerico - linea.precioUnitario : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[65] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💲</span>
            <div>
              <h2 className="text-base font-black leading-tight">CAMBIAR PRECIO</h2>
              <p className="text-xs opacity-90 truncate max-w-[240px]">{linea.producto.nombre}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Precio actual</span>
              <span className="font-semibold">{formatoMoneda.format(linea.precioUnitario)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cantidad</span>
              <span className="font-semibold">{linea.cantidad}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nuevo precio unitario
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={nuevoPrecio}
              onChange={(e) => setNuevoPrecio(e.target.value)}
              placeholder="$"
              autoFocus
              className="w-full h-12 px-3 text-lg border-2 border-slate-300 rounded-lg focus:border-slate-800 outline-none"
            />
            {valido && diferencia !== 0 && (
              <p className={`text-sm mt-1 font-semibold ${diferencia > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {diferencia > 0 ? "▲" : "▼"} {formatoMoneda.format(Math.abs(diferencia))} por unidad
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="ej: precio de oferta, producto dañado…"
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg focus:border-slate-800 outline-none"
            />
          </div>

          <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 text-xs text-amber-800">
            🔐 Esta acción requiere autorización de encargado y queda registrada en auditoría.
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onCerrar}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 rounded-lg"
            >
              CANCELAR
            </button>
            <button
              onClick={aplicar}
              disabled={!valido || !motivo.trim()}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg disabled:opacity-40"
            >
              APLICAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}