import { useCallback, useEffect, useState } from "react";
import { contarAlertasStock, type ContadorAlertas } from "@/services/stockService";

const DIAS_PROXIMOS = 30;
const INTERVALO_MS = 60_000;

export function useContadorAlertas() {
  const [contador, setContador] = useState<ContadorAlertas>({
    stock_bajo: 0,
    vencidos: 0,
    por_vencer: 0,
  });

  const refrescar = useCallback(async () => {
    try {
      const r = await contarAlertasStock(DIAS_PROXIMOS);
      setContador(r);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    refrescar();
    const t = setInterval(refrescar, INTERVALO_MS);
    return () => clearInterval(t);
  }, [refrescar]);

  const total = contador.stock_bajo + contador.vencidos + contador.por_vencer;
  return { contador, total, refrescar };
}                                                                                               