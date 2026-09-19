import { useCarritoStore } from "@/store/carritoStore";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", minimumFractionDigits: 0,
});

export default function Carrito() {
  const {
    lineas, cambiarCantidad, quitarLinea,
    claveSeleccionada, seleccionarLinea,
  } = useCarritoStore();

  if (lineas.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 py-12">
        <span className="text-4xl">🛒</span>
        <p className="text-base">El carrito está vacío.</p>
        <p className="text-sm">Escaneá un producto para empezar.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto -mx-2">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b-2 border-slate-200">
            <th className="py-2 px-3 font-semibold">Producto</th>
            <th className="py-2 px-2 font-semibold text-center w-40">Cantidad</th>
            <th className="py-2 px-2 font-semibold text-right w-28">Precio</th>
            <th className="py-2 px-2 font-semibold text-right w-32">Subtotal</th>
            <th className="py-2 px-2 w-14"></th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l) => {
            const subtotal = l.cantidad * l.precioUnitario - l.descuento;
            const seleccionada = l.clave === claveSeleccionada;
            return (
              <tr
                key={l.clave}
                onClick={() => seleccionarLinea(l.clave)}
                className={`cursor-pointer border-b border-slate-100 transition-colors ${
                  seleccionada
                    ? "bg-emerald-50 ring-2 ring-emerald-500 ring-inset"
                    : "hover:bg-slate-50"
                }`}
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      📦
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {l.producto.nombre}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {l.producto.codigo_barra
                          ? `SKU: ${l.producto.codigo_barra}`
                          : `ID: ${l.producto.id}`}
                        {l.descuento > 0 && (
                          <span className="ml-2 text-emerald-600 font-semibold">
                            −{formatoMoneda.format(l.descuento)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-2">
                  {l.producto.es_pesable ? (
                    <div className="text-center text-sm font-semibold text-slate-700">
                      {l.cantidad.toFixed(3)} kg
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(l.clave, l.cantidad - 1)}
                        className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 text-lg font-bold flex items-center justify-center"
                        title="Restar 1"
                      >
                        −
                      </button>
                      <span className="w-10 text-center font-bold text-base tabular-nums">
                        {l.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(l.clave, l.cantidad + 1)}
                        className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 text-lg font-bold flex items-center justify-center"
                        title="Sumar 1"
                      >
                        +
                      </button>
                    </div>
                  )}
                </td>

                <td className="py-3 px-2 text-right text-sm text-slate-600 tabular-nums">
                  {formatoMoneda.format(l.precioUnitario)}
                  {l.producto.es_pesable && (
                    <span className="text-xs text-slate-400"> /kg</span>
                  )}
                </td>

                <td className="py-3 px-2 text-right font-bold text-slate-800 tabular-nums">
                  {formatoMoneda.format(subtotal)}
                </td>

                <td className="py-3 px-2 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      quitarLinea(l.clave);
                    }}
                    className="w-9 h-9 rounded-lg bg-red-100 hover:bg-red-500 text-red-600 hover:text-white flex items-center justify-center transition-colors"
                    title="Eliminar del carrito"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}