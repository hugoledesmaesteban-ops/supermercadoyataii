import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { guardarDatosComercio } from "@/services/configuracionService";
import { contarUsuarios, inicializarSistema } from "@/services/usuariosService";

export default function PantallaPrimerInicio() {
  const [paso, setPaso] = useState(1);
  const [nombreComercio, setNombreComercio] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    contarUsuarios()
      .then((n) => {
        if (n > 0) {
          navigate("/login", { replace: true });
        } else {
          setVerificando(false);
        }
      })
      .catch(() => {
        navigate("/login", { replace: true });
      });
  }, [navigate]);

  async function finalizar() {
    setError(null);
    try {
      await guardarDatosComercio({
        nombre: nombreComercio,
        direccion: "",
        localidad: "Goya",
        provincia: "Corrientes",
        telefono: "",
        cuit: "",
        email: "",
        mensajeFinal: "GRACIAS POR SU COMPRA",
      });
      await inicializarSistema(nombreUsuario, nombreCompleto, password);
      navigate("/login", { replace: true });
    } catch (e) {
      setError(String(e));
    }
  }

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light text-slate-400">
        Verificando estado del sistema…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light">
      <div className="bg-white rounded-xl shadow p-8 w-[420px] space-y-4">
        <h1 className="text-xl font-bold text-brand text-center">CONFIGURACIÓN INICIAL</h1>

        {paso === 1 && (
          <>
            <p className="text-sm text-gray-500">Paso 1 de 2: datos del comercio</p>
            <input
              autoFocus
              value={nombreComercio}
              onChange={(e) => setNombreComercio(e.target.value)}
              placeholder="Nombre del comercio"
              className="w-full h-12 px-3 border rounded-lg"
            />
            <button
              disabled={!nombreComercio.trim()}
              onClick={() => setPaso(2)}
              className="btn-pos w-full bg-brand text-white disabled:opacity-40"
            >
              Siguiente
            </button>
          </>
        )}

        {paso === 2 && (
          <>
            <p className="text-sm text-gray-500">Paso 2 de 2: crear administrador</p>
            <input
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              placeholder="Usuario"
              className="w-full h-12 px-3 border rounded-lg"
            />
            <input
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              placeholder="Nombre completo"
              className="w-full h-12 px-3 border rounded-lg"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full h-12 px-3 border rounded-lg"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              disabled={!nombreUsuario.trim() || !password}
              onClick={finalizar}
              className="btn-pos w-full bg-brand text-white disabled:opacity-40"
            >
              Finalizar configuración
            </button>
          </>
        )}
      </div>
    </div>
  );
}
