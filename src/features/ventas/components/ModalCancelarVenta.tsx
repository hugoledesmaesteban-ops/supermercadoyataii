import { useCarritoStore } from "@/store/carritoStore";

interface Props { onCerrar: () => void; }

export default function ModalCancelarVenta({ onCerrar }: Props) {
  const vaciarCarrito = useCarritoStore((s) => s.vaciarCarrito);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 space-y-3 text-center">
        <h2 className="text-lg font-bold text-brand">¿Cancelar esta venta?</h2>
        <p className="text-gray-500 text-sm">Se van a borrar todos los productos del carrito.</p>
        <div className="flex gap-2 pt-2">
          <button onClick={onCerrar} className="btn-pos flex-1 bg-gray-200 text-gray-700">NO</button>
          <button
            onClick={() => { vaciarCarrito(); onCerrar(); }}
            className="btn-pos flex-1 bg-red-600 text-white"
          >
            SÍ, CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
}