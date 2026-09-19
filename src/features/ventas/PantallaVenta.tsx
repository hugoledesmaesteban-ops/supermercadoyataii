import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCarritoStore } from "@/store/carritoStore";
import type { LineaCarrito } from "@/store/carritoStore";
import { useSesionStore } from "@/store/sesionStore";
import { confirmarVenta } from "@/services/ventasService";
import {
  suspenderVenta,
  listarVentasSuspendidas,
} from "@/services/ventasSuspendidasService";
import { useAtajosTeclado } from "@/hooks/useAtajosTeclado";
import {
  useAutoguardado,
  leerAutoguardado,
  descartarAutoguardado,
  type VentaInterrumpida,
} from "@/hooks/useAutoguardado";
import { useImpresion, construirTicket } from "@/hooks/useImpresion";
import CampoCodigoBarra from "./components/CampoCodigoBarra";
import Carrito from "./components/Carrito";
import CabeceraPOS from "./components/CabeceraPOS";
import PanelOperaciones from "./components/PanelOperaciones";
import PieAtajos from "./components/PieAtajos";
import PanelCobro from "./components/PanelCobro";
import ModalBalanza from "./components/ModalBalanza";
import ModalConfirmarBorrado from "./components/ModalConfirmarBorrado";
import ModalCancelarVenta from "./components/ModalCancelarVenta";
import ModalBuscarProducto from "./components/ModalBuscarProducto";
import ModalRecuperarVenta from "./components/ModalRecuperarVenta";
import ModalVentaInterrumpida from "./components/ModalVentaInterrumpida";
import ModalErrorImpresion from "./components/ModalErrorImpresion";
import ModalDescuento from "./components/ModalDescuento";
import ModalCambiarPrecio from "./components/ModalCambiarPrecio";
import ModalAutorizacionPin from "./components/ModalAutorizacionPin";
import ModalDevolucion from "./components/ModalDevolucion";
import ModalAlertas from "./components/ModalAlertas";
import type { Producto } from "@/types/producto";
import type { MetodoPago, PagoInput, VentaConfirmada } from "@/types/venta";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
});

const VERSION_CARRITO = 1;

function serializarCarrito(lineas: LineaCarrito[]): string {
  return JSON.stringify({ version: VERSION_CARRITO, lineas });
}

function deserializarCarrito(json: string): LineaCarrito[] {
  const data = JSON.parse(json) as { version: number; lineas: LineaCarrito[] };
  if (data.version !== VERSION_CARRITO || !Array.isArray(data.lineas)) {
    throw new Error("Formato de carrito suspendido desconocido.");
  }
  const sello = Date.now();
  return data.lineas.map((l, i) => ({ ...l, clave: `${l.producto.id}-${sello}-${i}` }));
}

function regenerarClaves(lineas: LineaCarrito[]): LineaCarrito[] {
  const sello = Date.now();
  return lineas.map((l, i) => ({ ...l, clave: `${l.producto.id}-${sello}-${i}` }));
}

interface AutorizacionPendiente {
  titulo: string;
  permiso: string;
  accion: () => void;
}

export default function PantallaVenta() {
  const { usuario, cajaId } = useSesionStore();
  const navigate = useNavigate();
  const {
    lineas,
    subtotal,
    descuentoTotal,
    total,
    aItemsVenta,
    vaciarCarrito,
    reemplazarCarrito,
    claveSeleccionada,
    seleccionarLineaAnterior,
    seleccionarLineaSiguiente,
    incrementarSeleccionada,
    decrementarSeleccionada,
  } = useCarritoStore();

  const { imprimirConReintento } = useImpresion();

  const [productoPesable, setProductoPesable] = useState<Producto | null>(null);
  const [cobrando, setCobrando] = useState(false);
  const [metodoInicial, setMetodoInicial] = useState<MetodoPago | undefined>(undefined);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimaVenta, setUltimaVenta] = useState<VentaConfirmada | null>(null);
  const [mostrarConfirmarBorrado, setMostrarConfirmarBorrado] = useState(false);
  const [mostrarCancelarVenta, setMostrarCancelarVenta] = useState(false);
  const [mostrarBuscador, setMostrarBuscador] = useState(false);
  const [mostrarRecuperarVenta, setMostrarRecuperarVenta] = useState(false);
  const [cantidadSuspendidas, setCantidadSuspendidas] = useState(0);
  const [suspendiendo, setSuspendiendo] = useState(false);
  const [ventaInterrumpida, setVentaInterrumpida] = useState<VentaInterrumpida | null>(null);
  const [chequeoInicialListo, setChequeoInicialListo] = useState(false);

  // Bloque 4: impresión
  const [mostrarErrorImpresion, setMostrarErrorImpresion] = useState(false);
  const [ventaParaReintentar, setVentaParaReintentar] = useState<{
    venta: VentaConfirmada;
    lineas: LineaCarrito[];
    pagos: PagoInput[];
  } | null>(null);

  // Bloque 7: descuento y cambio de precio
  const [mostrarDescuento, setMostrarDescuento] = useState(false);
  const [mostrarCambiarPrecio, setMostrarCambiarPrecio] = useState(false);
  const [autorizacionPendiente, setAutorizacionPendiente] = useState<AutorizacionPendiente | null>(null);

  // Bloque 6: devolución
  const [mostrarDevolucion, setMostrarDevolucion] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Bloque 11: alertas de stock y vencimientos
  const [mostrarAlertas, setMostrarAlertas] = useState(false);

  const hayModalAbierto =
    cobrando ||
    mostrarConfirmarBorrado ||
    mostrarCancelarVenta ||
    mostrarBuscador ||
    mostrarRecuperarVenta ||
    !!productoPesable ||
    !!ventaInterrumpida ||
    mostrarErrorImpresion ||
    mostrarDescuento ||
    mostrarCambiarPrecio ||
    !!autorizacionPendiente ||
    mostrarDevolucion ||
    mostrarAlertas;

  const hayItems = lineas.length > 0;

  useAutoguardado(chequeoInicialListo && !ultimaVenta && !ventaInterrumpida);

  useEffect(() => {
    const guardado = leerAutoguardado();
    if (guardado) setVentaInterrumpida(guardado);
    else setChequeoInicialListo(true);
  }, []);

  function recuperarVentaInterrumpida() {
    if (!ventaInterrumpida) return;
    reemplazarCarrito(regenerarClaves(ventaInterrumpida.lineas));
    setVentaInterrumpida(null);
    setChequeoInicialListo(true);
  }

  function descartarVentaInterrumpida() {
    descartarAutoguardado();
    setVentaInterrumpida(null);
    setChequeoInicialListo(true);
  }

  function abrirCobro(metodo?: MetodoPago) {
    if (!hayItems) return;
    setMetodoInicial(metodo);
    setCobrando(true);
  }

  async function refrescarSuspendidas() {
    if (!cajaId) return;
    try {
      const lista = await listarVentasSuspendidas(cajaId);
      setCantidadSuspendidas(lista.length);
    } catch {
      // silencioso
    }
  }

  useEffect(() => {
    refrescarSuspendidas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajaId]);

  async function manejarSuspender() {
    if (!usuario || !cajaId || !hayItems || suspendiendo) return;
    setSuspendiendo(true);
    setError(null);
    try {
      await suspenderVenta(cajaId, usuario.id, serializarCarrito(lineas));
      vaciarCarrito();
      descartarAutoguardado();
      await refrescarSuspendidas();
    } catch (e) {
      setError(String(e));
    } finally {
      setSuspendiendo(false);
    }
  }

  function manejarRecuperada(carritoJson: string) {
    try {
      const lineasRecuperadas = deserializarCarrito(carritoJson);
      reemplazarCarrito(lineasRecuperadas);
      setMostrarRecuperarVenta(false);
      refrescarSuspendidas();
    } catch (e) {
      setError(String(e));
    }
  }

  useAtajosTeclado({
    activo: !ultimaVenta && !ventaInterrumpida && !mostrarErrorImpresion,
    onBuscar: () => setMostrarBuscador(true),
    onSuspender: () => manejarSuspender(),
    onDevolucion: () => setMostrarDevolucion(true),
    onBorrar: () => {
      if (claveSeleccionada) setMostrarConfirmarBorrado(true);
    },
    onDescuento: () => {
      if (claveSeleccionada) setMostrarDescuento(true);
    },
    onCambiarPrecio: () => {
      if (claveSeleccionada) setMostrarCambiarPrecio(true);
    },
    onCobrar: () => abrirCobro(),
    onEfectivo: () => abrirCobro("EFECTIVO"),
    onTransferencia: () => abrirCobro("TRANSFERENCIA"),
    onQr: () => abrirCobro("QR"),
    onTarjeta: () => abrirCobro("TARJETA"),
    onCancelar: () => {
      if (autorizacionPendiente) setAutorizacionPendiente(null);
      else if (mostrarDescuento) setMostrarDescuento(false);
      else if (mostrarCambiarPrecio) setMostrarCambiarPrecio(false);
      else if (mostrarDevolucion) setMostrarDevolucion(false);
      else if (mostrarAlertas) setMostrarAlertas(false);
      else if (cobrando) setCobrando(false);
      else if (mostrarConfirmarBorrado) setMostrarConfirmarBorrado(false);
      else if (mostrarCancelarVenta) setMostrarCancelarVenta(false);
      else if (mostrarBuscador) setMostrarBuscador(false);
      else if (mostrarRecuperarVenta) setMostrarRecuperarVenta(false);
      else if (productoPesable) setProductoPesable(null);
    },
    onLineaAnterior: () => !hayModalAbierto && seleccionarLineaAnterior(),
    onLineaSiguiente: () => !hayModalAbierto && seleccionarLineaSiguiente(),
    onAumentarCantidad: () => !hayModalAbierto && incrementarSeleccionada(),
    onDisminuirCantidad: () => !hayModalAbierto && decrementarSeleccionada(),
  });

  async function manejarConfirmarPago(pagos: PagoInput[]) {
    if (!usuario || !cajaId) return;
    setConfirmando(true);
    setError(null);
    try {
      const lineasParaTicket = [...lineas];
      const resultado = await confirmarVenta(cajaId, usuario.id, null, aItemsVenta(), pagos);

      let impreso = false;
      try {
        const ticket = await construirTicket(resultado, lineasParaTicket, pagos);
        const huboEfectivo = pagos.some((p) => p.metodo === "EFECTIVO");
        impreso = await imprimirConReintento(ticket, huboEfectivo);
      } catch (e) {
        console.error("Error armando/imprimiendo ticket:", e);
        impreso = false;
      }

      if (!impreso) {
        setVentaParaReintentar({
          venta: resultado,
          lineas: lineasParaTicket,
          pagos,
        });
        setMostrarErrorImpresion(true);
      }

      setUltimaVenta(resultado);
      vaciarCarrito();
      descartarAutoguardado();
      setCobrando(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setConfirmando(false);
    }
  }

  async function reintentarImpresion() {
    if (!ventaParaReintentar) {
      setMostrarErrorImpresion(false);
      return;
    }
    try {
      const ticket = await construirTicket(
        ventaParaReintentar.venta,
        ventaParaReintentar.lineas,
        ventaParaReintentar.pagos,
      );
      const huboEfectivo = ventaParaReintentar.pagos.some((p) => p.metodo === "EFECTIVO");
      const impreso = await imprimirConReintento(ticket, huboEfectivo);
      if (impreso) {
        setMostrarErrorImpresion(false);
        setVentaParaReintentar(null);
      }
    } catch (e) {
      console.warn("Reintento falló:", e);
    }
  }

  function imprimirDespues() {
    setMostrarErrorImpresion(false);
    setVentaParaReintentar(null);
  }

  function solicitarAutorizacionDescuento(accion: () => void) {
    // Sin autorización por PIN: aplica directo (para comercio con 1 dueño).
    accion();
  }

  function solicitarAutorizacionPrecio(accion: () => void) {
    // Sin autorización por PIN: aplica directo (para comercio con 1 dueño).
    accion();
  }

  if (!usuario || !cajaId) {
    navigate("/apertura-caja");
    return null;
  }

  if (ultimaVenta && !mostrarErrorImpresion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light">
        <div className="bg-white rounded-xl shadow p-8 text-center space-y-2">
          <h1 className="text-2xl font-bold text-green-700">VENTA COMPLETADA</h1>
          <p className="text-gray-600">Venta #{ultimaVenta.numero}</p>
          <p className="text-3xl font-bold">{formatoMoneda.format(ultimaVenta.total)}</p>
          {ultimaVenta.vuelto_total > 0 && (
            <p className="text-lg">
              Vuelto: {formatoMoneda.format(ultimaVenta.vuelto_total)}
            </p>
          )}
          <button
            className="btn-pos bg-brand text-white px-8 mt-4"
            onClick={() => setUltimaVenta(null)}
          >
            Nueva venta
          </button>
        </div>
      </div>
    );
  }

  const totalItems = lineas.reduce((acc, l) => acc + l.cantidad, 0);

  return (
    <div className="min-h-screen flex flex-col bg-brand-light">
      {mensajeExito && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl font-semibold">
          ✅ {mensajeExito}
        </div>
      )}

      <CabeceraPOS onAbrirAlertas={() => setMostrarAlertas(true)} />

      <div className="flex-1 flex flex-col gap-2 p-2 min-h-0">
        <div className="flex gap-2 items-stretch">
          <div className="flex-1">
            <CampoCodigoBarra onProductoPesable={setProductoPesable} />
          </div>
          <button
            type="button"
            onClick={() => setMostrarBuscador(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-5 rounded-lg font-semibold flex items-center gap-2 shrink-0"
          >
            🔎 BUSCAR
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">
              F1
            </span>
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-3 min-h-0">
          <div className="bg-white rounded-xl shadow p-3 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                CARRITO DE COMPRA
              </h2>
              <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                {lineas.length} {lineas.length === 1 ? "producto" : "productos"}
              </span>
            </div>

            <Carrito />

            {hayItems && (
              <div className="flex justify-between items-center pt-3 border-t mt-2">
                <span className="text-sm text-slate-500">
                  Total de items:{" "}
                  <span className="font-semibold text-slate-700">{totalItems}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarCancelarVenta(true)}
                  className="text-sm text-red-600 hover:text-red-700 font-semibold flex items-center gap-1.5"
                >
                  Limpiar carrito 🗑️
                </button>
              </div>
            )}
          </div>

          <PanelOperaciones
            total={total()}
            hayItems={hayItems}
            haySeleccion={!!claveSeleccionada}
            cantidadSuspendidas={cantidadSuspendidas}
            onBuscar={() => setMostrarBuscador(true)}
            onCantidad={() => {}}
            onBorrar={() => setMostrarConfirmarBorrado(true)}
            onSuspender={manejarSuspender}
            onRecuperar={() => setMostrarRecuperarVenta(true)}
            onDevolucion={() => setMostrarDevolucion(true)}
            onDescuento={() => claveSeleccionada && setMostrarDescuento(true)}
            onCambiarPrecio={() => claveSeleccionada && setMostrarCambiarPrecio(true)}
            onEfectivo={() => abrirCobro("EFECTIVO")}
            onTransferencia={() => abrirCobro("TRANSFERENCIA")}
            onQr={() => abrirCobro("QR")}
            onTarjeta={() => abrirCobro("TARJETA")}
            onCobrar={() => abrirCobro()}
          />
        </div>

        {error && (
          <p className="text-red-600 text-center font-semibold">{error}</p>
        )}
      </div>

      <PieAtajos />

      {ventaInterrumpida && (
        <ModalVentaInterrumpida
          fecha={ventaInterrumpida.fecha}
          cantidadLineas={ventaInterrumpida.lineas.length}
          cantidadItems={ventaInterrumpida.lineas.reduce(
            (acc, l) => acc + l.cantidad,
            0,
          )}
          total={ventaInterrumpida.lineas.reduce(
            (acc, l) => acc + l.cantidad * l.precioUnitario - l.descuento,
            0,
          )}
          onRecuperar={recuperarVentaInterrumpida}
          onDescartar={descartarVentaInterrumpida}
        />
      )}

      {mostrarErrorImpresion && ventaParaReintentar && (
        <ModalErrorImpresion
          numeroVenta={ventaParaReintentar.venta.numero}
          onReintentar={reintentarImpresion}
          onImprimirDespues={imprimirDespues}
        />
      )}

      {productoPesable && (
        <ModalBalanza
          producto={productoPesable}
          permiteManual
          onCerrar={() => setProductoPesable(null)}
        />
      )}

      {cobrando && (
        <PanelCobro
          subtotal={subtotal()}
          descuento={descuentoTotal()}
          total={total()}
          metodoInicial={metodoInicial}
          confirmando={confirmando}
          onConfirmar={manejarConfirmarPago}
          onCancelar={() => setCobrando(false)}
        />
      )}

      {mostrarConfirmarBorrado && (
        <ModalConfirmarBorrado onCerrar={() => setMostrarConfirmarBorrado(false)} />
      )}

      {mostrarCancelarVenta && (
        <ModalCancelarVenta onCerrar={() => setMostrarCancelarVenta(false)} />
      )}

      {mostrarBuscador && (
        <ModalBuscarProducto
          onCerrar={() => setMostrarBuscador(false)}
          onProductoPesable={setProductoPesable}
        />
      )}

      {mostrarRecuperarVenta && cajaId && (
        <ModalRecuperarVenta
          cajaId={cajaId}
          onCerrar={() => setMostrarRecuperarVenta(false)}
          onRecuperada={manejarRecuperada}
        />
      )}

      {mostrarDescuento && (
        <ModalDescuento
          onCerrar={() => setMostrarDescuento(false)}
          onSolicitarAutorizacion={solicitarAutorizacionDescuento}
        />
      )}

      {mostrarCambiarPrecio && (
        <ModalCambiarPrecio
          onCerrar={() => setMostrarCambiarPrecio(false)}
          onSolicitarAutorizacion={solicitarAutorizacionPrecio}
        />
      )}

      {autorizacionPendiente && (
        <ModalAutorizacionPin
          titulo={autorizacionPendiente.titulo}
          permiso={autorizacionPendiente.permiso}
          onAutorizado={() => {
            const accion = autorizacionPendiente.accion;
            setAutorizacionPendiente(null);
            accion();
          }}
          onCancelar={() => setAutorizacionPendiente(null)}
        />
      )}

      {mostrarDevolucion && (
        <ModalDevolucion
          onCerrar={() => setMostrarDevolucion(false)}
          onRegistrada={(numero) => {
            setMostrarDevolucion(false);
            setMensajeExito(`Devolución ${numero} registrada.`);
            setTimeout(() => setMensajeExito(null), 4000);
          }}
        />
      )}

      {mostrarAlertas && (
        <ModalAlertas
          onCerrar={() => setMostrarAlertas(false)}
          onRefrescarContador={() => {
            // el hook del CabeceraPOS refresca solo cada 60s;
            // si querés forzarlo, acá podés disparar un evento global.
          }}
        />
      )}
    </div>
  );
}