import { useState } from "react";

interface Props {
  costo: number;
  precioActual: number;
  onAplicar: (nuevoPrecio: number) => void;
}

const PORCENTAJES = [5, 10, 15, 20, 25, 30, 40, 50, 70];

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
});

export default function CalculadoraPrecio({ costo, precioActual, onAplicar }: Props) {
  const [porcentaje, setPorcentaje] = useState(30);

  const ganancia = costo * (porcentaje / 100);
  const precioTotal = costo + ganancia;

  return (
    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧮</span>
          <h3 className="font-bold text-blue-900">Calculadora de precio</h3>
        </div>
        <span className="text-xs text-blue-700 bg-white px-2 py-1 rounded border border-blue-200">
          {formatoMoneda.format(precioActual)} actual
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-blue-900 mb-1">
            Costo del producto
          </label>
          <div className="h-11 px-3 border rounded-lg bg-white flex items-center tabular-nums font-semibold text-slate-700">
            {formatoMoneda.format(costo)}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-900 mb-1">
            Porcentaje de ganancia
          </label>
          <input
            type="number"
            min={0}
            max={500}
            value={porcentaje}
            onChange={(e) => setPorcentaje(Math.max(0, Number(e.target.value) || 0))}
            className="w-full h-11 px-3 border-2 border-blue-400 rounded-lg focus:border-blue-700 outline-none tabular-nums text-center font-bold text-lg"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-blue-900 mb-1">
          Porcentajes rapidos
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {PORCENTAJES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPorcentaje(p)}
              className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                porcentaje === p
                  ? "bg-blue-700 text-white"
                  : "bg-white hover:bg-blue-100 text-blue-800 border border-blue-300"
              }`}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 space-y-2 border-2 border-blue-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">💰 Ganancia (sin costo):</span>
          <span className="text-lg font-bold text-emerald-700 tabular-nums">
            {formatoMoneda.format(ganancia)}
          </span>
        </div>
        <div className="flex justify-between items-center border-t pt-2">
          <span className="text-sm text-slate-600">📦 Precio total de venta:</span>
          <span className="text-xl font-black text-blue-900 tabular-nums">
            {formatoMoneda.format(precioTotal)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAplicar(precioTotal)}
        className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-lg transition-colors"
      >
        ✅ APLICAR PRECIO DE VENTA
      </button>
    </div>
  );
}
