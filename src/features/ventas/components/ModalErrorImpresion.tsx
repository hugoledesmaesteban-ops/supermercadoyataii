interface Props {
  numeroVenta: string;
  onReintentar: () => Promise<void> | void;
  onImprimirDespues: () => void;
}

export default function ModalErrorImpresion({
  numeroVenta,
  onReintentar,
  onImprimirDespues,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-red-600 text-white p-4 flex items-center gap-3">
          <span className="text-3xl">🖨️</span>
          <div>
            <h2 className="text-lg font-black leading-tight">IMPRESORA DESCONECTADA</h2>
            <p className="text-xs opacity-90">Venta #{numeroVenta}</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            La venta se guardó correctamente, pero no se pudo imprimir el ticket.
            El ticket quedó guardado en la cola de impresión para reintentar después.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              autoFocus
              onClick={onReintentar}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-lg"
            >
              🔄 REINTENTAR
            </button>
            <button
              type="button"
              onClick={onImprimirDespues}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 rounded-lg"
            >
              📄 IMPRIMIR DESPUÉS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}