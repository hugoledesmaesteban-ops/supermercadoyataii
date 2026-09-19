import { useCarritoStore } from "@/store/carritoStore";

interface Props { onCerrar: () => void; }
const formatoMoneda = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 });

export default function ModalConfirmarBorrado({ onCerrar }: Props) {
  const { lineaSeleccionada, quitarLineaSeleccionada } = useCarritoStore();
  const linea = lineaSeleccionada();
  if (!linea) return null;
  const total = linea.cantidad * linea.precioUnitario - linea.descuento;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 space-y-3">
        <h2 className="text-lg font-bold text-brand">¿Eliminar este producto?</h2>
        <p className="text-gray-500 text-sm">Producto</p>
        <p className="font-medium">{linea.producto.nombre}</p>
        <p className="text-gray-500 text-sm">Cantidad</p>
        <p className="font-medium">{linea.cantidad}</p>
        <p className="text-gray-500 text-sm">Total</p>
        <p className="font-medium">{formatoMoneda.format(total)}</p>
        <div className="flex gap-2 pt-2">
          <button onClick={onCerrar} className="btn-pos flex-1 bg-gray-200 text-gray-700">CANCELAR</button>
          <button
            onClick={() => { quitarLineaSeleccionada(); onCerrar(); }}
            className="btn-pos flex-1 bg-red-600 text-white"
          >
            ELIMINAR
          </button>
        </div>
      </div>
    </div>
  );
}