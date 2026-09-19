import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { iniciarSesion, contarUsuarios } from "@/services/usuariosService";
import { useSesionStore } from "@/store/sesionStore";
import logoSuperYatay from "@/assets/logo-super-yatay.png";

export default function PantallaLogin() {
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [hayUsuarios, setHayUsuarios] = useState<boolean | null>(null);

  const setUsuario = useSesionStore((s) => s.setUsuario);
  const navigate = useNavigate();

  useEffect(() => {
    contarUsuarios()
      .then((n) => setHayUsuarios(n > 0))
      .catch(() => setHayUsuarios(true)); // ante la duda, ocultar el link
  }, []);

  async function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const sesion = await iniciarSesion(nombreUsuario, password);
      if (!sesion) {
        setError("Usuario o contraseña incorrectos.");
        return;
      }
      setUsuario(sesion);
      navigate("/apertura-caja");
    } catch {
      setError("No se pudo iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light">
      <form
        onSubmit={manejarSubmit}
        className="bg-white rounded-xl shadow p-8 w-96 space-y-4"
      >
        <div className="flex justify-center mb-4">
          <img
            src={logoSuperYatay}
            alt="SUPER YATAY - Mini Mercado"
            className="w-48 h-auto object-contain"
          />
        </div>
        <input
          value={nombreUsuario}
          onChange={(e) => setNombreUsuario(e.target.value)}
          placeholder="Usuario"
          autoFocus
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
          type="submit"
          disabled={cargando}
          className="btn-pos w-full bg-brand text-white disabled:opacity-50"
        >
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>

        {hayUsuarios === false && (
          <p className="text-center text-sm text-gray-500">
            ¿Primera vez usando el sistema?{" "}
            <Link to="/primer-inicio" className="text-brand underline">
              Configuración inicial
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
