import { useEffect, useRef, useState } from "react";
import { buscarProductosPorTexto } from "@/services/productosService";
import { useCarritoStore } from "@/store/carritoStore";
import type { Producto } from "@/types/producto";

interface Props {
  onCerrar: () => void;
  onProductoPesable: (producto: Producto) => void;
}

const formatoMoneda = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 });

export default function ModalBuscarProducto({ onCerrar, onProductoPesable }: Props) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const agregarProducto = useCarritoStore((s) => s.agregarProducto);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    buscarProductosPorTexto(texto).then((r) => { setResultados(r); setIndiceSeleccionado(0); });
  }, [texto]);

  function elegir(producto: Producto) {
    if (producto.es_pesable) onProductoPesable(producto);
    else agregarProducto(producto);
    onCerrar();
  }

  function manejarTecla(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onCerrar(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setIndiceSeleccionado((i) => Math.min(i + 1, resultados.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setIndiceSeleccionado((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter" && resultados[indiceSeleccionado]) { elegir(resultados[indiceSeleccionado]); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-20 z-50">
      <div className="bg-white rounded-xl shadow-xl w-[600px] max-h-[70vh] flex flex-col">
        <div className="p-4 border-b">
          <input
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={manejarTecla}
            placeholder="Buscar por nombre, código o marca…"
            className="w-full h-12 px-3 text-lg border rounded-lg"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {resultados.map((p, i) => (
            <div
              key={p.id}
              onClick={() => setIndiceSeleccionado(i)}
              onDoubleClick={() => elegir(p)}
              className={`px-4 py-3 flex justify-between items-center cursor-pointer ${
                i === indiceSeleccionado ? "bg-brand/10" : "hover:bg-gray-50"
              }`}
            >
              <div>
                <p className="font-medium">{p.nombre}</p>
                <p className="text-sm text-gray-500">
                  Stock: {p.stock} {p.unidad_medida} {!p.activo && "· INACTIVO"}
                </p>
              </div>
              <span className="font-semibold">{formatoMoneda.format(p.precio_venta)}</span>
            </div>
          ))}
          {resultados.length === 0 && <p className="p-6 text-center text-gray-400">Sin resultados.</p>}
        </div>
        <div className="p-3 border-t text-xs text-gray-400 flex justify-between">
          <span>↑↓ Navegar · ENTER Seleccionar · Doble click</span>
          <span>ESC Cerrar</span>
        </div>
      </div>
    </div>
  );
}
