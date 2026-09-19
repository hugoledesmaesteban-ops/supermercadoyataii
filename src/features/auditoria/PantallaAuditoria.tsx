import { useEffect, useMemo, useState } from "react";
import {
  listarAuditoria,
  listarAccionesAuditoria,
  type EventoAuditoria,
} from "@/services/auditoriaService";

const formatoFechaHora = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

const ETIQUETAS: Record<string, { label: string; color: string; icono: string }> = {
  LOGIN:              { label: "Inicio de sesión", color: "bg-blue-100 text-blue-800",     icono: "🔓" },
  LOGOUT:             { label: "Cierre de sesión",  color: "bg-slate-100 text-slate-700",  icono: "🔒" },
  AUTORIZACION:       { label: "Autorización",      color: "bg-amber-100 text-amber-800",  icono: "🔐" },
  AJUSTE_STOCK:       { label: "Ajuste de stock",   color: "bg-orange-100 text-orange-800",icono: "📦" },
  DEVOLUCION:         { label: "Devolución",        color: "bg-purple-100 text-purple-800",icono: "↩️" },
  CAMBIO_PRECIO:      { label: "Cambio de precio",  color: "bg-pink-100 text-pink-800",    icono: "💲" },
  VENTA_ANULADA:      { label: "Venta anulada",     color: "bg-red-100 text-red-800",      icono: "🚫" },
  CAJA_ABIERTA:       { label: "Apertura de caja",  color: "bg-emerald-100 text-emerald-800", icono: "🟢" },
  CAJA_CERRADA:       { label: "Cierre de caja",    color: "bg-slate-100 text-slate-700",  icono: "🔴" },
  MOVIMIENTO_CAJA:    { label: "Movimiento caja",   color: "bg-cyan-100 text-cyan-800",    icono: "💰" },
  PRODUCTO_CREADO:    { label: "Producto creado",   color: "bg-green-100 text-green-800",  icono: "➕" },
  PRODUCTO_DESACTIVADO:{ label: "Producto desactivado", color: "bg-red-100 text-red-800", icono: "🗑️" },
};

function etiqueta(accion: string) {
  return ETIQUETAS[accion] ?? { label: accion, color: "bg-gray-100 text-gray-700", icono: "•" };
}

export default function PantallaAuditoria() {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [acciones, setAcciones] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accionFiltro, setAccionFiltro] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const lista = await listarAuditoria({
        accion: accionFiltro || null,
        desde: desde || null,
        hasta: hasta || null,
        limite: 500,
      });
      setEventos(lista);
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    listarAccionesAuditoria().then(setAcciones).catch(() => setAcciones([]));
  }, []);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accionFiltro, desde, hasta]);

  const eventosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return eventos;
    const q = busqueda.toLowerCase();
    return eventos.filter((e) =>
      [
        e.usuario_nombre ?? "",
        e.accion,
        e.entidad ?? "",
        e.detalle ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [eventos, busqueda]);

  function limpiarFiltros() {
    setAccionFiltro("");
    setDesde("");
    setHasta("");
    setBusqueda("");
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-brand">Auditoría</h1>
          <p className="text-sm text-gray-500">
            Historial de acciones sensibles del sistema
          </p>
        </div>
        <button
          onClick={cargar}
          className="bg-brand hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-lg text-sm"
        >
          🔄 Refrescar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Acción
          </label>
          <select
            value={accionFiltro}
            onChange={(e) => setAccionFiltro(e.target.value)}
            className="w-full h-10 px-3 border rounded-lg text-sm"
          >
            <option value="">Todas</option>
            {acciones.map((a) => (
              <option key={a} value={a}>
                {etiqueta(a).label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Desde
          </label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-full h-10 px-3 border rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Hasta
          </label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-full h-10 px-3 border rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Buscar
          </label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="usuario, detalle…"
            className="w-full h-10 px-3 border rounded-lg text-sm"
          />
        </div>

        <div className="md:col-span-4 flex justify-end">
          <button
            onClick={limpiarFiltros}
            className="text-sm text-slate-500 hover:text-slate-700 font-semibold"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {cargando && (
          <p className="p-8 text-center text-slate-400">Cargando…</p>
        )}
        {!cargando && error && (
          <p className="p-8 text-center text-red-600">🔴 {error}</p>
        )}
        {!cargando && !error && eventosFiltrados.length === 0 && (
          <p className="p-8 text-center text-slate-400">
            No hay eventos que coincidan con los filtros.
          </p>
        )}

        {!cargando && !error && eventosFiltrados.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Fecha</th>
                <th className="text-left px-3 py-3 font-semibold">Usuario</th>
                <th className="text-left px-3 py-3 font-semibold">Acción</th>
                <th className="text-left px-3 py-3 font-semibold">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {eventosFiltrados.map((e) => {
                const et = etiqueta(e.accion);
                return (
                  <tr key={e.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatoFechaHora.format(new Date(e.fecha))}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {e.usuario_nombre ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${et.color}`}
                      >
                        <span>{et.icono}</span>
                        {et.label}
                      </span>
                      {e.entidad && e.entidad_id && (
                        <span className="ml-2 text-xs text-slate-400">
                          {e.entidad}#{e.entidad_id}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600 max-w-md">
                      {e.detalle ? (
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded break-all">
                          {e.detalle}
                        </code>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!cargando && eventosFiltrados.length > 0 && (
        <p className="text-xs text-center text-slate-400">
          Mostrando {eventosFiltrados.length} evento{eventosFiltrados.length === 1 ? "" : "s"} (máximo 500)
        </p>
      )}
    </div>
  );
}
