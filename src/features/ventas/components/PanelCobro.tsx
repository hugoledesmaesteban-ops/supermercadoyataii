import { useEffect, useState } from "react";
import type { MetodoPago, PagoInput } from "@/types/venta";
import ModalPagoQR from "./ModalPagoQR";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
});

const METODOS: { clave: MetodoPago; etiqueta: string; icono: string; atajo: string }[] = [
  { clave: "EFECTIVO", etiqueta: "Efectivo", icono: "💵", atajo: "F8" },
  { clave: "TRANSFERENCIA", etiqueta: "Transferencia", icono: "🏦", atajo: "F9" },
  { clave: "QR", etiqueta: "QR", icono: "📱", atajo: "F10" },
  { clave: "TARJETA", etiqueta: "Tarjeta", icono: "💳", atajo: "F11" },
  { clave: "OTRO", etiqueta: "Otro", icono: "💠", atajo: "" },
];

const MONTOS_RAPIDOS = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

interface Props {
  subtotal: number;
  descuento: number;
  total: number;
  metodoInicial?: MetodoPago;
  onConfirmar: (pagos: PagoInput[]) => void;
  onCancelar: () => void;
  confirmando: boolean;
}

export default function PanelCobro({
  subtotal,
  descuento,
  total,
  metodoInicial,
  onConfirmar,
  onCancelar,
  confirmando,
}: Props) {
  const [pagos, setPagos] = useState<PagoInput[]>([]);
  const [efectivoRecibido, setEfectivoRecibido] = useState("");
  const [montoActual, setMontoActual] = useState("");
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<MetodoPago>(
    metodoInicial ?? "EFECTIVO",
  );
  const [mostrarQr, setMostrarQr] = useState(false);

  useEffect(() => {
    if (metodoInicial === "QR") setMostrarQr(true);
    else if (metodoInicial) setMetodoSeleccionado(metodoInicial);
  }, [metodoInicial]);

  const totalPagado = pagos.reduce((acc, p) => acc + p.monto, 0);
  const restante = Math.max(total - totalPagado, 0);
  const pagadoCompleto = totalPagado >= total - 0.01;
  const recibidoNumerico = parseFloat(efectivoRecibido.replace(",", ".")) || 0;

  const vueltoEnVivo =
    metodoSeleccionado === "EFECTIVO" ? Math.max(recibidoNumerico - restante, 0) : 0;

  const faltanteEnVivo =
    metodoSeleccionado === "EFECTIVO" && recibidoNumerico > 0 && recibidoNumerico < restante
      ? restante - recibidoNumerico
      : 0;

  const vueltoTotal = pagos
    .filter((p) => p.metodo === "EFECTIVO" && p.monto_recibido)
    .reduce((acc, p) => acc + Math.max((p.monto_recibido ?? 0) - p.monto, 0), 0);

  function agregarPago() {
    if (pagadoCompleto) return;

    if (metodoSeleccionado === "EFECTIVO") {
      const recibido = recibidoNumerico || restante;

      if (recibido >= restante) {
        setPagos([...pagos, { metodo: "EFECTIVO", monto: restante, monto_recibido: recibido }]);
      } else {
        setPagos([...pagos, { metodo: "EFECTIVO", monto: recibido, monto_recibido: recibido }]);
      }
      setEfectivoRecibido("");
      return;
    }

    const monto = parseFloat(montoActual.replace(",", ".")) || restante;
    if (monto <= 0) return;
    setPagos([
      ...pagos,
      {
        metodo: metodoSeleccionado,
        monto: Math.min(monto, restante),
        monto_recibido: null,
      },
    ]);
    setMontoActual("");
  }

  function quitarPago(indice: number) {
    setPagos(pagos.filter((_, i) => i !== indice));
  }

  function manejarPagoQrConfirmado() {
    setMostrarQr(false);
    setPagos([...pagos, { metodo: "QR", monto: restante, monto_recibido: null }]);
  }

  const puedeConfirmar = pagadoCompleto && pagos.length > 0 && !confirmando;
  const puedeAgregar =
    !pagadoCompleto &&
    (metodoSeleccionado !== "EFECTIVO" ? true : recibidoNumerico > 0);

  // Manejo de teclas GLOBAL del modal (ENTER, ESC)
  function manejarTecla(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancelar();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      // Si ya está todo pagado → confirmar
      if (puedeConfirmar) {
        onConfirmar(pagos);
        return;
      }
      // Si se puede agregar → agregar
      if (puedeAgregar) {
        agregarPago();
        return;
      }
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto"
        onKeyDown={manejarTecla}
        tabIndex={-1}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6 overflow-hidden">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <h2 className="text-lg font-black leading-tight tracking-tight">COBRAR</h2>
                <p className="text-xs opacity-70">
                  {pagadoCompleto ? "✅ PAGO COMPLETO" : "Seleccioná método y monto"}
                </p>
              </div>
            </div>
            <button
              onClick={onCancelar}
              className="text-white/70 hover:text-white text-2xl leading-none px-2"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_340px]">
            <div className="p-6 space-y-5">
              <div className="text-center space-y-1">
                {descuento > 0 && (
                  <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 mb-2">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{formatoMoneda.format(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-emerald-700 font-semibold">
                      <span>🏷️ Descuento aplicado</span>
                      <span className="tabular-nums">-{formatoMoneda.format(descuento)}</span>
                    </div>
                  </div>
                )}
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  {pagadoCompleto ? "Total pagado" : "Total a pagar"}
                </p>
                <p className="text-5xl font-black text-slate-800 tabular-nums leading-none mt-1">
                  {formatoMoneda.format(total)}
                </p>
                {!pagadoCompleto && pagos.length > 0 && (
                  <p className="text-amber-600 font-bold text-sm mt-2">
                    Falta cobrar: {formatoMoneda.format(restante)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                  Método de pago
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {METODOS.map((m) => (
                    <button
                      key={m.clave}
                      onClick={() => {
                        if (m.clave === "QR") {
                          setMostrarQr(true);
                          return;
                        }
                        setMetodoSeleccionado(m.clave);
                        setMontoActual("");
                        setEfectivoRecibido("");
                      }}
                      disabled={pagadoCompleto}
                      className={`relative flex flex-col items-center justify-center py-3 px-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 ${
                        metodoSeleccionado === m.clave
                          ? "bg-brand text-white shadow-md"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="text-xl">{m.icono}</span>
                      <span className="mt-0.5">{m.etiqueta}</span>
                      {m.atajo && (
                        <span className="absolute top-1 right-1 text-[9px] bg-black/20 px-1 py-0.5 rounded font-bold">
                          {m.atajo}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {metodoSeleccionado === "EFECTIVO" ? (
                <div className="space-y-3">
                  <input
                    autoFocus
                    value={efectivoRecibido}
                    onChange={(e) => setEfectivoRecibido(e.target.value)}
                    placeholder={`Recibido (a cobrar: ${formatoMoneda.format(restante)})`}
                    inputMode="decimal"
                    className="w-full h-16 px-4 text-3xl text-center font-bold border-2 border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-none tabular-nums"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {MONTOS_RAPIDOS.map((monto) => (
                      <button
                        key={monto}
                        onClick={() => setEfectivoRecibido(String(monto))}
                        className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold"
                      >
                        {formatoMoneda.format(monto)}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setEfectivoRecibido(String(restante))}
                      className="py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-semibold"
                    >
                      ✅ EXACTO
                    </button>
                    <button
                      onClick={() => setEfectivoRecibido("")}
                      className="py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-semibold"
                    >
                      🗑️ BORRAR
                    </button>
                  </div>
                  {vueltoEnVivo > 0 && (
                    <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-3 text-center">
                      <p className="text-xs uppercase tracking-widest text-emerald-700 font-bold">
                        Vuelto
                      </p>
                      <p className="text-4xl font-black text-emerald-700 tabular-nums leading-tight">
                        {formatoMoneda.format(vueltoEnVivo)}
                      </p>
                    </div>
                  )}
                  {faltanteEnVivo > 0 && pagos.length === 0 && (
                    <p className="text-center text-amber-600 font-bold text-sm">
                      ⚠️ Pago parcial. Faltarían {formatoMoneda.format(faltanteEnVivo)} (podés cobrarlos con otro método).
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    autoFocus
                    value={montoActual}
                    onChange={(e) => setMontoActual(e.target.value)}
                    placeholder={`Monto (por defecto: ${formatoMoneda.format(restante)})`}
                    inputMode="decimal"
                    className="w-full h-14 px-4 text-2xl text-center font-bold border-2 border-slate-300 rounded-xl focus:border-brand focus:outline-none tabular-nums"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMontoActual(String(restante))}
                      className="py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-semibold"
                    >
                      ✅ COBRAR TODO EL RESTANTE
                    </button>
                    <button
                      onClick={() => setMontoActual("")}
                      className="py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-semibold"
                    >
                      🗑️ BORRAR
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={agregarPago}
                disabled={!puedeAgregar}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ➕ AGREGAR PAGO
              </button>
            </div>

            <div className="bg-slate-50 p-6 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col gap-4">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                Pagos agregados
              </h3>

              {pagos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 text-sm gap-2 py-8">
                  <span className="text-3xl">🧾</span>
                  <p>Todavía no agregaste ningún pago.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pagos.map((p, i) => {
                    const metodo = METODOS.find((m) => m.clave === p.metodo);
                    return (
                      <div
                        key={i}
                        className="bg-white rounded-lg p-3 flex items-center justify-between shadow-sm border border-slate-200"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl shrink-0">{metodo?.icono ?? "💠"}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {metodo?.etiqueta ?? p.metodo}
                            </p>
                            {p.metodo === "EFECTIVO" && p.monto_recibido && (
                              <p className="text-xs text-slate-500">
                                Recibido: {formatoMoneda.format(p.monto_recibido)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold tabular-nums">
                            {formatoMoneda.format(p.monto)}
                          </span>
                          <button
                            onClick={() => quitarPago(i)}
                            className="w-7 h-7 rounded bg-red-100 hover:bg-red-500 text-red-600 hover:text-white transition-colors flex items-center justify-center"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {vueltoTotal > 0 && (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 text-center mt-2">
                      <p className="text-xs uppercase tracking-widest text-emerald-700 font-bold">
                        Vuelto a entregar
                      </p>
                      <p className="text-2xl font-black text-emerald-700 tabular-nums">
                        {formatoMoneda.format(vueltoTotal)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-auto bg-white rounded-lg p-3 border border-slate-200 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total</span>
                  <span className="font-semibold tabular-nums">{formatoMoneda.format(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pagado</span>
                  <span className="font-semibold tabular-nums">{formatoMoneda.format(totalPagado)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-semibold">
                    {pagadoCompleto ? "✅ Completo" : "Restante"}
                  </span>
                  <span
                    className={`font-black tabular-nums ${
                      pagadoCompleto ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {pagadoCompleto ? "—" : formatoMoneda.format(restante)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  disabled={!puedeConfirmar}
                  onClick={() => onConfirmar(pagos)}
                  className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xl disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  {confirmando ? "⏳ Confirmando…" : "💰 CONFIRMAR COBRO"}
                </button>
                <button
                  onClick={onCancelar}
                  disabled={confirmando}
                  className="w-full py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm disabled:opacity-50"
                >
                  Cancelar (ESC)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {mostrarQr && (
        <ModalPagoQR
          total={restante}
          onConfirmado={manejarPagoQrConfirmado}
          onCancelar={() => setMostrarQr(false)}
        />
      )}
    </>
  );
}
