import { useEffect, useState } from "react";
import {
  cambiarPasswordUsuario,
  crearUsuario,
  listarRoles,
  listarUsuarios,
  toggleActivoUsuario,
  type Rol,
  type UsuarioListado,
} from "@/services/usuariosService";
import { useSesionStore } from "@/store/sesionStore";

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
});

const USUARIO_SOPORTE = "hlsistemas";

const ROLES_PERMITIDOS = [
  { nombre_db: "GERENTE", etiqueta: "Dueno" },
  { nombre_db: "CAJERO", etiqueta: "Cajero" },
];

const ETIQUETA_ROL: Record<string, { label: string; color: string }> = {
  ADMINISTRADOR: { label: "Developer", color: "bg-purple-100 text-purple-800" },
  GERENTE: { label: "Dueno", color: "bg-blue-100 text-blue-800" },
  CAJERO: { label: "Cajero", color: "bg-emerald-100 text-emerald-800" },
};

export default function SeccionUsuarios() {
  const usuarioActual = useSesionStore((s) => s.usuario);

  const [usuarios, setUsuarios] = useState<UsuarioListado[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({
    nombre_usuario: "",
    nombre_completo: "",
    password: "",
    rol_id: 0,
  });
  const [guardando, setGuardando] = useState(false);

  const [cambioPass, setCambioPass] = useState<UsuarioListado | null>(null);
  const [nuevaPass, setNuevaPass] = useState("");

  const esDeveloper = usuarioActual?.nombre_usuario === USUARIO_SOPORTE;

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [u, r] = await Promise.all([listarUsuarios(), listarRoles()]);
      const visibles = esDeveloper
        ? u
        : u.filter((x) => x.nombre_usuario !== USUARIO_SOPORTE);
      setUsuarios(visibles);
      setRoles(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esDeveloper]);

  async function manejarCrear() {
    if (!form.nombre_usuario.trim() || !form.nombre_completo.trim() || !form.password.trim() || !form.rol_id) {
      setError("Completa todos los campos.");
      return;
    }
    if (form.nombre_usuario.trim().toLowerCase() === USUARIO_SOPORTE) {
      setError("Ese nombre de usuario esta reservado.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await crearUsuario(form.nombre_usuario.trim(), form.nombre_completo.trim(), form.password, form.rol_id);
      setForm({ nombre_usuario: "", nombre_completo: "", password: "", rol_id: 0 });
      setMostrarForm(false);
      setMensaje("Usuario creado.");
      setTimeout(() => setMensaje(null), 3000);
      cargar();
    } catch (e) {
      setError(String(e));
    } finally {
      setGuardando(false);
    }
  }

  async function manejarToggle(u: UsuarioListado) {
    if (!usuarioActual) return;
    if (u.id === usuarioActual.id) {
      alert("No podes desactivar tu propio usuario.");
      return;
    }
    try {
      await toggleActivoUsuario(u.id, !u.activo, usuarioActual.id);
      cargar();
    } catch (e) {
      alert(String(e));
    }
  }

  async function manejarCambiarPass() {
    if (!cambioPass || !usuarioActual || !nuevaPass.trim()) return;
    try {
      await cambiarPasswordUsuario(cambioPass.id, nuevaPass, usuarioActual.id);
      setCambioPass(null);
      setNuevaPass("");
      setMensaje("Contrasena cambiada.");
      setTimeout(() => setMensaje(null), 3000);
    } catch (e) {
      alert(String(e));
    }
  }

  return (
    <section className="bg-white rounded-xl shadow p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Usuarios del sistema</h2>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          {mostrarForm ? "Cerrar" : "+ Nuevo usuario"}
        </button>
      </div>

      {mostrarForm && (
        <div className="bg-slate-50 rounded-lg p-3 space-y-3 border border-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre de usuario (login)</label>
              <input className="w-full h-11 px-3 border rounded-lg" value={form.nombre_usuario}
                onChange={(e) => setForm({ ...form, nombre_usuario: e.target.value })}
                placeholder="ej: cajera1" autoComplete="off" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre completo</label>
              <input className="w-full h-11 px-3 border rounded-lg" value={form.nombre_completo}
                onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                placeholder="ej: Maria Perez" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contrasena</label>
              <input type="password" className="w-full h-11 px-3 border rounded-lg" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Rol</label>
              <select className="w-full h-11 px-3 border rounded-lg" value={form.rol_id}
                onChange={(e) => setForm({ ...form, rol_id: parseInt(e.target.value, 10) })}>
                <option value={0}>- Elegir rol -</option>
                {ROLES_PERMITIDOS.map((permitido) => {
                  const rol = roles.find((r) => r.nombre === permitido.nombre_db);
                  if (!rol) return null;
                  return (
                    <option key={rol.id} value={rol.id}>{permitido.etiqueta}</option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={manejarCrear} disabled={guardando}
              className="bg-brand hover:bg-brand-dark text-white font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50">
              {guardando ? "Guardando..." : "Crear usuario"}
            </button>
          </div>
        </div>
      )}

      {mensaje && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold px-3 py-2 rounded-lg">
          {mensaje}
        </div>
      )}

      {cargando && <p className="text-center text-slate-400 py-4">Cargando...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!cargando && !error && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Usuario</th>
                <th className="text-left px-3 py-2 font-semibold">Rol</th>
                <th className="text-left px-3 py-2 font-semibold">Ultimo login</th>
                <th className="text-center px-3 py-2 font-semibold">Estado</th>
                <th className="text-right px-3 py-2 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const et = ETIQUETA_ROL[u.rol] ?? { label: u.rol, color: "bg-slate-100 text-slate-700" };
                const esSoporte = u.nombre_usuario === USUARIO_SOPORTE;
                const puedeEditar = !esSoporte || esDeveloper;
                return (
                  <tr key={u.id} className={`border-b ${!u.activo ? "opacity-50" : ""}`}>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{u.nombre_completo}</p>
                      <p className="text-xs text-slate-500">{u.nombre_usuario}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${et.color}`}>
                        {et.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {u.ultimo_login ? formatoFecha.format(new Date(u.ultimo_login)) : "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {u.activo ? (
                        <span className="text-xs font-semibold text-emerald-700">Activo</span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500">Inactivo</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        {puedeEditar ? (
                          <>
                            <button onClick={() => { setCambioPass(u); setNuevaPass(""); }} title="Cambiar contrasena"
                              className="px-2 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">Cambiar</button>
                            <button onClick={() => manejarToggle(u)} title={u.activo ? "Desactivar" : "Reactivar"}
                              className={`px-2 h-8 rounded text-xs ${u.activo ? "bg-red-100 hover:bg-red-500 text-red-600 hover:text-white" : "bg-emerald-100 hover:bg-emerald-500 text-emerald-700 hover:text-white"}`}>
                              {u.activo ? "Desactivar" : "Reactivar"}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 px-2">Protegido</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {cambioPass && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-slate-800 text-white p-4 flex items-center gap-3">
              <span className="text-2xl">Clave</span>
              <div>
                <h2 className="text-base font-black">CAMBIAR CONTRASENA</h2>
                <p className="text-xs opacity-80">{cambioPass.nombre_completo}</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <input type="password" value={nuevaPass} onChange={(e) => setNuevaPass(e.target.value)}
                autoFocus placeholder="Nueva contrasena"
                className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg focus:border-slate-800 outline-none" />
              <div className="flex gap-2 pt-2 border-t">
                <button onClick={() => setCambioPass(null)} className="flex-1 bg-slate-200 hover:bg-slate-300 font-semibold py-3 rounded-lg">CANCELAR</button>
                <button onClick={manejarCambiarPass} disabled={!nuevaPass.trim()}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg disabled:opacity-40">GUARDAR</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
