import { useState } from "react";
import { useSesionStore } from "@/store/sesionStore";
import {
  ajustarStockManual,
  type TipoAjusteStock,
} from "@/services/stockService";

interface Props {
  producto: {
    id: number;
    nombre: string;
    stock: number;
    unidad_medida: string;
  };
  onCerrar: () => void;
  onAjustado: () => void;
}

const TIPOS: { clave: TipoAjusteStock; etiqueta: string; signo: "+" | "-" }[] = [
  { clave: "ENTRADA", etiqueta: "📥 Entrada (compra)", signo: "+" },
  { clave: "AJUSTE", etiqueta: "⚖️ Ajuste por conteo", signo: "+" },
  { clave: "PERDIDA", etiqueta: "❓ Pérdida", signo: "-" },
  { clave: "ROTURA", etiqueta: "💥 Rotura", signo: "-" },
  { clave: "VENCIMIENTO", etiqueta: "⏰ Vencimiento", signo: "-" },
];

export default function ModalAjustarStock({ producto, onCerrar, onAjustado }: Props) {
  const usuario = useSesionStore((s) => s.usuario);

  const [tipo, setTipo] = useState<TipoAjusteStock>("AJUSTE");
  const [modo, setModo] = useState<"nuevo_stock" | "delta">("nuevo_stock");
  const [nuevoStock, setNuevoStock] = useState(String(producto.stock));
  const [delta, setDelta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const tipoSeleccionado = TIPOS.find((t) => t.clave === tipo)!;

  const deltaCalculado = (() => {
    if (modo === "nuevo_stock") {
      const n = parseFloat(nuevoStock.replace(",", "."));
      if (isNaN(n)) return 0;
      return n - producto.stock;
    }
    const d = Math.abs(parseFloat(delta.replace(",", ".")) || 0);
    return tipoSeleccionado.signo === "-" ? -d : d;
  })();

  const stockResultante = producto.stock + deltaCalculado;

  async function aplicar() {
    if (!usuario) return;
    if (deltaCalculado === 0) {
      setError("El ajuste no cambia el stock.");
      return;
    }
    if (stockResultante < 0) {
      setError(`El stock quedaría en ${stockResultante}. No puede ser negativo.`);
      return;
    }
    if (!motivo.trim()) {
      setError("Falta el motivo del ajuste.");
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await ajustarStockManual(
        producto.id,
        deltaCalculado,
        tipo,
        motivo.trim(),
        usuario.id,
      );
      onAjustado();
    } catch (e) {
      setError(String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <h2 className="text-base font-black leading-tight">AJUSTAR STOCK</h2>
              <p className="text-xs opacity-80 truncate max-w-[280px]">
                {producto.nombre}
              </p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-white/70 hover:text-white text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between">
            <span className="text-slate-500">Stock actual</span>
            <span className="font-bold tabular-nums">
              {producto.stock} {producto.unidad_medida}
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
              Tipo de ajuste
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {TIPOS.map((t) => (
                <button
                  key={t.clave}
                  type="button"
                  onClick={() => setTipo(t.clave)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tipo === t.clave
                      ? "bg-brand text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {t.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setModo("nuevo_stock")}
              className={`flex-1 py-2 rounded-lg font-semibold ${
                modo === "nuevo_stock"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Ingresar nuevo stock
            </button>
            <button
              type="button"
              onClick={() => setModo("delta")}
              className={`flex-1 py-2 rounded-lg font-semibold ${
                modo === "delta"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Ingresar cantidad
            </button>
          </div>

          {modo === "nuevo_stock" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nuevo stock
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={nuevoStock}
                onChange={(e) => setNuevoStock(e.target.value)}
                autoFocus
                className="w-full h-12 px-3 text-lg border-2 border-slate-300 rounded-lg focus:border-slate-800 outline-none tabular-nums"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cantidad ({tipoSeleccionado.signo === "-" ? "restar" : "sumar"})
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                autoFocus
                placeholder="0"
                className="w-full h-12 px-3 text-lg border-2 border-slate-300 rounded-lg focus:border-slate-800 outline-none tabular-nums"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="ej: conteo físico, producto roto…"
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg focus:border-slate-800 outline-none"
            />
          </div>

          <div
            className={`rounded-lg p-3 flex justify-between items-center ${
              stockResultante < 0
                ? "bg-red-50 border border-red-300"
                : deltaCalculado === 0
                ? "bg-slate-50 border border-slate-200"
                : "bg-emerald-50 border border-emerald-300"
            }`}
          >
            <span className="text-sm font-semibold text-slate-700">
              Stock resultante
            </span>
            <span
              className={`text-2xl font-black tabular-nums ${
                stockResultante < 0 ? "text-red-600" : "text-emerald-700"
              }`}
            >
              {stockResultante} {producto.unidad_medida}
            </span>
          </div>

          {error && <p className="text-red-600 font-semibold text-sm">🔴 {error}</p>}

          <div className="flex gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={aplicar}
              disabled={guardando || deltaCalculado === 0 || !motivo.trim()}
              className="flex-1 bg-brand hover:bg-brand-dark text-white font-semibold py-3 rounded-lg disabled:opacity-40"
            >
              {guardando ? "Guardando…" : "✅ APLICAR"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}