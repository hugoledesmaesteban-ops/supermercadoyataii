import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { calcularResumenCierre, cerrarCaja, type ResumenCierre } from "@/services/cajaService";
import { useSesionStore } from "@/store/sesionStore";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
});

/** Sección 28: Cierre Z. Muestra el resumen calculado antes de confirmar. */
export default function PantallaCierreCaja() {
  const { usuario, cajaId, cerrarSesion } = useSesionStore();
  const [resumen, setResumen] = useState<ResumenCierre | null>(null);
  const [efectivoDeclarado, setEfectivoDeclarado] = useState("");
  const [confirmado, setConfirmado] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (cajaId) calcularResumenCierre(cajaId).then(setResumen);
  }, [cajaId]);

  async function manejarCierre() {
    if (!usuario || !cajaId) return;
    const declarado = parseFloat(efectivoDeclarado.replace(",", ".")) || 0;
    const diferencia = await cerrarCaja(cajaId, usuario.id, declarado);
    setConfirmado(diferencia);
  }

  if (confirmado !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light">
        <div className="bg-white rounded-xl shadow p-8 text-center space-y-2">
          <h1 className="text-2xl font-bold text-brand">CIERRE CONFIRMADO</h1>
          <p className={confirmado === 0 ? "text-green-700" : "text-red-600"}>
            Diferencia: {formatoMoneda.format(confirmado)}
          </p>
          <button
            className="btn-pos bg-brand text-white px-8 mt-4"
            onClick={() => {
              cerrarSesion();
              navigate("/login");
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (!resumen) {
    return <div className="min-h-screen flex items-center justify-center">Calculando…</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light">
      <div className="bg-white rounded-xl shadow p-8 w-[420px] space-y-2">
        <h1 className="text-xl font-bold text-brand text-center mb-2">CIERRE Z</h1>
        <Fila label="Cantidad de tickets" valor={resumen.cantidad_tickets} />
        <Fila label="Efectivo" valor={formatoMoneda.format(resumen.efectivo)} />
        <Fila label="Transferencia" valor={formatoMoneda.format(resumen.transferencia)} />
        <Fila label="Tarjeta" valor={formatoMoneda.format(resumen.tarjeta)} />
        <Fila label="QR" valor={formatoMoneda.format(resumen.qr)} />
        <Fila label="Otros" valor={formatoMoneda.format(resumen.otros)} />
        <Fila label="Retiros" valor={formatoMoneda.format(resumen.retiros)} />
        <Fila label="Ingresos" valor={formatoMoneda.format(resumen.ingresos)} />
        <hr />
        <Fila
          label="EFECTIVO ESPERADO"
          valor={formatoMoneda.format(resumen.efectivo_esperado)}
          destacado
        />

        <input
          value={efectivoDeclarado}
          onChange={(e) => setEfectivoDeclarado(e.target.value)}
          placeholder="Efectivo real contado"
          className="w-full h-12 px-3 border rounded-lg mt-2"
        />

        <button onClick={manejarCierre} className="btn-pos w-full bg-brand text-white mt-2">
          Confirmar cierre
        </button>
      </div>
    </div>
  );
}

function Fila({ label, valor, destacado }: { label: string; valor: string | number; destacado?: boolean }) {
  return (
    <div className={`flex justify-between ${destacado ? "font-bold text-lg" : "text-gray-600"}`}>
      <span>{label}</span>
      <span>{valor}</span>
    </div>
  );
}
