import { useEffect, useMemo, useState } from "react";
import {
  actualizarPrecioProducto,
  desactivarProducto,
  listarProductosFiltrado,
  reactivarProducto,
  type FiltrosProductos,
} from "@/services/productosService";
import { useSesionStore } from "@/store/sesionStore";
import type { Producto } from "@/types/producto";
import FormularioProducto from "./components/FormularioProducto";
import ModalEditarProducto from "./components/ModalEditarProducto";
import ModalAjustarStock from "./components/ModalAjustarStock";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
});

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "numeric",
});

export default function PantallaProductos() {
  const usuario = useSesionStore((s) => s.usuario);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [soloPorVencer, setSoloPorVencer] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editar, setEditar] = useState<Producto | null>(null);
  const [ajustar, setAjustar] = useState<Producto | null>(null);
  const [editarPrecio, setEditarPrecio] = useState<Producto | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const filtros: FiltrosProductos = {
        texto: busqueda.trim() || null,
        soloActivos,
        soloStockBajo,
        soloPorVencerDias: soloPorVencer ? 30 : null,
      };
      const lista = await listarProductosFiltrado(filtros);
      setProductos(lista);
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, soloActivos, soloStockBajo, soloPorVencer]);

  const totalFiltros = useMemo(
    () => [busqueda.trim().length > 0, soloStockBajo, soloPorVencer].filter(Boolean).length,
    [busqueda, soloStockBajo, soloPorVencer],
  );

  function limpiarFiltros() {
    setBusqueda("");
    setSoloActivos(true);
    setSoloStockBajo(false);
    setSoloPorVencer(false);
  }

  async function manejarDarDeBaja(p: Producto) {
    if (!usuario || p.id === null) return;

    const confirmado = confirm(
      `¿Dar de baja "${p.nombre}"?\n\n` +
      `El producto se ocultará de la lista, pero podés reactivarlo después con el botón "Ver dados de baja".\n\n` +
      `Las ventas anteriores quedan guardadas en los reportes.`
    );
    if (!confirmado) return;

    try {
      await desactivarProducto(p.id, usuario.id);
      cargar();
    } catch (e) {
      alert(String(e));
    }
  }

  async function manejarReactivar(p: Producto) {
    if (!usuario || p.id === null) return;

    const confirmado = confirm(
      `¿Reactivar "${p.nombre}"?\n\nEl producto volverá a estar disponible para la venta.`
    );
    if (!confirmado) return;

    try {
      await reactivarProducto(p.id, usuario.id);
      cargar();
    } catch (e) {
      alert(String(e));
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-brand">Productos</h1>
          <p className="text-sm text-gray-500">
            {productos.length} producto{productos.length === 1 ? "" : "s"}
            {totalFiltros > 0 && " (con filtros)"}
          </p>
        </div>
        <button
          onClick={() => setMostrarFormulario((v) => !v)}
          className="btn-pos bg-brand text-white px-4"
        >
          {mostrarFormulario ? "Cerrar" : "+ Nuevo producto"}
        </button>
      </div>

      {mostrarFormulario && usuario && (
        <FormularioProducto
          usuarioId={usuario.id}
          onCreado={() => {
            setMostrarFormulario(false);
            cargar();
          }}
        />
      )}

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, SKU o código de barras..."
          className="w-full h-12 px-3 border rounded-lg"
        />
        <div className="flex gap-2 flex-wrap items-center">
          <label className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
            />
            Solo activos
          </label>

          <button
            type="button"
            onClick={() => setSoloActivos(false)}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg font-semibold transition-colors ${
              !soloActivos
                ? "bg-amber-500 text-white"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            📦 Ver dados de baja
          </button>

          <label className="flex items-center gap-2 text-sm bg-amber-50 px-3 py-2 rounded-lg text-amber-800">
            <input
              type="checkbox"
              checked={soloStockBajo}
              onChange={(e) => setSoloStockBajo(e.target.checked)}
            />
            📉 Stock bajo
          </label>
          <label className="flex items-center gap-2 text-sm bg-red-50 px-3 py-2 rounded-lg text-red-800">
            <input
              type="checkbox"
              checked={soloPorVencer}
              onChange={(e) => setSoloPorVencer(e.target.checked)}
            />
            ⏰ Por vencer (30 días)
          </label>

          {totalFiltros > 0 && (
            <button
              onClick={limpiarFiltros}
              className="ml-auto text-sm text-slate-500 hover:text-slate-700 font-semibold"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {cargando && <p className="p-8 text-center text-slate-400">Cargando...</p>}
        {!cargando && error && <p className="p-8 text-center text-red-600">{error}</p>}
        {!cargando && !error && productos.length === 0 && (
          <p className="p-8 text-center text-slate-400">
            No hay productos que coincidan con los filtros.
          </p>
        )}

        {!cargando && !error && productos.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Código</th>
                <th className="text-left px-3 py-3 font-semibold">Producto</th>
                <th className="text-right px-3 py-3 font-semibold">Precio</th>
                <th className="text-right px-3 py-3 font-semibold">Stock</th>
                <th className="text-left px-3 py-3 font-semibold">Vencimiento</th>
                <th className="text-left px-3 py-3 font-semibold">Estado</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
                const stockBajo = p.stock <= p.stock_minimo;
                const vencido = p.vencimiento ? new Date(p.vencimiento) < new Date() : false;
                const porVencer =
                  p.vencimiento && !vencido
                    ? new Date(p.vencimiento).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000
                    : false;
                return (
                  <tr key={p.id} className={`border-b hover:bg-slate-50 ${!p.activo ? "opacity-60 bg-slate-50" : ""}`}>
                    <td className="px-4 py-3 text-slate-500 tabular-nums">
                      {p.codigo_barra?.replace(/__DEL_\d+$/, "") ?? p.sku ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-800">{p.nombre}</p>
                      {p.descripcion && (
                        <p className="text-xs text-slate-500 truncate max-w-xs">{p.descripcion}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                      {formatoMoneda.format(p.precio_venta)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={stockBajo ? "text-red-600 font-bold" : ""}>
                        {p.stock} {p.unidad_medida}
                      </span>
                      {stockBajo && <span className="ml-1 text-xs">⚠️</span>}
                    </td>
                    <td className="px-3 py-3 text-slate-600 text-xs">
                      {p.vencimiento ? (
                        <span className={vencido ? "text-red-600 font-bold" : porVencer ? "text-amber-700 font-semibold" : ""}>
                          {vencido && "🔴 "}
                          {porVencer && "⏰ "}
                          {formatoFecha.format(new Date(p.vencimiento))}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {p.activo ? (
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-semibold">
                          Activo
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-semibold">
                          📦 Dado de baja
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 justify-end">
                        {p.activo ? (
                          <>
                            <button
                              onClick={() => setEditar(p)}
                              title="Editar"
                              className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
                            >✏️</button>
                            <button
                              onClick={() => setAjustar(p)}
                              title="Ajustar stock"
                              className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
                            >📦</button>
                            <button
                              onClick={() => setEditarPrecio(p)}
                              title="Cambiar precio rápido"
                              className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
                            >💲</button>
                            <button
                              onClick={() => manejarDarDeBaja(p)}
                              title="Dar de baja (archivar)"
                              className="px-2 h-8 rounded bg-amber-100 hover:bg-amber-500 text-amber-800 hover:text-white text-xs font-semibold"
                            >📦 Dar de baja</button>
                          </>
                        ) : (
                          <button
                            onClick={() => manejarReactivar(p)}
                            title="Reactivar producto"
                            className="px-2 h-8 rounded bg-emerald-100 hover:bg-emerald-500 text-emerald-700 hover:text-white text-xs font-semibold"
                          >♻️ Reactivar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editar && usuario && (
        <ModalEditarProducto
          producto={editar}
          usuarioId={usuario.id}
          onCerrar={() => setEditar(null)}
          onGuardado={() => {
            setEditar(null);
            cargar();
          }}
        />
      )}

      {ajustar && ajustar.id !== null && (
        <ModalAjustarStock
          producto={{
            id: ajustar.id,
            nombre: ajustar.nombre,
            stock: ajustar.stock,
            unidad_medida: ajustar.unidad_medida,
          }}
          onCerrar={() => setAjustar(null)}
          onAjustado={() => {
            setAjustar(null);
            cargar();
          }}
        />
      )}

      {editarPrecio && editarPrecio.id !== null && usuario && (
        <ModalPrecioRapido
          productoId={editarPrecio.id}
          nombre={editarPrecio.nombre}
          precioActual={editarPrecio.precio_venta}
          usuarioId={usuario.id}
          onCerrar={() => setEditarPrecio(null)}
          onGuardado={() => {
            setEditarPrecio(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function ModalPrecioRapido({
  productoId, nombre, precioActual, usuarioId, onCerrar, onGuardado,
}: {
  productoId: number; nombre: string; precioActual: number; usuarioId: number;
  onCerrar: () => void; onGuardado: () => void;
}) {
  const [nuevo, setNuevo] = useState(String(precioActual));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function aplicar() {
    const n = parseFloat(nuevo.replace(",", "."));
    if (isNaN(n) || n <= 0) {
      setError("Precio inválido.");
      return;
    }
    setGuardando(true);
    try {
      await actualizarPrecioProducto(productoId, n, usuarioId);
      onGuardado();
    } catch (e) {
      setError(String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-slate-800 text-white p-4 flex items-center gap-3">
          <span className="text-2xl">💲</span>
          <div>
            <h2 className="text-base font-black">CAMBIO RÁPIDO DE PRECIO</h2>
            <p className="text-xs opacity-80 truncate max-w-[240px]">{nombre}</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between">
            <span className="text-slate-500">Precio actual</span>
            <span className="font-bold">{formatoMoneda.format(precioActual)}</span>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            autoFocus
            className="w-full h-14 px-3 text-2xl text-center font-bold border-2 border-slate-300 rounded-lg focus:border-slate-800 outline-none tabular-nums"
          />
          {error && <p className="text-red-600 font-semibold text-sm">🔴 {error}</p>}
          <div className="flex gap-2">
            <button onClick={onCerrar} disabled={guardando} className="flex-1 bg-slate-200 hover:bg-slate-300 font-semibold py-3 rounded-lg">CANCELAR</button>
            <button onClick={aplicar} disabled={guardando} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50">
              {guardando ? "Guardando…" : "APLICAR"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
