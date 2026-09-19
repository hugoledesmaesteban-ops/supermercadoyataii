import { useEffect, useState } from "react";
import {
  abrirCajonEthernet,
  detectarPuertosBalanza,
  estadoImpresoraEthernet,
  guardarDatosComercio,
  obtenerDatosComercio,
  probarImpresoraEthernet,
  type DatosComercio,
  type EstadoImpresora,
} from "@/services/configuracionService";
import {
  guardarConfigMercadoPago,
  obtenerConfigMercadoPago,
  type ConfigMercadoPagoPublica,
} from "@/services/mercadopagoService";
import {
  leerModoImpresora,
  guardarModoImpresora,
  leerNombreImpresoraUsb,
  guardarNombreImpresoraUsb,
  probarImpresoraUsb,
  abrirCajonUsb,
  type ModoImpresora,
} from "@/services/impresionService";
import SeccionUsuarios from "./components/SeccionUsuarios";
import SeccionAcercaDe from "./components/SeccionAcercaDe";
import SeccionLicencia from "./components/SeccionLicencia";

const COMERCIO_VACIO: DatosComercio = {
  nombre: "",
  direccion: "",
  localidad: "Goya",
  provincia: "Corrientes",
  telefono: "",
  cuit: "",
  email: "",
  mensajeFinal: "GRACIAS POR SU COMPRA",
};

export default function PantallaConfiguracion() {
  const [comercio, setComercio] = useState<DatosComercio>(COMERCIO_VACIO);
  const [guardado, setGuardado] = useState(false);

  // Impresora
  const [modoImpresora, setModoImpresora] = useState<ModoImpresora>("ethernet");
  const [ip, setIp] = useState("192.168.0.100");
  const [puerto, setPuerto] = useState("9100");
  const [nombreUsb, setNombreUsb] = useState("Xprinter XP-80");
  const [estado, setEstado] = useState<EstadoImpresora | null>(null);
  const [mensajeHardware, setMensajeHardware] = useState<string | null>(null);
  const [puertosBalanza, setPuertosBalanza] = useState<string[]>([]);

  // Mercado Pago
  const [mpConfig, setMpConfig] = useState<ConfigMercadoPagoPublica | null>(null);
  const [mpUserId, setMpUserId] = useState("");
  const [mpPosId, setMpPosId] = useState("");
  const [mpAlias, setMpAlias] = useState("");
  const [mpToken, setMpToken] = useState("");
  const [mpMensaje, setMpMensaje] = useState<string | null>(null);
  const [mpGuardando, setMpGuardando] = useState(false);

  useEffect(() => {
    obtenerDatosComercio().then((d) => d && setComercio(d));
    obtenerConfigMercadoPago().then((c) => {
      setMpConfig(c);
      setMpUserId(c.user_id);
      setMpPosId(c.external_pos_id);
      setMpAlias(c.alias);
    });
    leerModoImpresora().then(setModoImpresora);
    leerNombreImpresoraUsb().then((n) => n && setNombreUsb(n));
  }, []);

  async function manejarGuardarComercio() {
    await guardarDatosComercio(comercio);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  async function manejarCambiarModo(nuevo: ModoImpresora) {
    setModoImpresora(nuevo);
    await guardarModoImpresora(nuevo);
    setEstado(null);
    setMensajeHardware(null);
  }

  async function manejarGuardarNombreUsb() {
    if (!nombreUsb.trim()) return;
    await guardarNombreImpresoraUsb(nombreUsb.trim());
    setMensajeHardware("Nombre de impresora USB guardado.");
  }

  async function manejarProbarEthernet() {
    setMensajeHardware(null);
    setEstado(await estadoImpresoraEthernet(ip, parseInt(puerto)));
  }

  async function manejarImprimirPruebaEthernet() {
    setMensajeHardware(null);
    try {
      await probarImpresoraEthernet(ip, parseInt(puerto));
      setMensajeHardware("Prueba de impresión enviada.");
    } catch (e) {
      setMensajeHardware(String(e));
    }
  }

  async function manejarAbrirCajonEthernet() {
    setMensajeHardware(null);
    try {
      await abrirCajonEthernet(ip, parseInt(puerto));
      setMensajeHardware("Pulso de apertura enviado al cajón.");
    } catch (e) {
      setMensajeHardware(String(e));
    }
  }

  async function manejarProbarUsb() {
    setMensajeHardware(null);
    if (!nombreUsb.trim()) {
      setMensajeHardware("Escribí el nombre de la impresora USB.");
      return;
    }
    try {
      await guardarNombreImpresoraUsb(nombreUsb.trim());
      await probarImpresoraUsb(nombreUsb.trim());
      setMensajeHardware("Prueba de impresión enviada por USB.");
    } catch (e) {
      setMensajeHardware(String(e));
    }
  }

  async function manejarAbrirCajonUsb() {
    setMensajeHardware(null);
    if (!nombreUsb.trim()) {
      setMensajeHardware("Escribí el nombre de la impresora USB.");
      return;
    }
    try {
      await guardarNombreImpresoraUsb(nombreUsb.trim());
      await abrirCajonUsb(nombreUsb.trim());
      setMensajeHardware("Pulso de apertura enviado al cajón.");
    } catch (e) {
      setMensajeHardware(String(e));
    }
  }

  async function manejarDetectarBalanza() {
    setPuertosBalanza(await detectarPuertosBalanza());
  }

  async function manejarGuardarMp() {
    setMpMensaje(null);
    if (!mpUserId.trim() || !mpPosId.trim() || (!mpConfig?.configurado && !mpToken.trim())) {
      setMpMensaje("Completá User ID, POS ID y Access Token.");
      return;
    }
    setMpGuardando(true);
    try {
      await guardarConfigMercadoPago(
        mpUserId.trim(),
        mpPosId.trim(),
        mpAlias.trim(),
        mpToken.trim() || "SIN_CAMBIOS",
      );
      setMpMensaje("Configuración guardada.");
      setMpToken("");
      const c = await obtenerConfigMercadoPago();
      setMpConfig(c);
    } catch (e) {
      setMpMensaje(`Error: ${String(e)}`);
    } finally {
      setMpGuardando(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-brand">Configuración</h1>

      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-bold">Comercio</h2>
        <div className="grid grid-cols-2 gap-3">
          <input className="h-11 px-3 border rounded-lg" placeholder="Nombre"
            value={comercio.nombre} onChange={(e) => setComercio({ ...comercio, nombre: e.target.value })} />
          <input className="h-11 px-3 border rounded-lg" placeholder="CUIT"
            value={comercio.cuit} onChange={(e) => setComercio({ ...comercio, cuit: e.target.value })} />
          <input className="h-11 px-3 border rounded-lg" placeholder="Dirección"
            value={comercio.direccion} onChange={(e) => setComercio({ ...comercio, direccion: e.target.value })} />
          <input className="h-11 px-3 border rounded-lg" placeholder="Teléfono"
            value={comercio.telefono} onChange={(e) => setComercio({ ...comercio, telefono: e.target.value })} />
          <input className="h-11 px-3 border rounded-lg" placeholder="Localidad"
            value={comercio.localidad} onChange={(e) => setComercio({ ...comercio, localidad: e.target.value })} />
          <input className="h-11 px-3 border rounded-lg" placeholder="Provincia"
            value={comercio.provincia} onChange={(e) => setComercio({ ...comercio, provincia: e.target.value })} />
        </div>
        <input className="w-full h-11 px-3 border rounded-lg" placeholder="Mensaje final del ticket"
          value={comercio.mensajeFinal} onChange={(e) => setComercio({ ...comercio, mensajeFinal: e.target.value })} />
        <button onClick={manejarGuardarComercio} className="btn-pos bg-brand text-white px-6">
          {guardado ? "Guardado" : "Guardar"}
        </button>
      </section>

      <section className="bg-white rounded-xl shadow p-4 space-y-4">
        <h2 className="font-bold">Impresora de tickets / Cajón</h2>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => manejarCambiarModo("ethernet")}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm ${
              modoImpresora === "ethernet"
                ? "bg-brand text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            🌐 Por red (Ethernet)
          </button>
          <button
            type="button"
            onClick={() => manejarCambiarModo("usb")}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm ${
              modoImpresora === "usb"
                ? "bg-brand text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            🔌 Por USB
          </button>
        </div>

        {modoImpresora === "ethernet" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input className="h-11 px-3 border rounded-lg flex-1" placeholder="IP" value={ip} onChange={(e) => setIp(e.target.value)} />
              <input className="h-11 px-3 border rounded-lg w-28" placeholder="Puerto" value={puerto} onChange={(e) => setPuerto(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={manejarProbarEthernet} className="btn-pos bg-gray-100 px-4 h-11">Ver estado</button>
              <button onClick={manejarImprimirPruebaEthernet} className="btn-pos bg-gray-100 px-4 h-11">Imprimir prueba</button>
              <button onClick={manejarAbrirCajonEthernet} className="btn-pos bg-gray-100 px-4 h-11">Abrir cajón</button>
            </div>
            {estado && (
              <p className="text-sm">Estado: {typeof estado === "string" ? estado : `Error: ${estado.Error}`}</p>
            )}
          </div>
        )}

        {modoImpresora === "usb" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre de la impresora en Windows
              </label>
              <input
                className="w-full h-11 px-3 border rounded-lg"
                placeholder="Xprinter XP-80"
                value={nombreUsb}
                onChange={(e) => setNombreUsb(e.target.value)}
                onBlur={manejarGuardarNombreUsb}
              />
              <p className="text-xs text-slate-500 mt-1">
                Tal cual aparece en <b>Impresoras y escáneres</b>. Ej: <code>Xprinter XP-80</code>.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={manejarProbarUsb} className="btn-pos bg-gray-100 px-4 h-11">Imprimir prueba</button>
              <button onClick={manejarAbrirCajonUsb} className="btn-pos bg-gray-100 px-4 h-11">Abrir cajón</button>
            </div>
          </div>
        )}

        {mensajeHardware && <p className="text-sm">{mensajeHardware}</p>}
      </section>

      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-bold">Balanza Kretz Report LT</h2>
        <button onClick={manejarDetectarBalanza} className="btn-pos bg-gray-100 px-4 h-11">
          Detectar puertos
        </button>
        {puertosBalanza.length > 0 ? (
          <ul className="text-sm text-gray-600">
            {puertosBalanza.map((p) => <li key={p}>{p}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">
            La lectura de peso todavía no está disponible: falta el protocolo oficial del fabricante.
          </p>
        )}
      </section>

      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <span>📱</span> Mercado Pago (Pago QR)
          </h2>
          {mpConfig?.configurado && (
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-1 rounded">
              Configurado
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          El Access Token se cifra antes de guardarse (AES-256-GCM). Nunca se muestra de vuelta.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">User ID</label>
            <input className="w-full h-11 px-3 border rounded-lg" placeholder="ej: 123456789"
              value={mpUserId} onChange={(e) => setMpUserId(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">POS ID (external)</label>
            <input className="w-full h-11 px-3 border rounded-lg" placeholder="ej: CAJA01"
              value={mpPosId} onChange={(e) => setMpPosId(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Alias (transferencias)</label>
            <input className="w-full h-11 px-3 border rounded-lg" placeholder="ej: super.yatay"
              value={mpAlias} onChange={(e) => setMpAlias(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Access Token {mpConfig?.configurado && "(dejar vacío para no cambiar)"}
            </label>
            <input type="password" className="w-full h-11 px-3 border rounded-lg font-mono text-xs"
              placeholder="APP_USR-..." value={mpToken} onChange={(e) => setMpToken(e.target.value)} autoComplete="off" />
          </div>
        </div>
        <button onClick={manejarGuardarMp} disabled={mpGuardando}
          className="btn-pos bg-brand text-white px-6 disabled:opacity-50">
          {mpGuardando ? "Guardando…" : "Guardar Mercado Pago"}
        </button>
        {mpMensaje && <p className="text-sm">{mpMensaje}</p>}
      </section>

      <SeccionLicencia />
      <SeccionUsuarios />
      <SeccionAcercaDe />
    </div>
  );
}
