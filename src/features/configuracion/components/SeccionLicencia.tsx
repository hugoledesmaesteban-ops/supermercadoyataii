import { useEffect, useState } from "react";
import {
  estadoLicenciaSimple,
  activarLicencia30Dias,
  type EstadoLicenciaSimple,
} from "@/services/licenciaSimpleService";
import { useSesionStore } from "@/store/sesionStore";

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const USUARIO_SOPORTE = "hlsistemas";

export default function SeccionLicencia() {
  const usuario = useSesionStore((s) => s.usuario);
  const [estado, setEstado] = useState<EstadoLicenciaSimple | null>(null);
  const [cargando, setCargando] = useState(true);
  const [activando, setActivando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Si el usuario NO es el Developer, no mostramos nada (ni el título).
  const esDeveloper = usuario?.nombre_usuario === USUARIO_SOPORTE;

  useEffect(() => {
    if (!esDeveloper) return;
    estadoLicenciaSimple()
      .then(setEstado)
      .catch(() => setEstado(null))
      .finally(() => setCargando(false));
  }, [esDeveloper]);

  // Si no es Developer, no renderiza NADA. El dueño no ve esta sección.
  if (!esDeveloper) return null;

  async function manejarActivar() {
    if (!usuario) return;
    setActivando(true);
    setMensaje(null);
    try {
      const nuevaFecha = await activarLicencia30Dias(usuario.nombre_usuario);
      setMensaje(`✅ Licencia extendida hasta ${formatoFecha.format(new Date(nuevaFecha))}`);
      const nuevo = await estadoLicenciaSimple();
      setEstado(nuevo);
    } catch (e) {
      setMensaje(`🔴 ${String(e)}`);
    } finally {
      setActivando(false);
    }
  }

  if (cargando) {
    return (
      <section className="bg-white rounded-xl shadow p-4">
        <p className="text-slate-400 text-center py-4">Cargando licencia…</p>
      </section>
    );
  }

  if (!estado) return null;

  const vencida = !estado.activa;
  const porVencer = estado.por_vencer && estado.activa;

  const color = vencida
    ? "border-red-400 bg-red-50"
    : porVencer
    ? "border-amber-400 bg-amber-50"
    : "border-emerald-400 bg-emerald-50";

  const icono = vencida ? "🔴" : porVencer ? "⚠️" : "✅";
  const etiqueta = vencida
    ? "LICENCIA VENCIDA"
    : porVencer
    ? "LICENCIA POR VENCER"
    : "LICENCIA ACTIVA";

  return (
    <section className={`border-2 ${color} rounded-xl p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2 text-slate-800">
          <span>📋</span> Licencia (Panel HL Sistemas)
        </h2>
        <span className="text-xs font-bold px-2 py-1 rounded bg-white">
          {icono} {etiqueta}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border">
          <p className="text-xs text-slate-500 font-semibold uppercase">Vence</p>
          <p className="text-lg font-bold text-slate-800">
            {formatoFecha.format(new Date(estado.vence_en))}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <p className="text-xs text-slate-500 font-semibold uppercase">Días restantes</p>
          <p
            className={`text-lg font-bold ${
              vencida ? "text-red-600" : porVencer ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {vencida ? "Vencida" : estado.dias_restantes}
          </p>
        </div>
      </div>

      <div className="text-xs text-slate-500 text-center">
        Soporte: <b>HL Sistemas</b> · 📞 3777 391898
      </div>

      <div className="border-t pt-3 space-y-2">
        <p className="text-xs text-slate-500 text-center">
          Acciones de HL Sistemas (solo visibles para el desarrollador)
        </p>
        <button
          onClick={manejarActivar}
          disabled={activando}
          className="w-full py-3 rounded-lg bg-brand hover:bg-brand-dark text-white font-bold disabled:opacity-50"
        >
          {activando ? "Activando…" : "🔓 ACTIVAR 30 DÍAS MÁS"}
        </button>
      </div>

      {mensaje && <p className="text-sm text-center font-semibold">{mensaje}</p>}
    </section>
  );
}
