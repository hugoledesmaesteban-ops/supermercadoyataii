import { useEffect, useMemo, useState } from "react";
import { listarProductosFiltrado } from "@/services/productosService";
import type { Producto } from "@/types/producto";
import ModalEditarDescuento from "@/features/productos/components/ModalEditarDescuento";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", minimumFractionDigits: 0,
});

export default function PantallaDescuentos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [soloConDescuento, setSoloConDescuento] = useState(false);
  const [editar, setEditar] = useState<Producto | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const lista = await listarProductosFiltrado({ soloActivos: true });
      setProductos(lista);
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const productosFiltrados = useMemo(() => {
    let lista = productos;
    if (soloConDescuento) lista = lista.filter((p) => p.descuento_porcentaje > 0);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter((p) => p.nombre.toLowerCase().includes(q));
    }
    return lista;
  }, [productos, soloConDescuento, busqueda]);

  const cantidadConDescuento = productos.filter((p) => p.descuento_porcentaje > 0).length;

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-brand">Descuentos</h1>
          <p className="text-sm text-gray-500">
            {cantidadConDescuento} producto{cantidadConDescuento === 1 ? "" : "s"} con descuento
          </p>
        </div>
        <button onClick={cargar}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg text-sm">
          🔄 Refrescar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto por nombre..."
          className="w-full h-12 px-3 border rounded-lg" />
        <label className="flex items-center gap-2 text-sm bg-emerald-50 px-3 py-2 rounded-lg w-fit text-emerald-800">
          <input type="checkbox" checked={soloConDescuento}
            onChange={(e) => setSoloConDescuento(e.target.checked)} />
          🏷️ Solo con descuento
        </label>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {cargando && <p className="p-8 text-center text-slate-400">Cargando...</p>}
        {error && <p className="p-8 text-center text-red-600">{error}</p>}
        {!cargando && !error && productosFiltrados.length === 0 && (
          <p className="p-8 text-center text-slate-400">No hay productos que coincidan.</p>
        )}

        {!cargando && !error && productosFiltrados.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Producto</th>
                <th className="text-right px-3 py-3 font-semibold">Precio normal</th>
                <th className="text-center px-3 py-3 font-semibold">Descuento</th>
                <th className="text-center px-3 py-3 font-semibold">Desde</th>
                <th className="text-right px-3 py-3 font-semibold">Precio final</th>
                <th className="text-center px-3 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((p) => {
                const tieneDesc = p.descuento_porcentaje > 0;
                const min = p.descuento_cantidad_minima ?? 1;
                const precioFinal = p.precio_venta * (1 - p.descuento_porcentaje / 100);
                return (
                  <tr key={p.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{p.nombre}</p>
                      {p.codigo_barra && <p className="text-xs text-slate-500">{p.codigo_barra}</p>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                      {formatoMoneda.format(p.precio_venta)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {tieneDesc ? (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">
                          {p.descuento_porcentaje.toFixed(0)}%
                        </span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center text-xs">
                      {tieneDesc ? (
                        min > 1 ? (
                          <span className="bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded">
                            {min}+ unid.
                          </span>
                        ) : (
                          <span className="text-slate-400">siempre</span>
                        )
                      ) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {tieneDesc ? (
                        <span className="font-bold text-emerald-700">
                          {formatoMoneda.format(precioFinal)}
                        </span>
                      ) : (
                        <span className="text-slate-400">{formatoMoneda.format(p.precio_venta)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => setEditar(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          tieneDesc
                            ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                            : "bg-brand hover:bg-brand-dark text-white"
                        }`}>
                        {tieneDesc ? "✏️ Editar" : "🏷️ Aplicar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editar && (
        <ModalEditarDescuento
          producto={editar}
          onCerrar={() => setEditar(null)}
          onGuardado={() => { setEditar(null); cargar(); }}
        />
      )}
    </div>
  );
}
