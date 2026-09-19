import { useEffect } from "react";
import { useCarritoStore } from "@/store/carritoStore";
import type { LineaCarrito } from "@/store/carritoStore";

const CLAVE = "pos-carrito-autoguardado";
const VERSION = 1;

interface Payload {
  version: number;
  fecha: string;
  lineas: LineaCarrito[];
}

export interface VentaInterrumpida {
  lineas: LineaCarrito[];
  fecha: string;
}

/** Serializa y guarda el carrito actual en localStorage. */
function guardar(lineas: LineaCarrito[]) {
  try {
    const payload: Payload = {
      version: VERSION,
      fecha: new Date().toISOString(),
      lineas,
    };
    localStorage.setItem(CLAVE, JSON.stringify(payload));
  } catch (e) {
    console.warn("No se pudo autoguardar el carrito:", e);
  }
}

/** Lee el carrito guardado. Devuelve null si no hay o si está corrupto. */
export function leerAutoguardado(): VentaInterrumpida | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Payload>;
    if (
      data.version !== VERSION ||
      !Array.isArray(data.lineas) ||
      data.lineas.length === 0 ||
      typeof data.fecha !== "string"
    ) {
      return null;
    }
    return { lineas: data.lineas, fecha: data.fecha };
  } catch {
    return null;
  }
}

/** Borra el autoguardado (usar cuando se cobra, cancela, suspende o descarta). */
export function descartarAutoguardado() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada
  }
}

/**
 * Autoguarda el carrito cada 5 segundos y en cada cambio de líneas.
 * Desactivar con `activo = false` mientras el modal de recuperación está
 * abierto (para no pisar el guardado anterior con un carrito vacío).
 */
export function useAutoguardado(activo: boolean) {
  const lineas = useCarritoStore((s) => s.lineas);

  useEffect(() => {
    if (!activo) return;

    const timer = window.setInterval(() => {
      const actuales = useCarritoStore.getState().lineas;
      if (actuales.length > 0) guardar(actuales);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activo]);

  useEffect(() => {
    if (!activo) return;

    if (lineas.length === 0) {
      descartarAutoguardado();
      return;
    }

    const t = window.setTimeout(() => guardar(lineas), 500);
    return () => window.clearTimeout(t);
  }, [lineas, activo]);
}