import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  calcularResumenCierre,
  listarCierresAnteriores,
  listarMovimientosCaja,
  registrarMovimientoCaja,
  obtenerCajaAbierta,
  type Caja,
  type CierreAnterior,
  type MovimientoCaja,
  type ResumenCierre,
  type TipoMovimientoCaja,
} from "@/services/cajaService";
import { useSesionStore } from "@/store/sesionStore";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
});

const formatoFechaHora = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
});

const ETIQUETAS_TIPO: Record<string, { label: string; color: string; icono: string }> = {
  APERTURA: { label: "Apertura",  color: "bg-emerald-100 text-emerald-800", icono: "🟢" },
  VENTA:    { label: "Venta",     color: "bg-blue-100 text-blue-800",       icono: "🛒" },
  INGRESO:  { label: "Ingreso",   color: "bg-cyan-100 text-cyan-800",       icono: "⬆️" },
  RETIRO:   { label: "Retiro",    color: "bg-amber-100 text-amber-800",     icono: "⬇️" },
  GASTO:    { label: "Gasto",     color: "bg-red-100 text-red-800",         icono: "💸" },
  DEVOLUCION:{ label: "Devolución", color: "bg-purple-100 text-purple-800", icono: "↩️" },
};

function etiquetaTipo(tipo: string) {
  return ETIQUETAS_TIPO[tipo] ?? { label: tipo, color: "bg-gray-100 text-gray-700", icono: "•" };
}

export default function PantallaCaja() {
  const usuario = useSesionStore((s) => s.usuario);
  const cajaId = useSesionStore((s) => s.cajaId);
  const navigate = useNavigate();

  const [caja, setCaja] = useState<Caja | null>(null);
  const [resumen, setResumen] = useState<ResumenCierre | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [cierres, setCierres] = useState<CierreAnterior[]>([]);
  const [cargando, setCargando] = useState(true);

  const [tipoMov, setTipoMov] = useState<TipoMovimientoCaja | null>(null);
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const [c, movs, hist] = await Promise.all([
        obtenerCajaAbierta(),
        cajaId ? listarMovimientosCaja(cajaId, false) : Promise.resolve([]),
        listarCierresAnteriores(20),
      ]);
      setCaja(c);
      setMovimientos(movs);
      setCierres(hist);

      if (c) {
        const r = await calcularResumenCierre(c.id);
        setResumen(r);
      } else {
        setResumen(null);
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajaId]);

  function abrirModal(tipo: TipoMovimientoCaja) {
    setTipoMov(tipo);
    setMonto("");
    setMotivo("");
    setError(null);
  }

  function cerrarModal() {
    setTipoMov(null);
    setMonto("");
    setMotivo("");
    setError(null);
  }

  async function confirmarMovimiento() {
    if (!usuario || !cajaId || !tipoMov) return;

    const montoNum = parseFloat(monto.replace(",", "."));
    if (isNaN(montoNum) || montoNum <= 0) {
      setError("Ingresá un monto válido mayor a cero.");
      return;
    }
    if (!motivo.trim()) {
      setError("Falta el motivo.");
      return;
    }

    setProcesando(true);
    setError(null);
    try {
      await registrarMovimientoCaja(cajaId, tipoMov, montoNum, motivo.trim(), usuario.id);
      cerrarModal();
      await cargar();
    } catch (e) {
      setError(String(e));
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return <div className="p-8 text-center text-slate-400">Cargando caja…</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-brand">Caja</h1>
          <p className="text-sm text-gray-500">
            Estado actual, movimientos y cierres anteriores
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cargar}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg text-sm"
          >
            🔄 Refrescar
          </button>
          {caja && (
            <button
              onClick={() => navigate("/cierre-caja")}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              🔒 Cerrar caja
            </button>
          )}
          {!caja && (
            <button
              onClick={() => navigate("/apertura-caja")}
              className="bg-brand hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              🟢 Abrir caja
            </button>
          )}
        </div>
      </div>

      {!caja && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-center">
          <p className="text-lg font-semibold text-amber-800">🔴 No hay caja abierta</p>
          <p className="text-sm text-amber-700 mt-1">
            Para vender necesitás abrir la caja con un fondo inicial.
          </p>
        </div>
      )}

      {caja && resumen && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Tarjeta titulo="Apertura" valor={formatoMoneda.format(caja.monto_apertura)} subtitulo={formatoFechaHora.format(new Date(caja.fecha_apertura))} />
            <Tarjeta titulo="Vendido" valor={formatoMoneda.format(resumen.total_vendido)} subtitulo={`${resumen.cantidad_tickets} tickets`} destacado />
            <Tarjeta titulo="Efectivo esperado" valor={formatoMoneda.format(resumen.efectivo_esperado)} subtitulo="en caja ahora" destacado />
            <Tarjeta titulo="Retiros / Gastos" valor={formatoMoneda.format(resumen.retiros + resumen.gastos)} subtitulo={resumen.ingresos > 0 ? `+${formatoMoneda.format(resumen.ingresos)} ingresos` : "sin ingresos"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-sm uppercase tracking-widest text-slate-500 font-bold mb-3">
                Ventas por método
              </h2>
              <div className="space-y-1.5 text-sm">
                <FilaResumen label="💵 Efectivo" valor={formatoMoneda.format(resumen.efectivo)} />
                <FilaResumen label="🏦 Transferencia" valor={formatoMoneda.format(resumen.transferencia)} />
                <FilaResumen label="💳 Tarjeta" valor={formatoMoneda.format(resumen.tarjeta)} />
                <FilaResumen label="📱 QR" valor={formatoMoneda.format(resumen.qr)} />
                <FilaResumen label="💠 Otros" valor={formatoMoneda.format(resumen.otros)} />
                <div className="border-t pt-2 mt-2">
                  <FilaResumen label="Total" valor={formatoMoneda.format(resumen.total_vendido)} destacado />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-sm uppercase tracking-widest text-slate-500 font-bold mb-3">
                Movimientos manuales
              </h2>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => abrirModal("INGRESO")}
                  className="py-4 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-semibold text-sm flex flex-col items-center gap-1"
                >
                  <span className="text-2xl">⬆️</span>
                  Ingreso
                </button>
                <button
                  onClick={() => abrirModal("RETIRO")}
                  className="py-4 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-sm flex flex-col items-center gap-1"
                >
                  <span className="text-2xl">⬇️</span>
                  Retiro
                </button>
                <button
                  onClick={() => abrirModal("GASTO")}
                  className="py-4 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 font-semibold text-sm flex flex-col items-center gap-1"
                >
                  <span className="text-2xl">💸</span>
                  Gasto
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Ingreso = plata que entra. Retiro = plata que sacás. Gasto = pago con plata de la caja.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-slate-700">Movimientos de esta caja</h2>
              <span className="text-xs text-slate-500">
                {movimientos.length} registro{movimientos.length === 1 ? "" : "s"}
              </span>
            </div>
            {movimientos.length === 0 && (
              <p className="p-6 text-center text-slate-400">Sin movimientos.</p>
            )}
            {movimientos.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Fecha</th>
                    <th className="text-left px-3 py-2 font-semibold">Tipo</th>
                    <th className="text-left px-3 py-2 font-semibold">Usuario</th>
                    <th className="text-left px-3 py-2 font-semibold">Motivo</th>
                    <th className="text-right px-4 py-2 font-semibold">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => {
                    const et = etiquetaTipo(m.tipo);
                    const signo = m.tipo === "INGRESO" ? "+" : m.tipo === "APERTURA" ? "" : "−";
                    return (
                      <tr key={m.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                          {formatoFechaHora.format(new Date(m.fecha))}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${et.color}`}>
                            <span>{et.icono}</span>
                            {et.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{m.usuario_nombre ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-500 truncate max-w-xs">{m.motivo ?? "—"}</td>
                        <td className="px-4 py-2 text-right font-bold tabular-nums">
                          <span className={m.tipo === "INGRESO" ? "text-cyan-700" : m.tipo === "APERTURA" ? "text-emerald-700" : "text-red-700"}>
                            {signo}{formatoMoneda.format(m.monto)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-bold text-slate-700">Cierres anteriores</h2>
        </div>
        {cierres.length === 0 && (
          <p className="p-6 text-center text-slate-400">Todavía no hay cierres registrados.</p>
        )}
        {cierres.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Apertura</th>
                <th className="text-left px-3 py-2 font-semibold">Cierre</th>
                <th className="text-left px-3 py-2 font-semibold">Usuario</th>
                <th className="text-right px-3 py-2 font-semibold">Esperado</th>
                <th className="text-right px-3 py-2 font-semibold">Declarado</th>
                <th className="text-right px-4 py-2 font-semibold">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {cierres.map((c) => {
                const dif = c.diferencia ?? 0;
                const difColor = Math.abs(dif) < 0.01 ? "text-slate-600" : dif > 0 ? "text-amber-700" : "text-red-700";
                const difLabel = Math.abs(dif) < 0.01 ? "Cuadrada" : dif > 0 ? `Sobrante ${formatoMoneda.format(dif)}` : `Faltante ${formatoMoneda.format(Math.abs(dif))}`;
                return (
                  <tr key={c.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                      {formatoFechaHora.format(new Date(c.fecha_apertura))}
                    </td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                      {c.fecha_cierre ? formatoFechaHora.format(new Date(c.fecha_cierre)) : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {c.usuario_cierre_nombre ?? c.usuario_apertura_nombre ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {c.efectivo_esperado !== null ? formatoMoneda.format(c.efectivo_esperado) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {c.efectivo_declarado !== null ? formatoMoneda.format(c.efectivo_declarado) : "—"}
                    </td>
                    <td className={`px-4 py-2 text-right font-bold tabular-nums ${difColor}`}>
                      {difLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {tipoMov && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className={`p-4 text-white flex items-center justify-between ${
              tipoMov === "INGRESO" ? "bg-cyan-600" : tipoMov === "RETIRO" ? "bg-amber-500" : "bg-red-600"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {tipoMov === "INGRESO" ? "⬆️" : tipoMov === "RETIRO" ? "⬇️" : "💸"}
                </span>
                <div>
                  <h2 className="text-base font-black">
                    {tipoMov === "INGRESO" ? "INGRESO A CAJA" : tipoMov === "RETIRO" ? "RETIRO DE CAJA" : "GASTO"}
                  </h2>
                  <p className="text-xs opacity-80">
                    {tipoMov === "INGRESO" ? "Plata que entra a la caja" : tipoMov === "RETIRO" ? "Plata que sale de la caja" : "Pago de un gasto con plata de la caja"}
                  </p>
                </div>
              </div>
              <button onClick={cerrarModal} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monto</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  autoFocus
                  placeholder="$"
                  className="w-full h-14 px-3 text-2xl text-center font-bold border-2 border-slate-300 rounded-lg focus:border-slate-800 outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder={
                    tipoMov === "GASTO"
                      ? "ej: pago de luz, proveedor…"
                      : tipoMov === "RETIRO"
                      ? "ej: retiro para depósito…"
                      : "ej: cambio de billetes…"
                  }
                  className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg focus:border-slate-800 outline-none"
                />
              </div>

              {error && <p className="text-red-600 font-semibold text-sm">🔴 {error}</p>}

              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={cerrarModal}
                  disabled={procesando}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 rounded-lg disabled:opacity-50"
                >
                  CANCELAR
                </button>
                <button
                  onClick={confirmarMovimiento}
                  disabled={procesando}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                >
                  {procesando ? "Guardando…" : "✅ CONFIRMAR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tarjeta({ titulo, valor, subtitulo, destacado }: { titulo: string; valor: string; subtitulo?: string; destacado?: boolean }) {
  return (
    <div className={`bg-white rounded-xl shadow p-4 ${destacado ? "ring-2 ring-brand" : ""}`}>
      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{titulo}</p>
      <p className={`text-2xl font-black tabular-nums ${destacado ? "text-brand" : "text-slate-800"}`}>{valor}</p>
      {subtitulo && <p className="text-xs text-slate-400 mt-1">{subtitulo}</p>}
    </div>
  );
}

function FilaResumen({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div className={`flex justify-between ${destacado ? "font-bold text-base text-slate-800" : "text-slate-600"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}
