import { useEffect, useState } from "react";
import {
  listarStockBajo,
  listarProductosVencidos,
  listarProductosProximosVencer,
  type StockBajo,
  type ProductoVencimiento,
} from "@/services/stockService";
import ModalAjustarStock from "@/features/productos/components/ModalAjustarStock";

interface Props {
  onCerrar: () => void;
  onRefrescarContador: () => void;
}

type Tab = "stock_bajo" | "por_vencer" | "vencidos";

const DIAS_PROXIMOS_VENCER = 30;

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default function ModalAlertas({ onCerrar, onRefrescarContador }: Props) {
  const [tab, setTab] = useState<Tab>("stock_bajo");
  const [stockBajo, setStockBajo] = useState<StockBajo[]>([]);
  const [porVencer, setPorVencer] = useState<ProductoVencimiento[]>([]);
  const [vencidos, setVencidos] = useState<ProductoVencimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ajustar, setAjustar] = useState<{
    id: number;
    nombre: string;
    stock: number;
    unidad_medida: string;
  } | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [sb, pv, vc] = await Promise.all([
        listarStockBajo(),
        listarProductosProximosVencer(DIAS_PROXIMOS_VENCER),
        listarProductosVencidos(),
      ]);
      setStockBajo(sb);
      setPorVencer(pv);
      setVencidos(vc);
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totales = {
    stock_bajo: stockBajo.length,
    por_vencer: porVencer.length,
    vencidos: vencidos.length,
  };

  function manejarTecla(e: React.KeyboardEvent) {
    if (e.key === "Escape" && !ajustar) onCerrar();
  }

  function abrirAjuste(p: { id: number; nombre: string; stock: number; unidad_medida: string }) {
    setAjustar(p);
  }

  function cerrarAjuste(refrescar: boolean) {
    setAjustar(null);
    if (refrescar) {
      cargar();
      onRefrescarContador();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-[70] p-4 outline-none"
      tabIndex={-1}
      onKeyDown={manejarTecla}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <h2 className="text-lg font-black leading-tight">ALERTAS</h2>
              <p className="text-xs opacity-70">
                Stock bajo, próximos a vencer y vencidos
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="text-white/70 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b bg-slate-50">
          {[
            { clave: "stock_bajo" as Tab, etiqueta: "📉 Stock bajo" },
            { clave: "por_vencer" as Tab, etiqueta: "⏰ Por vencer" },
            { clave: "vencidos" as Tab, etiqueta: "🔴 Vencidos" },
          ].map((t) => (
            <button
              key={t.clave}
              onClick={() => setTab(t.clave)}
              className={`flex-1 py-3 px-3 text-sm font-semibold transition-colors border-b-2 ${
                tab === t.clave
                  ? "border-brand text-brand bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.etiqueta}
              {totales[t.clave] > 0 && (
                <span className="ml-2 bg-slate-200 text-slate-700 rounded-full px-2 py-0.5 text-xs">
                  {totales[t.clave]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cargando && <p className="text-center text-slate-400 py-8">Cargando…</p>}

          {!cargando && error && (
            <p className="text-red-600 text-center py-4">🔴 {error}</p>
          )}

          {!cargando && !error && tab === "stock_bajo" && (
            <>
              {stockBajo.length === 0 && (
                <p className="text-center text-slate-400 py-8">
                  ✅ No hay productos con stock bajo.
                </p>
              )}
              <div className="space-y-2">
                {stockBajo.map((p) => (
                  <div
                    key={p.id}
                    className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex justify-between items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{p.nombre}</p>
                      <p className="text-sm text-amber-800">
                        <span className="font-bold">{p.stock}</span> {p.unidad_medida} · mínimo {p.stock_minimo}
                      </p>
                    </div>
                    <button
                      onClick={() => abrirAjuste(p)}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg shrink-0 ml-3"
                    >
                      📦 Ajustar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {!cargando && !error && tab === "por_vencer" && (
            <>
              {porVencer.length === 0 && (
                <p className="text-center text-slate-400 py-8">
                  ✅ No hay productos por vencer en los próximos {DIAS_PROXIMOS_VENCER} días.
                </p>
              )}
              <div className="space-y-2">
                {porVencer.map((p) => (
                  <div
                    key={p.id}
                    className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex justify-between items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{p.nombre}</p>
                      <p className="text-sm text-amber-800">
                        Vence: <b>{formatoFecha.format(new Date(p.vencimiento))}</b> ·{" "}
                        {p.dias_restantes === 0
                          ? "hoy"
                          : `en ${p.dias_restantes} día${p.dias_restantes === 1 ? "" : "s"}`}
                        {" · "}
                        {p.stock} {p.unidad_medida}
                      </p>
                    </div>
                    <button
                      onClick={() => abrirAjuste(p)}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg shrink-0 ml-3"
                    >
                      📦 Ajustar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {!cargando && !error && tab === "vencidos" && (
            <>
              {vencidos.length === 0 && (
                <p className="text-center text-slate-400 py-8">
                  ✅ No hay productos vencidos.
                </p>
              )}
              <div className="space-y-2">
                {vencidos.map((p) => (
                  <div
                    key={p.id}
                    className="bg-red-50 border border-red-300 rounded-lg p-3 flex justify-between items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{p.nombre}</p>
                      <p className="text-sm text-red-800">
                        Vencido el <b>{formatoFecha.format(new Date(p.vencimiento))}</b>
                        {" ("}
                        {Math.abs(p.dias_restantes)} día{Math.abs(p.dias_restantes) === 1 ? "" : "s"}
                        {" atrás) · "}
                        {p.stock} {p.unidad_medida}
                      </p>
                    </div>
                    <button
                      onClick={() => abrirAjuste(p)}
                      className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg shrink-0 ml-3"
                    >
                      🗑️ Dar de baja
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-3 border-t bg-slate-50 flex justify-between items-center">
          <button
            onClick={cargar}
            className="text-sm text-slate-600 hover:text-slate-800 font-semibold"
          >
            🔄 Refrescar
          </button>
          <button
            onClick={onCerrar}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-5 py-2 rounded-lg text-sm"
          >
            Cerrar (ESC)
          </button>
        </div>
      </div>

      {ajustar && (
        <ModalAjustarStock
          producto={ajustar}
          onCerrar={() => cerrarAjuste(false)}
          onAjustado={() => cerrarAjuste(true)}
        />
      )}
    </div>
  );
}
