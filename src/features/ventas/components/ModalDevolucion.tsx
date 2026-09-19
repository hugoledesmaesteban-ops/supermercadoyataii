import { useEffect, useRef, useState } from "react";
import { useSesionStore } from "@/store/sesionStore";
import {
  buscarVentaParaDevolucion,
  registrarDevolucion,
  type VentaParaDevolucion,
} from "@/services/devolucionesService";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", minimumFractionDigits: 0,
});

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short", timeStyle: "short",
});

interface Props {
  onCerrar: () => void;
  onRegistrada: (numero: string) => void;
}

type Cantidades = Record<number, number>;

export default function ModalDevolucion({ onCerrar, onRegistrada }: Props) {
  const usuario = useSesionStore((s) => s.usuario);

  const [numero, setNumero] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [venta, setVenta] = useState<VentaParaDevolucion | null>(null);
  const [cantidades, setCantidades] = useState<Cantidades>({});
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function buscar() {
    if (!numero.trim()) return;
    setBuscando(true);
    setError(null);
    setVenta(null);
    try {
      const r = await buscarVentaParaDevolucion(numero.trim());
      if (!r) {
        setError(`No se encontró la venta ${numero}.`);
      } else if (r.items.every((i) => i.cantidad_disponible <= 0.001)) {
        setError(`La venta ${numero} ya fue devuelta por completo.`);
      } else {
        setVenta(r);
        setCantidades({});
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBuscando(false);
    }
  }

  function setCantidad(detalleId: number, valor: number, max: number) {
    const limpio = Math.max(0, Math.min(valor, max));
    setCantidades((c) => ({ ...c, [detalleId]: limpio }));
  }

  function devolverTodo() {
    if (!venta) return;
    const todas: Cantidades = {};
    for (const it of venta.items) {
      todas[it.detalle_venta_id] = it.cantidad_disponible;
    }
    setCantidades(todas);
  }

  const itemsAEnviar = venta
    ? venta.items
        .map((it) => ({
          detalle_venta_id: it.detalle_venta_id,
          producto_id: it.producto_id,
          cantidad: cantidades[it.detalle_venta_id] ?? 0,
          precio_unitario: it.precio_unitario,
        }))
        .filter((i) => i.cantidad > 0.0001)
    : [];

  const totalDevolucion = itemsAEnviar.reduce(
    (acc, i) => acc + i.cantidad * i.precio_unitario,
    0,
  );

  async function confirmar() {
    if (!venta || !usuario) return;
    if (itemsAEnviar.length === 0) {
      setError("Seleccioná al menos un producto para devolver.");
      return;
    }
    if (!motivo.trim()) {
      setError("Falta el motivo de la devolución.");
      return;
    }
    setRegistrando(true);
    setError(null);
    try {
      const r = await registrarDevolucion(
        venta.venta_id,
        usuario.id,
        motivo.trim(),
        itemsAEnviar.map((i) => ({
          detalle_venta_id: i.detalle_venta_id,
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          subtotal: Math.round(i.cantidad * i.precio_unitario * 100) / 100,
        })),
      );
      onRegistrada(r.numero);
    } catch (e) {
      setError(String(e));
    } finally {
      setRegistrando(false);
    }
  }

  function manejarTeclaBusqueda(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCerrar();
    if (e.key === "Enter") buscar();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-12 z-[65] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">↩️</span>
            <div>
              <h2 className="text-lg font-black leading-tight">DEVOLUCIÓN</h2>
              <p className="text-xs opacity-80">Buscar ticket y seleccionar qué devolver</p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {!venta && (
            <>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  onKeyDown={manejarTeclaBusqueda}
                  placeholder="Número de ticket (ej: 000012)"
                  className="flex-1 h-12 px-3 text-lg border-2 border-slate-300 rounded-lg focus:border-slate-800 outline-none"
                />
                <button
                  onClick={buscar}
                  disabled={buscando}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 rounded-lg disabled:opacity-50"
                >
                  {buscando ? "Buscando…" : "🔎 Buscar"}
                </button>
              </div>
              {error && <p className="text-red-600 font-semibold text-sm">🔴 {error}</p>}
              <p className="text-xs text-slate-500">
                El número de ticket es el que aparece en la parte superior del comprobante.
              </p>
            </>
          )}

          {venta && (
            <>
              <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold">Venta #{venta.numero}</p>
                  <p className="text-slate-500 text-xs">{formatoFecha.format(new Date(venta.fecha))}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total original</p>
                  <p className="font-bold">{formatoMoneda.format(venta.total)}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="text-left px-3 py-2">Producto</th>
                      <th className="px-2 py-2 w-24">Vendido</th>
                      <th className="px-2 py-2 w-24">Ya dev.</th>
                      <th className="px-2 py-2 w-24">Disp.</th>
                      <th className="px-2 py-2 w-40">Devolver</th>
                      <th className="px-2 py-2 w-24 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venta.items.map((it) => {
                      const cant = cantidades[it.detalle_venta_id] ?? 0;
                      const sinStock = it.cantidad_disponible <= 0.001;
                      return (
                        <tr key={it.detalle_venta_id} className="border-t">
                          <td className="px-3 py-2">{it.nombre_producto}</td>
                          <td className="px-2 py-2 text-center">{it.cantidad}</td>
                          <td className="px-2 py-2 text-center text-slate-400">
                            {it.cantidad_ya_devuelta > 0 ? it.cantidad_ya_devuelta : "—"}
                          </td>
                          <td className="px-2 py-2 text-center font-semibold">
                            {it.cantidad_disponible}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setCantidad(it.detalle_venta_id, cant - 1, it.cantidad_disponible)}
                                disabled={sinStock}
                                className="w-7 h-7 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-30"
                              >−</button>
                              <input
                                type="number"
                                value={cant}
                                onChange={(e) => setCantidad(it.detalle_venta_id, Number(e.target.value), it.cantidad_disponible)}
                                disabled={sinStock}
                                className="w-16 h-7 text-center border rounded disabled:bg-slate-100"
                                min={0}
                                max={it.cantidad_disponible}
                                step={it.es_pesable ? 0.001 : 1}
                              />
                              <button
                                type="button"
                                onClick={() => setCantidad(it.detalle_venta_id, cant + 1, it.cantidad_disponible)}
                                disabled={sinStock}
                                className="w-7 h-7 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-30"
                              >+</button>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right font-semibold">
                            {formatoMoneda.format(cant * it.precio_unitario)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={devolverTodo}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg text-sm"
                >
                  Marcar todo
                </button>
                <button
                  onClick={() => setCantidades({})}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg text-sm"
                >
                  Limpiar selección
                </button>
                <button
                  onClick={() => { setVenta(null); setCantidades({}); setMotivo(""); setNumero(""); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg text-sm"
                >
                  Buscar otro ticket
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="ej: producto en mal estado, error del cajero…"
                  className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg focus:border-slate-800 outline-none"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex justify-between items-center">
                <span className="font-semibold text-emerald-800">TOTAL A DEVOLVER</span>
                <span className="text-2xl font-black text-emerald-700">
                  {formatoMoneda.format(totalDevolucion)}
                </span>
              </div>

              {error && <p className="text-red-600 font-semibold text-sm">🔴 {error}</p>}

              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={onCerrar}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 rounded-lg"
                >
                  CANCELAR
                </button>
                <button
                  onClick={confirmar}
                  disabled={registrando || itemsAEnviar.length === 0 || !motivo.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg disabled:opacity-40"
                >
                  {registrando ? "Registrando…" : "✅ REGISTRAR DEVOLUCIÓN"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}