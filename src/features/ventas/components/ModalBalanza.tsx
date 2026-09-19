import { useState } from "react";
import type { Producto } from "@/types/producto";
import { useCarritoStore } from "@/store/carritoStore";

interface Props {
  producto: Producto;
  permiteManual: boolean; // sección 9: peso manual solo para usuarios autorizados
  onCerrar: () => void;
}

/**
 * Sección 8-9 del prompt. Esta versión de la Fase 4 deja la UI y el flujo
 * completos (incluido el registro de `origen_peso`), pero la lectura real
 * de la balanza Kretz Report LT llega en la Fase 9 vía `ScaleService`
 * (el adaptador todavía no tiene protocolo confirmado — sección 68).
 * Por ahora, mientras no exista esa integración, solo está disponible el
 * ingreso manual para no bloquear el resto del flujo de venta.
 */
export default function ModalBalanza({ producto, permiteManual, onCerrar }: Props) {
  const [pesoManual, setPesoManual] = useState("");
  const agregarPesable = useCarritoStore((s) => s.agregarPesable);

  function confirmarPesoManual() {
    const kg = parseFloat(pesoManual.replace(",", "."));
    if (isNaN(kg) || kg <= 0 || kg > 15) return; // 15kg: capacidad máxima de la Kretz
    agregarPesable(producto, kg, "MANUAL");
    onCerrar();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 text-center space-y-4">
        <h2 className="text-lg font-bold text-brand">BALANZA</h2>
        <p className="text-gray-600">{producto.nombre}</p>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-gray-400">
          NO SE PUDO LEER LA BALANZA
          <p className="text-xs mt-1">
            (Integración con Kretz Report LT pendiente — Fase 9)
          </p>
        </div>

        {permiteManual ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={pesoManual}
              onChange={(e) => setPesoManual(e.target.value)}
              placeholder="Peso manual (kg)"
              className="w-full h-[60px] text-center text-xl border-2 border-brand rounded-lg"
            />
            <button
              onClick={confirmarPesoManual}
              className="btn-pos w-full bg-brand text-white"
            >
              Confirmar peso manual
            </button>
          </div>
        ) : (
          <p className="text-sm text-red-600">
            El peso manual requiere autorización de un usuario habilitado.
          </p>
        )}

        <button onClick={onCerrar} className="btn-pos w-full bg-gray-200 text-gray-700">
          Cancelar
        </button>
      </div>
    </div>
  );
}
