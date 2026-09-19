const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", minimumFractionDigits: 0,
});

interface Props {
  total: number;
  hayItems: boolean;
  haySeleccion: boolean;
  cantidadSuspendidas: number;

  onBuscar: () => void;
  onCantidad: () => void;
  onBorrar: () => void;
  onSuspender: () => void;
  onRecuperar: () => void;
  onDevolucion: () => void;
  onDescuento: () => void;
  onCambiarPrecio: () => void;
  onEfectivo: () => void;
  onTransferencia: () => void;
  onQr: () => void;
  onTarjeta: () => void;
  onCobrar: () => void;
}

function Boton({
  label,
  atajo,
  onClick,
  disabled,
  variante = "neutro",
  title,
}: {
  label: string;
  atajo: string;
  onClick?: () => void;
  disabled?: boolean;
  variante?: "neutro" | "verde" | "rojo" | "amarillo";
  title?: string;
}) {
  const base =
    "flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const colores: Record<string, string> = {
    neutro: "bg-slate-700 hover:bg-slate-600 text-white",
    verde: "bg-emerald-600 hover:bg-emerald-500 text-white",
    rojo: "bg-red-600 hover:bg-red-500 text-white",
    amarillo: "bg-amber-400 hover:bg-amber-300 text-slate-900",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${colores[variante]}`}
    >
      <span className="truncate">{label}</span>
      <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-bold shrink-0">
        {atajo}
      </span>
    </button>
  );
}

export default function PanelOperaciones(props: Props) {
  return (
    <aside className="bg-slate-900 text-white rounded-xl p-3 flex flex-col gap-2 h-full min-h-0 overflow-hidden">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-slate-400">Total a pagar</div>
        <div className="text-4xl font-black text-emerald-400 leading-none mt-0.5 tabular-nums">
          {formatoMoneda.format(props.total)}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <span>🛒</span> Carrito
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          <Boton label="🔎 Buscar" atajo="F1" onClick={props.onBuscar} />
          <Boton label="🔢 Cantidad" atajo="F2" disabled title="Próximamente" />
          <Boton label="🗑️ Borrar" atajo="F3" onClick={props.onBorrar} disabled={!props.haySeleccion} variante="rojo" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <span>⚙️</span> Operaciones
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          <Boton label="⏸️ Suspender" atajo="F4" onClick={props.onSuspender} disabled={!props.hayItems} />
          <Boton
            label="📂 Recuperar"
            atajo={`${props.cantidadSuspendidas}`}
            onClick={props.onRecuperar}
            variante={props.cantidadSuspendidas > 0 ? "amarillo" : "neutro"}
            title="Ver ventas suspendidas"
          />
          <Boton label="↩️ Devolución" atajo="F5" onClick={props.onDevolucion} />
          <Boton
            label="🏷️ Descuento"
            atajo="F6"
            onClick={props.onDescuento}
            disabled={!props.haySeleccion}
          />
          <Boton
            label="💲 Cambiar precio"
            atajo="F7"
            onClick={props.onCambiarPrecio}
            disabled={!props.haySeleccion}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <span>💳</span> Cobro
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          <Boton label="💵 Efectivo" atajo="F8" onClick={props.onEfectivo} disabled={!props.hayItems} variante="verde" />
          <Boton label="🏦 Transferencia" atajo="F9" onClick={props.onTransferencia} disabled={!props.hayItems} variante="verde" />
          <Boton label="📱 QR" atajo="F10" onClick={props.onQr} disabled={!props.hayItems} />
          <Boton label="💳 Tarjeta" atajo="F11" onClick={props.onTarjeta} disabled={!props.hayItems} />
        </div>
      </div>

      <div className="mt-auto pt-2">
        <button
          type="button"
          onClick={props.onCobrar}
          disabled={!props.hayItems}
          className="w-full bg-amber-400 hover:bg-amber-300 text-slate-900 text-xl font-black py-3 rounded-xl flex items-center justify-center gap-2 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          💰 COBRAR
          <span className="text-sm bg-black/15 px-2 py-0.5 rounded font-bold">F12</span>
        </button>
      </div>
    </aside>
  );
}