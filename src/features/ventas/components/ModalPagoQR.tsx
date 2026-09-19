import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  crearQrMercadoPago,
  verificarPagoMercadoPago,
  type QRData,
} from "@/services/mercadopagoService";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
});

interface Props {
  total: number;
  onConfirmado: () => void;
  onCancelar: () => void;
}

type Estado = "creando" | "esperando" | "aprobado" | "error";

export default function ModalPagoQR({ total, onConfirmado, onCancelar }: Props) {
  const [estado, setEstado] = useState<Estado>("creando");
  const [qr, setQr] = useState<QRData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intentos, setIntentos] = useState(0);
  const [paymentId, setPaymentId] = useState<number | null>(null);

  const intervaloRef = useRef<number | null>(null);

  async function generar() {
    setEstado("creando");
    setError(null);
    try {
      const data = await crearQrMercadoPago(total);
      setQr(data);
      setEstado("esperando");
    } catch (e) {
      setError(String(e));
      setEstado("error");
    }
  }

  useEffect(() => {
    generar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (estado !== "esperando" || !qr) return;

    intervaloRef.current = window.setInterval(async () => {
      try {
        const resultado = await verificarPagoMercadoPago(qr.external_reference);
        setIntentos((i) => i + 1);
        if (resultado.aprobado) {
          setPaymentId(resultado.payment_id);
          setEstado("aprobado");
          if (intervaloRef.current) {
            window.clearInterval(intervaloRef.current);
          }
          setTimeout(() => onConfirmado(), 1200);
        }
      } catch {
        // silencioso, seguimos intentando
      }
    }, 3000);

    return () => {
      if (intervaloRef.current) {
        window.clearInterval(intervaloRef.current);
      }
    };
  }, [estado, qr, onConfirmado]);

  function manejarTecla(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancelar();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4 outline-none"
      tabIndex={-1}
      onKeyDown={manejarTecla}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-sky-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <h2 className="text-lg font-black leading-tight">PAGO QR</h2>
              <p className="text-xs opacity-90">Mercado Pago</p>
            </div>
          </div>
          <button
            onClick={onCancelar}
            className="text-white/80 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4 text-center">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
            <p className="text-xs uppercase tracking-widest text-sky-700 font-semibold">
              Total a pagar
            </p>
            <p className="text-4xl font-black text-sky-900 tabular-nums">
              {formatoMoneda.format(total)}
            </p>
          </div>

          {estado === "creando" && (
            <div className="py-12 text-slate-400">
              <p className="text-4xl mb-2 animate-pulse">⏳</p>
              <p>Generando QR…</p>
            </div>
          )}

          {estado === "error" && (
            <div className="py-8 space-y-3">
              <p className="text-4xl">🔴</p>
              <p className="text-red-600 font-semibold text-sm">
                {error ?? "No se pudo generar el QR."}
              </p>
              <button
                onClick={generar}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm"
              >
                🔄 Reintentar
              </button>
            </div>
          )}

          {estado === "esperando" && qr && (
            <>
              <div className="bg-white border-4 border-slate-200 rounded-xl p-3 inline-block">
                <QRCodeSVG value={qr.qr_texto} size={240} level="M" />
              </div>
              <div className="flex items-center justify-center gap-2 text-sky-700 font-semibold text-sm animate-pulse">
                <span className="w-2 h-2 bg-sky-500 rounded-full" />
                🟡 ESPERANDO PAGO…
              </div>
              <p className="text-xs text-slate-500">
                El cliente escanea con la app de Mercado Pago. Se verifica cada 3 segundos.
              </p>
              {intentos > 0 && (
                <p className="text-[10px] text-slate-400">
                  Verificaciones: {intentos}
                </p>
              )}
            </>
          )}

          {estado === "aprobado" && (
            <div className="py-8 space-y-3">
              <p className="text-6xl">✅</p>
              <p className="text-2xl font-black text-emerald-700">PAGO CONFIRMADO</p>
              {paymentId && (
                <p className="text-xs text-slate-500">ID: {paymentId}</p>
              )}
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-slate-50 text-center">
          <button
            onClick={onCancelar}
            className="text-sm text-slate-500 hover:text-slate-700 font-semibold"
          >
            Cancelar (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
