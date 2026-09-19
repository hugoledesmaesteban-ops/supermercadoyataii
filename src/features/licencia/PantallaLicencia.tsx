import { useEffect, useState } from "react";
import { verificarEstadoLicencia, type EstadoLicencia } from "@/services/licenciaService";

export default function PantallaLicencia() {
  const [estado, setEstado] = useState<EstadoLicencia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    verificarEstadoLicencia()
      .then(setEstado)
      .catch((e) => setError(String(e)))
      .finally(() => setVerificando(false));
  }, []);

  const esObjeto = (e: EstadoLicencia | null): e is Exclude<EstadoLicencia, string> =>
    e !== null && typeof e === "object";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-brand">Licencia</h1>

      <div className="bg-white rounded-xl shadow p-4">
        {verificando && <p className="text-gray-400">Verificando…</p>}

        {!verificando && error && (
          <div>
            <p className="text-yellow-700 font-bold">Aviso: no se pudo verificar la licencia</p>
            <p className="text-gray-600 mt-1 text-sm">
              Esto es esperable si todavia no configuraste las variables de Supabase
              (SUPABASE_URL / SUPABASE_ANON_KEY) o no completaste la
              configuracion inicial. Revisa el paso 7 del README de instalacion.
            </p>
          </div>
        )}

        {!verificando && !error && estado === "SinDatos" && (
          <p className="text-yellow-700">
            Sin datos de licencia todavia. Complete la configuracion inicial y conecte Internet
            para la primera verificacion.
          </p>
        )}
        {!verificando && !error && estado === "Vencida" && (
          <p className="text-red-600 font-bold">LICENCIA VENCIDA</p>
        )}
        {!verificando && !error && esObjeto(estado) && "Desactivada" in estado && (
          <div>
            <p className="text-red-600 font-bold">LICENCIA DESACTIVADA</p>
            {estado.Desactivada.mensaje_soporte && (
              <p className="text-gray-600 mt-1">{estado.Desactivada.mensaje_soporte}</p>
            )}
          </div>
        )}
        {!verificando && !error && esObjeto(estado) && "Activa" in estado && (
          <div>
            <p className="text-green-700 font-bold">ACTIVA</p>
            {estado.Activa.dias_restantes !== null && (
              <p className="text-gray-600 mt-1">
                {estado.Activa.dias_restantes} dias restantes de vigencia.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-2">
        <h2 className="font-bold">Soporte remoto (seccion 45)</h2>
        <p className="text-sm text-gray-600">
          Para recibir soporte tecnico remoto, instala RustDesk y comparti el ID y la
          contrasena temporal con soporte. El sistema no controla RustDesk automaticamente ni
          almacena esas credenciales.
        </p>
        <LinkRustDesk />
      </div>
    </div>
  );
}

function LinkRustDesk() {
  const url = "https://rustdesk.com/";
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-brand underline text-sm">
      Descargar RustDesk
    </a>
  );
}