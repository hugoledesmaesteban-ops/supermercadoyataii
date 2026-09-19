import logoHlSistemas from "@/assets/logo-hl-sistemas.png";

const VERSION = "2.4.1";

export default function SeccionAcercaDe() {
  return (
    <section className="bg-white rounded-xl shadow p-4 space-y-3">
      <h2 className="font-bold flex items-center gap-2">
        <span>ℹ️</span> Acerca de
      </h2>

      <div className="flex flex-col md:flex-row items-center gap-6 py-3">
        <img
          src={logoHlSistemas}
          alt="HL Sistemas"
          className="w-56 max-w-full h-auto object-contain"
        />

        <div className="flex-1 space-y-2 text-sm">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
              Software
            </p>
            <p className="text-lg font-bold text-brand">
              Mini Mercado POS
            </p>
            <p className="text-slate-600">Versión {VERSION}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
              Desarrollado por
            </p>
            <p className="font-semibold text-slate-800">HL Sistemas</p>
            <p className="text-slate-600">Soluciones de Software Innovadoras</p>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
              Contacto / Soporte
            </p>
            <p className="font-semibold text-slate-800">
              📞 3777 391898
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500">
        Este software es propiedad de HL Sistemas. Queda prohibida su
        reproducción, distribución o modificación sin autorización.
        <br />
        © 2026 HL Sistemas. Todos los derechos reservados.
      </div>
    </section>
  );
}
