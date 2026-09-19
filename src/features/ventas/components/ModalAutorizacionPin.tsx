import { useEffect, useRef, useState } from "react";
import { verificarAutorizacion } from "@/services/usuariosService";

interface Props {
  titulo: string;
  permiso: string;
  onAutorizado: () => void;
  onCancelar: () => void;
}

export default function ModalAutorizacionPin({
  titulo,
  permiso,
  onAutorizado,
  onCancelar,
}: Props) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usuarioRef = useRef<HTMLInputElement>(null);

  useEffect(() => { usuarioRef.current?.focus(); }, []);

  async function verificar() {
    if (!usuario.trim() || !password) {
      setError("Completá usuario y contraseña.");
      return;
    }
    setVerificando(true);
    setError(null);
    try {
      const ok = await verificarAutorizacion(usuario.trim(), password, permiso);
      if (ok) {
        onAutorizado();
      } else {
        setError("Usuario o contraseña incorrectos, o sin permiso.");
        setPassword("");
      }
    } catch {
      setError("No se pudo verificar. Intentá de nuevo.");
    } finally {
      setVerificando(false);
    }
  }

  function manejarTecla(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancelar();
    if (e.key === "Enter") verificar();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-amber-400 text-slate-900 p-4 flex items-center gap-3">
          <span className="text-2xl">🔐</span>
          <div>
            <h2 className="text-base font-black leading-tight">AUTORIZACIÓN</h2>
            <p className="text-xs opacity-80">{titulo}</p>
          </div>
        </div>
        <div className="p-5 space-y-3" onKeyDown={manejarTecla}>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Usuario encargado
            </label>
            <input
              ref={usuarioRef}
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="usuario"
              autoComplete="off"
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg focus:border-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="contraseña"
              autoComplete="off"
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg focus:border-amber-500 outline-none"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm font-semibold text-center">🔴 {error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancelar}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 rounded-lg"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={verificar}
              disabled={verificando}
              className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              {verificando ? "Verificando…" : "AUTORIZAR"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}