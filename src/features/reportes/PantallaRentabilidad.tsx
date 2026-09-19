import { useEffect, useState } from "react";
import {
  obtenerGananciaPeriodo,
  obtenerGananciaPorProducto,
  type GananciaPeriodo,
  type GananciaPorProducto,
} from "@/services/reportesService";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
});

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function haceNDiasISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Preset = "hoy" | "semana" | "mes" | "personalizado";

export default function PantallaRentabilidad() {
  const [preset, setPreset] = useState<Preset>("mes");
  const [desde, setDesde] = useState(haceNDiasISO(30));
  const [hasta, setHasta] = useState(hoyISO());

  const [resumen, setResumen] = useState<GananciaPeriodo | null>(null);
  const [ranking, setRanking] = useState<GananciaPorProducto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar(d: string, h: string) {
    setCargando(true);
    setError(null);
    try {
      const [r, k] = await Promise.all([
        obtenerGananciaPeriodo(d, h),
        obtenerGananciaPorProducto(d, h, 50),
      ]);
      setResumen(r);
      setRanking(k);
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar(desde, hasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta]);

  function aplicarPreset(p: Preset) {
    setPreset(p);
    const hoy = hoyISO();
    if (p === "hoy") {
      setDesde(hoy);
      setHasta(hoy);
    } else if (p === "semana") {
      setDesde(haceNDiasISO(7));
      setHasta(hoy);
    } else if (p === "mes") {
      setDesde(haceNDiasISO(30));
      setHasta(hoy);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-brand">Rentabilidad</h1>
          <p className="text-sm text-gray-500">
            Ganancia real usando el costo histórico de cada venta
          </p>
        </div>
        <button
          onClick={() => cargar(desde, hasta)}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg text-sm"
        >
          🔄 Refrescar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(["hoy", "semana", "mes"] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => aplicarPreset(p)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                preset === p
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {p === "hoy" ? "Hoy" : p === "semana" ? "Últimos 7 días" : "Últimos 30 días"}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => { setDesde(e.target.value); setPreset("personalizado"); }}
              className="h-10 px-3 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => { setHasta(e.target.value); setPreset("personalizado"); }}
              className="h-10 px-3 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {cargando && <p className="text-center text-slate-400 py-8">Cargando…</p>}
      {error && <p className="text-center text-red-600 py-4">🔴 {error}</p>}

      {!cargando && resumen && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Tarjeta
              titulo="Facturación"
              valor={formatoMoneda.format(resumen.facturacion)}
              subtitulo={`${resumen.cantidad_tickets} tickets`}
            />
            <Tarjeta
              titulo="Descuentos"
              valor={formatoMoneda.format(resumen.descuento)}
              subtitulo={
                resumen.facturacion > 0
                  ? `${((resumen.descuento / resumen.facturacion) * 100).toFixed(1)}% del total`
                  : "sin descuentos"
              }
              destacado
              color="amber"
            />
            <Tarjeta
              titulo="Costo de lo vendido"
              valor={formatoMoneda.format(resumen.costo)}
              subtitulo={`${resumen.cantidad_unidades} unidades`}
            />
            <Tarjeta
              titulo="Ganancia bruta"
              valor={formatoMoneda.format(resumen.ganancia)}
              subtitulo={`Margen ${resumen.margen_pct.toFixed(1)}%`}
              destacado
              color={resumen.ganancia >= 0 ? "emerald" : "red"}
            />
            <Tarjeta
              titulo="Ganancia promedio"
              valor={formatoMoneda.format(
                resumen.cantidad_tickets > 0 ? resumen.ganancia / resumen.cantidad_tickets : 0,
              )}
              subtitulo="por ticket"
            />
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-slate-700">
                Ranking de productos por ganancia
              </h2>
              <span className="text-xs text-slate-500">
                {ranking.length} producto{ranking.length === 1 ? "" : "s"}
              </span>
            </div>

            {ranking.length === 0 && (
              <p className="p-8 text-center text-slate-400">
                No hay ventas en este período.
              </p>
            )}

            {ranking.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">#</th>
                    <th className="text-left px-3 py-3 font-semibold">Producto</th>
                    <th className="text-right px-3 py-3 font-semibold">Unid.</th>
                    <th className="text-right px-3 py-3 font-semibold">Facturación</th>
                    <th className="text-right px-3 py-3 font-semibold">Costo</th>
                    <th className="text-right px-3 py-3 font-semibold">Ganancia</th>
                    <th className="text-right px-4 py-3 font-semibold">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((p, i) => {
                    const bajo = p.margen_pct < 15;
                    const perdida = p.ganancia < 0;
                    return (
                      <tr key={p.producto_id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-400 font-mono">{i + 1}</td>
                        <td className="px-3 py-3 font-semibold text-slate-800">{p.nombre}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                          {p.unidades}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                          {formatoMoneda.format(p.facturacion)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-500">
                          {formatoMoneda.format(p.costo)}
                        </td>
                        <td className={`px-3 py-3 text-right tabular-nums font-bold ${
                          perdida ? "text-red-600" : "text-emerald-700"
                        }`}>
                          {formatoMoneda.format(p.ganancia)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            perdida
                              ? "bg-red-100 text-red-800"
                              : bajo
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {perdida ? "🔴 " : bajo ? "⚠️ " : "✅ "}
                            {p.margen_pct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  subtitulo,
  destacado,
  color,
}: {
  titulo: string;
  valor: string;
  subtitulo?: string;
  destacado?: boolean;
  color?: "emerald" | "red" | "amber";
}) {
  const colorValor =
    color === "emerald" ? "text-emerald-700" :
    color === "red" ? "text-red-700" :
    color === "amber" ? "text-amber-600" :
    "text-slate-800";
  return (
    <div className={`bg-white rounded-xl shadow p-4 ${destacado ? "ring-2 ring-brand" : ""}`}>
      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{titulo}</p>
      <p className={`text-2xl font-black tabular-nums ${colorValor}`}>{valor}</p>
      {subtitulo && <p className="text-xs text-slate-400 mt-1">{subtitulo}</p>}
    </div>
  );
}
