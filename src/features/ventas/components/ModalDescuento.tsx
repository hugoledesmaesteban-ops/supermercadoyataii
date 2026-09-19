import { useState } from "react";
import { useCarritoStore } from "@/store/carritoStore";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", minimumFractionDigits: 0,
});

interface Props {
  onCerrar: () => void;
  onSolicitarAutorizacion: (accion: () => void) => void;
}

const PORCENTAJES = [5, 10, 15, 20];

export default function ModalDescuento({ onCerrar, onSolicitarAutorizacion }: Props) {
  const { lineaSeleccionada, aplicarDescuentoPorcentaje, aplicarDescuento, limpiarDescuentoLinea } = useCarritoStore();
  const [montoPersonalizado, setMontoPersonalizado] = useState("");
  const [porcentajePersonalizado, setPorcentajePersonalizado] = useState("");

  const linea = lineaSeleccionada();
  if (!linea) return null;

  const bruto = linea.cantidad * linea.precioUnitario;
  const totalConDescuento = bruto - linea.descuento;

  function aplicarPorcentaje(p: number) {
    onSolicitarAutorizacion(() => {
      aplicarDescuentoPorcentaje(linea!.clave, p);
      onCerrar();
    });
  }

  function aplicarMontoFijo() {
    const monto = parseFloat(montoPersonalizado.replace(",", "."));
    if (isNaN(monto) || monto <= 0 || monto > bruto) return;
    onSolicitarAutorizacion(() => {
      aplicarDescuento(linea!.clave, monto);
      onCerrar();
    });
  }

  function aplicarPorcentajePersonalizado() {
    const p = parseFloat(porcentajePersonalizado.replace(",", "."));
    if (isNaN(p) || p <= 0 || p > 100) return;
    onSolicitarAutorizacion(() => {
      aplicarDescuentoPorcentaje(linea!.clave, p);
      onCerrar();
    });
  }

  function quitar() {
    limpiarDescuentoLinea(linea!.clave);
    onCerrar();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[65] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-brand text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏷️</span>
            <div>
              <h2 className="text-base font-black leading-tight">DESCUENTO</h2>
              <p className="text-xs opacity-90 truncate max-w-[240px]">{linea.producto.nombre}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Precio unitario</span>
              <span className="font-semibold">{formatoMoneda.format(linea.precioUnitario)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cantidad</span>
              <span className="font-semibold">{linea.cantidad}</span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span className="text-slate-500">Bruto</span>
              <span className="font-semibold">{formatoMoneda.format(bruto)}</span>
            </div>
            {linea.descuento > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Descuento actual</span>
                <span className="font-bold">−{formatoMoneda.format(linea.descuento)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg border-t pt-1">
              <span className="font-semibold">Total</span>
              <span className="font-black text-brand">{formatoMoneda.format(totalConDescuento)}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Porcentaje rápido</p>
            <div className="grid grid-cols-4 gap-2">
              {PORCENTAJES.map((p) => (
                <button
                  key={p}
                  onClick={() => aplicarPorcentaje(p)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg"
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Porcentaje personalizado</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={porcentajePersonalizado}
                onChange={(e) => setPorcentajePersonalizado(e.target.value)}
                placeholder="ej: 12.5"
                className="flex-1 h-11 px-3 border rounded-lg"
              />
              <span className="self-center text-slate-500">%</span>
              <button
                onClick={aplicarPorcentajePersonalizado}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 rounded-lg"
              >
                Aplicar
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Monto fijo</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={montoPersonalizado}
                onChange={(e) => setMontoPersonalizado(e.target.value)}
                placeholder="$"
                className="flex-1 h-11 px-3 border rounded-lg"
              />
              <button
                onClick={aplicarMontoFijo}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 rounded-lg"
              >
                Aplicar
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <button
              onClick={onCerrar}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 rounded-lg"
            >
              CANCELAR
            </button>
            {linea.descuento > 0 && (
              <button
                onClick={quitar}
                className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-3 rounded-lg"
              >
                🗑️ QUITAR DESCUENTO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}