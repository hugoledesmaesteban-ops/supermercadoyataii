const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", minimumFractionDigits: 0,
});

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short", timeStyle: "short",
});

interface Props {
  fecha: string;
  cantidadLineas: number;
  cantidadItems: number;
  total: number;
  onRecuperar: () => void;
  onDescartar: () => void;
}

export default function ModalVentaInterrumpida({
  fecha,
  cantidadLineas,
  cantidadItems,
  total,
  onRecuperar,
  onDescartar,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-amber-400 text-slate-900 p-4 flex items-center gap-3">
          <span className="text-3xl">⚠️</span>
          <div>
            <h2 className="text-lg font-black leading-tight">
              SE ENCONTRÓ UNA VENTA INTERRUMPIDA
            </h2>
            <p className="text-xs opacity-80">
              Del {formatoFecha.format(new Date(fecha))}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600">
            La última vez que se usó el sistema quedó una venta sin terminar.
            ¿Querés recuperarla o descartarla?
          </p>

          <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Productos distintos</span>
              <span className="font-semibold">{cantidadLineas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unidades totales</span>
              <span className="font-semibold">{cantidadItems}</span>
            </div>
            <div className="flex justify-between text-lg pt-1 border-t">
              <span className="font-semibold">Total</span>
              <span className="font-black text-brand">
                {formatoMoneda.format(total)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onDescartar}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 rounded-lg transition-colors"
            >
              🗑️ DESCARTAR
            </button>
            <button
              type="button"
              autoFocus
              onClick={onRecuperar}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              ↩️ RECUPERAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}