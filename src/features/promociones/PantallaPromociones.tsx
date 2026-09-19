import { useEffect, useState, type FormEvent } from "react";
import { crearPromocion, listarPromociones, type Promocion } from "@/services/promocionesService";

const PROMO_VACIA: Promocion = {
  id: 0,
  nombre: "",
  tipo: "PORCENTAJE",
  valor: 10,
  categoria_id: null,
  cantidad_minima: 1,
  prioridad: 0,
};

export default function PantallaPromociones() {
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [form, setForm] = useState<Promocion>(PROMO_VACIA);

  function recargar() {
    listarPromociones().then(setPromociones);
  }

  useEffect(recargar, []);

  async function manejarCrear(e: FormEvent) {
    e.preventDefault();
    await crearPromocion(form, []);
    setForm(PROMO_VACIA);
    recargar();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-brand">Promociones</h1>

      <form onSubmit={manejarCrear} className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-bold">Nueva promoción</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="h-11 px-3 border rounded-lg"
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <select
            className="h-11 px-3 border rounded-lg"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as Promocion["tipo"] })}
          >
            <option value="PORCENTAJE">Porcentaje</option>
            <option value="2X1">2x1</option>
            <option value="PRECIO_FIJO">Precio fijo</option>
            <option value="COMBO">Combo (no calculado todavía)</option>
          </select>
          <input
            type="number"
            className="h-11 px-3 border rounded-lg"
            placeholder="Valor (% o precio fijo)"
            value={form.valor ?? ""}
            onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || null })}
          />
          <input
            type="number"
            className="h-11 px-3 border rounded-lg"
            placeholder="Cantidad mínima"
            value={form.cantidad_minima}
            onChange={(e) => setForm({ ...form, cantidad_minima: parseFloat(e.target.value) || 1 })}
          />
        </div>
        <p className="text-xs text-gray-400">
          Para asociar productos específicos a esta promoción, hacelo desde la ficha del
          producto (pendiente de UI). Las promociones por categoría se pueden asociar acá
          agregando `categoria_id` cuando esa pantalla esté lista.
        </p>
        <button className="btn-pos bg-brand text-white px-6">Crear</button>
      </form>

      <div className="bg-white rounded-xl shadow divide-y">
        {promociones.map((p) => (
          <div key={p.id} className="p-3 flex justify-between">
            <span>{p.nombre}</span>
            <span className="text-gray-500 text-sm">
              {p.tipo} {p.valor ? `(${p.valor})` : ""} · mín. {p.cantidad_minima}
            </span>
          </div>
        ))}
        {promociones.length === 0 && <p className="p-4 text-gray-400 text-center">Sin promociones activas.</p>}
      </div>
    </div>
  );
}
