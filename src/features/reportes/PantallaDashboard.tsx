import { useEffect, useState } from "react";
import {
  obtenerProductosMasVendidos,
  obtenerResumenDashboard,
  obtenerTotalesPorMetodoPago,
  type ProductoMasVendido,
  type ResumenDashboard,
  type TotalPorMetodoPago,
} from "@/services/reportesService";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
});

export default function PantallaDashboard() {
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [ranking, setRanking] = useState<ProductoMasVendido[]>([]);
  const [metodos, setMetodos] = useState<TotalPorMetodoPago[]>([]);
  const [dias, setDias] = useState(30);

  useEffect(() => {
    obtenerResumenDashboard().then(setResumen);
  }, []);

  useEffect(() => {
    obtenerProductosMasVendidos(dias).then(setRanking);
    obtenerTotalesPorMetodoPago(dias).then(setMetodos);
  }, [dias]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-brand">Dashboard</h1>

      {resumen && (
        <div className="grid grid-cols-3 gap-4">
          <Tarjeta titulo="Ventas hoy" valor={formatoMoneda.format(resumen.ventas_hoy)} />
          <Tarjeta titulo="Ventas semana" valor={formatoMoneda.format(resumen.ventas_semana)} />
          <Tarjeta titulo="Ventas mes" valor={formatoMoneda.format(resumen.ventas_mes)} />
          <Tarjeta titulo="Ganancia estimada (mes)" valor={formatoMoneda.format(resumen.ganancia_estimada_mes)} />
          <Tarjeta titulo="Ticket promedio (mes)" valor={formatoMoneda.format(resumen.ticket_promedio_mes)} />
          <Tarjeta titulo="Cantidad de ventas (mes)" valor={String(resumen.cantidad_ventas_mes)} />
        </div>
      )}

      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDias(d)}
            className={`px-3 py-1 rounded-lg text-sm ${
              dias === d ? "bg-brand text-white" : "bg-gray-100"
            }`}
          >
            {d} días
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-2">Productos más vendidos</h2>
          <ol className="space-y-1">
            {ranking.map((p, i) => (
              <li key={p.producto_id} className="flex justify-between text-sm">
                <span>
                  {i + 1}. {p.nombre}
                </span>
                <span className="text-gray-500">{p.unidades_vendidas} u.</span>
              </li>
            ))}
            {ranking.length === 0 && <p className="text-gray-400 text-sm">Sin datos en este período.</p>}
          </ol>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-2">Métodos de pago</h2>
          <ul className="space-y-1">
            {metodos.map((m) => (
              <li key={m.metodo} className="flex justify-between text-sm">
                <span>{m.metodo}</span>
                <span className="text-gray-500">{formatoMoneda.format(m.total)}</span>
              </li>
            ))}
            {metodos.length === 0 && <p className="text-gray-400 text-sm">Sin datos en este período.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-gray-500 text-sm">{titulo}</p>
      <p className="text-2xl font-bold text-brand">{valor}</p>
    </div>
  );
}
