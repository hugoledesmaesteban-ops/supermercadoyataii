import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { abrirCaja, obtenerCajaAbierta } from "@/services/cajaService";
import { useSesionStore } from "@/store/sesionStore";

export default function PantallaAperturaCaja() {
  const { usuario, setCajaId } = useSesionStore();
  const [monto, setMonto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    obtenerCajaAbierta()
      .then((caja) => {
        if (caja) {
          // Sección 27: si ya hay una caja abierta (ej. se cerró la app a
          // mitad de turno), se retoma en vez de forzar una nueva apertura.
          setCajaId(caja.id);
          navigate("/venta");
        }
      })
      .finally(() => setVerificando(false));
  }, []);

  async function manejarApertura() {
    if (!usuario) return;
    const montoNumerico = parseFloat(monto.replace(",", "."));
    if (isNaN(montoNumerico) || montoNumerico < 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    try {
      const cajaId = await abrirCaja(usuario.id, montoNumerico);
      setCajaId(cajaId);
      navigate("/venta");
    } catch (e) {
      setError(String(e));
    }
  }

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light text-gray-400">
        Verificando caja…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light">
      <div className="bg-white rounded-xl shadow p-8 w-96 space-y-4 text-center">
        <h1 className="text-xl font-bold text-brand">APERTURA DE CAJA</h1>
        <p className="text-gray-500">{usuario?.nombre_completo}</p>
        <input
          autoFocus
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="Monto inicial en efectivo"
          className="w-full h-[60px] text-center text-xl border-2 border-brand rounded-lg"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button onClick={manejarApertura} className="btn-pos w-full bg-brand text-white">
          Abrir caja
        </button>
      </div>
    </div>
  );
}
