import { useState, type FormEvent } from "react";
import { actualizarProducto } from "@/services/productosService";
import type { Producto } from "@/types/producto";
import CalculadoraPrecio from "./CalculadoraPrecio";

interface Props {
  producto: Producto;
  usuarioId: number;
  onCerrar: () => void;
  onGuardado: () => void;
}

export default function ModalEditarProducto({ producto, usuarioId, onCerrar, onGuardado }: Props) {
  const [form, setForm] = useState<Producto>({ ...producto });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await actualizarProducto(form, usuarioId);
      onGuardado();
    } catch (e) {
      setError(String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-[80] p-4 overflow-y-auto">
      <form
        onSubmit={manejarSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✏️</span>
            <div>
              <h2 className="text-base font-black leading-tight">EDITAR PRODUCTO</h2>
              <p className="text-xs opacity-80 truncate max-w-[280px]">{producto.nombre}</p>
            </div>
          </div>
          <button type="button" onClick={onCerrar} className="text-white/70 hover:text-white text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Código de barras">
              <input
                value={form.codigo_barra ?? ""}
                onChange={(e) => setForm({ ...form, codigo_barra: e.target.value || null })}
                className="w-full h-11 px-3 border rounded-lg"
              />
            </Campo>
            <Campo label="SKU">
              <input
                value={form.sku ?? ""}
                onChange={(e) => setForm({ ...form, sku: e.target.value || null })}
                className="w-full h-11 px-3 border rounded-lg"
              />
            </Campo>
            <Campo label="Nombre *" span2>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full h-11 px-3 border rounded-lg"
              />
            </Campo>
            <Campo label="Descripción" span2>
              <textarea
                value={form.descripcion ?? ""}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value || null })}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </Campo>
            <Campo label="Precio de compra">
              <input
                type="number" onFocus={(e) => e.currentTarget.select()}
                step="0.01"
                value={form.precio_compra}
                onChange={(e) => setForm({ ...form, precio_compra: parseFloat(e.target.value) || 0 })}
                className="w-full h-11 px-3 border rounded-lg tabular-nums"
              />
            </Campo>
            <Campo label="Precio de venta">
              <input
                type="number" onFocus={(e) => e.currentTarget.select()}
                step="0.01"
                value={form.precio_venta}
                onChange={(e) => setForm({ ...form, precio_venta: parseFloat(e.target.value) || 0 })}
                className="w-full h-11 px-3 border rounded-lg tabular-nums"
              />
            </Campo>
            <Campo label="Stock mínimo">
              <input
                type="number" onFocus={(e) => e.currentTarget.select()}
                step="0.01"
                value={form.stock_minimo}
                onChange={(e) => setForm({ ...form, stock_minimo: parseFloat(e.target.value) || 0 })}
                className="w-full h-11 px-3 border rounded-lg tabular-nums"
              />
            </Campo>
            <Campo label="Vencimiento">
              <input
                type="date"
                value={form.vencimiento ?? ""}
                onChange={(e) => setForm({ ...form, vencimiento: e.target.value || null })}
                className="w-full h-11 px-3 border rounded-lg"
              />
            </Campo>
            <Campo label="Unidad de medida">
              <select
                value={form.unidad_medida}
                onChange={(e) => setForm({ ...form, unidad_medida: e.target.value as Producto["unidad_medida"] })}
                className="w-full h-11 px-3 border rounded-lg"
              >
                <option value="unidad">Unidad</option>
                <option value="kg">Kg</option>
                <option value="gramos">Gramos</option>
                <option value="litros">Litros</option>
                <option value="metros">Metros</option>
              </select>
            </Campo>
            <Campo label="IVA %">
              <input
                type="number" onFocus={(e) => e.currentTarget.select()}
                step="0.01"
                value={form.iva}
                onChange={(e) => setForm({ ...form, iva: parseFloat(e.target.value) || 0 })}
                className="w-full h-11 px-3 border rounded-lg tabular-nums"
              />
            </Campo>
          </div>

          {form.precio_compra > 0 && (
            <CalculadoraPrecio
              costo={form.precio_compra}
              precioActual={form.precio_venta}
              onAplicar={(nuevoPrecio) => setForm({ ...form, precio_venta: nuevoPrecio })}
            />
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.es_pesable}
              onChange={(e) => setForm({ ...form, es_pesable: e.target.checked })}
            />
            Producto pesable (se vende por kg)
          </label>

          {form.es_pesable && (
            <Campo label="Precio por kg">
              <input
                type="number" onFocus={(e) => e.currentTarget.select()}
                step="0.01"
                value={form.precio_por_kg ?? ""}
                onChange={(e) => setForm({ ...form, precio_por_kg: parseFloat(e.target.value) || null })}
                className="w-full h-11 px-3 border rounded-lg tabular-nums"
              />
            </Campo>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Producto activo (aparece en ventas y búsquedas)
          </label>

          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800">
            ⚠️ El stock no se edita acá. Usá "📦 Ajustar stock" en la lista para que quede registrado el movimiento.
          </div>

          {error && <p className="text-red-600 font-semibold text-sm">🔴 {error}</p>}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50"
          >
            CANCELAR
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="bg-brand hover:bg-brand-dark text-white font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "✅ GUARDAR"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Campo({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

