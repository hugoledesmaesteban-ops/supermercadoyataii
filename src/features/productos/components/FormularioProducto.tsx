import { useEffect, useRef, useState, type FormEvent } from "react";
import { crearProducto } from "@/services/productosService";
import type { Producto } from "@/types/producto";
import CalculadoraPrecio from "./CalculadoraPrecio";

interface Props {
  usuarioId: number;
  onCreado: () => void;
}

const PRODUCTO_VACIO: Omit<Producto, "id"> = {
  codigo_barra: "",
  sku: null,
  nombre: "",
  descripcion: null,
  categoria_id: null,
  marca_id: null,
  precio_compra: 0,
  precio_venta: 0,
  precio_mayorista: null,
  stock: 0,
  stock_minimo: 0,
  unidad_medida: "unidad",
  es_pesable: false,
  precio_por_kg: null,
  iva: 21,
  vencimiento: null,
  proveedor_id: null,
  foto: null,
  activo: true,
  descuento_porcentaje: 0,
  descuento_cantidad_minima: 1,
};

export default function FormularioProducto({ usuarioId, onCreado }: Props) {
  const [form, setForm] = useState(PRODUCTO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codigoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    codigoRef.current?.focus();
  }, []);

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await crearProducto({ ...form, id: null }, usuarioId);
      setForm(PRODUCTO_VACIO);
      setTimeout(() => codigoRef.current?.focus(), 100);
      onCreado();
    } catch (e) {
      setError(String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="bg-white rounded-xl shadow p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-brand">Nuevo producto</h2>
        <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-1 rounded">
          📷 Listo para escanear
        </span>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
        <b>💡 Tip:</b> Escaneá el código con el lector. Aparece solo en el primer campo.
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Campo label="Código de barras">
          <input
            ref={codigoRef}
            value={form.codigo_barra ?? ""}
            onChange={(e) => setForm({ ...form, codigo_barra: e.target.value || null })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && form.codigo_barra) {
                e.preventDefault();
                const siguiente = (e.currentTarget.form as HTMLFormElement)?.elements.namedItem(
                  "nombre-producto",
                ) as HTMLInputElement | null;
                siguiente?.focus();
              }
            }}
            placeholder="Escaneá o escribí el código"
            className="w-full h-11 px-3 border-2 border-emerald-400 rounded-lg focus:border-emerald-600 outline-none font-mono"
          />
        </Campo>

        <Campo label="Nombre *">
          <input
            name="nombre-producto"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Coca Cola 2.25L"
            className="w-full h-11 px-3 border rounded-lg"
          />
        </Campo>

        <Campo label="Precio de compra ($)" hint="Lo que pagas al proveedor">
          <input
            type="number" onFocus={(e) => e.currentTarget.select()}
            step="0.01"
            value={form.precio_compra}
            onChange={(e) => setForm({ ...form, precio_compra: parseFloat(e.target.value) || 0 })}
            className="w-full h-11 px-3 border rounded-lg tabular-nums"
          />
        </Campo>

        <Campo label="Precio de venta ($)" hint="Lo que cobras al cliente">
          <input
            type="number" onFocus={(e) => e.currentTarget.select()}
            step="0.01"
            value={form.precio_venta}
            onChange={(e) => setForm({ ...form, precio_venta: parseFloat(e.target.value) || 0 })}
            className="w-full h-11 px-3 border rounded-lg tabular-nums"
          />
        </Campo>

        <Campo label="Stock inicial" hint="Cantidad que tenes ahora">
          <input
            type="number" onFocus={(e) => e.currentTarget.select()}
            step="0.01"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: parseFloat(e.target.value) || 0 })}
            className="w-full h-11 px-3 border rounded-lg tabular-nums"
          />
        </Campo>

        <Campo label="Stock mínimo" hint="Alerta cuando baja de acá">
          <input
            type="number" onFocus={(e) => e.currentTarget.select()}
            step="0.01"
            value={form.stock_minimo}
            onChange={(e) => setForm({ ...form, stock_minimo: parseFloat(e.target.value) || 0 })}
            className="w-full h-11 px-3 border rounded-lg tabular-nums"
          />
        </Campo>

        <Campo label="Vencimiento" hint="Opcional">
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
            <option value="kg">Kilogramo</option>
            <option value="gramos">Gramos</option>
            <option value="litros">Litros</option>
            <option value="metros">Metros</option>
          </select>
        </Campo>
      </div>

      {form.precio_compra > 0 && (
        <CalculadoraPrecio
          costo={form.precio_compra}
          precioActual={form.precio_venta}
          onAplicar={(nuevoPrecio) => setForm({ ...form, precio_venta: nuevoPrecio })}
        />
      )}

      <label className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg w-fit">
        <input
          type="checkbox"
          checked={form.es_pesable}
          onChange={(e) =>
            setForm({
              ...form,
              es_pesable: e.target.checked,
              unidad_medida: e.target.checked ? "kg" : "unidad",
            })
          }
        />
        Es un producto pesable (se vende por kg)
      </label>

      {form.es_pesable && (
        <Campo label="Precio por kg ($)">
          <input
            type="number" onFocus={(e) => e.currentTarget.select()}
            step="0.01"
            value={form.precio_por_kg ?? ""}
            onChange={(e) => setForm({ ...form, precio_por_kg: parseFloat(e.target.value) || null })}
            className="w-full h-11 px-3 border rounded-lg tabular-nums"
          />
        </Campo>
      )}

      {error && <p className="text-red-600 text-sm">🔴 {error}</p>}

      <div className="flex justify-end">
        <button
          disabled={guardando}
          className="btn-pos bg-brand text-white px-8 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Crear producto"}
        </button>
      </div>
    </form>
  );
}

function Campo({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
        {hint && <span className="font-normal text-slate-400 ml-1">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

