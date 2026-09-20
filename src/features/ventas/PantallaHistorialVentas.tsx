import { useEffect, useState } from "react";
import { listarVentasParaAnular, anularVenta, type VentaParaAnular } from "@/services/ventasService";
import { useSesionStore } from "@/store/sesionStore";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", minimumFractionDigits: 0,
});

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function PantallaHistorialVentas() {
  const usuario = useSesionStore((s) => s.usuario);
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [ventas, setVentas] = useState<VentaParaAnular[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ventaAAnular, setVentaAAnular] = useState<VentaParaAnular | null>(null);
  const [password, setPassword] = useState("");
  const [anulando, setAnulando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const lista = await listarVentasParaAnular(desde, hasta, 500);
      setVentas(lista);
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  async function confirmarAnulacion() {
    if (!usuario || !ventaAAnular || !password) return;
    setAnulando(true);
    setError(null);
    try {
      await anularVenta(ventaAAnular.id, usuario.id, password);
      setVentaAAnular(null);
      setPassword("");
      setMensaje(`Venta #${ventaAAnular.numero} anulada. Stock devuelto.`);
      setTimeout(() => setMensaje(null), 4000);
      cargar();
    } catch (e) {
      setError(String(e));
    } finally {
      setAnulando(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-brand">Historial de Ventas</h1>
        <p className="text-sm text-gray-500">Anular ventas (solo dueño, requiere contraseña)</p>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              className="h-10 px-3 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              className="h-10 px-3 border rounded-lg text-sm" />
          </div>
          <button onClick={cargar} disabled={cargando}
            className="bg-brand hover:bg-brand-dark text-white font-semibold px-5 h-10 rounded-lg disabled:opacity-50">
            {cargando ? "Buscando..." : "🔄 Buscar"}
          </button>
          <div className="ml-auto text-sm text-slate-500">
            {ventas.length} venta{ventas.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold px-4 py-3 rounded-lg">
          ✅ {mensaje}
        </div>
      )}

      {error && !ventaAAnular && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg">
          🔴 {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {cargando && <p className="p-8 text-center text-slate-400">Cargando...</p>}
        {!cargando && ventas.length === 0 && (
          <p className="p-8 text-center text-slate-400">No hay ventas en ese rango.</p>
        )}
        {!cargando && ventas.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Número</th>
                <th className="text-left px-3 py-3 font-semibold">Fecha</th>
                <th className="text-right px-3 py-3 font-semibold">Items</th>
                <th className="text-right px-3 py-3 font-semibold">Total</th>
                <th className="text-center px-3 py-3 font-semibold">Estado</th>
                <th className="text-right px-3 py-3 font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} className={`border-b hover:bg-slate-50 ${v.estado === "ANULADA" ? "opacity-60 bg-red-50" : ""}`}>
                  <td className="px-4 py-3 font-mono">#{v.numero}</td>
                  <td className="px-3 py-3 text-slate-600">{formatoFecha.format(new Date(v.fecha))}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{v.cantidad_items}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatoMoneda.format(v.total)}</td>
                  <td className="px-3 py-3 text-center">
                    {v.estado === "ANULADA" ? (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-semibold">ANULADA</span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-semibold">ACTIVA</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {v.estado !== "ANULADA" && (
                      <button onClick={() => { setVentaAAnular(v); setPassword(""); }}
                        className="px-3 h-8 rounded bg-red-100 hover:bg-red-500 text-red-700 hover:text-white text-xs font-semibold">
                        ❌ Anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {ventaAAnular && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-700 text-white p-4">
              <h2 className="text-base font-black">ANULAR VENTA</h2>
              <p className="text-xs opacity-90">#{ventaAAnular.numero} - {formatoMoneda.format(ventaAAnular.total)}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800">
                ⚠️ Se devolverá el stock, se borrará de la caja y no contará en reportes. Esta acción queda en auditoría.
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Contraseña del dueño
                </label>
                <input type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && password) confirmarAnulacion(); }}
                  autoFocus
                  className="w-full h-12 px-3 text-lg border-2 border-slate-300 rounded-lg focus:border-red-600 outline-none" />
              </div>
              {error && <p className="text-red-600 text-sm font-semibold">🔴 {error}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setVentaAAnular(null); setPassword(""); setError(null); }}
                  disabled={anulando}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 font-semibold py-3 rounded-lg disabled:opacity-50">
                  CANCELAR
                </button>
                <button onClick={confirmarAnulacion}
                  disabled={!password || anulando}
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-lg disabled:opacity-50">
                  {anulando ? "Anulando..." : "CONFIRMAR ANULACIÓN"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
