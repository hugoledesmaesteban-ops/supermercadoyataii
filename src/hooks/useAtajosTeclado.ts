import { useEffect } from "react";

export interface AtajosConfig {
  onBuscar?: () => void;
  onCantidad?: () => void;
  onBorrar?: () => void;
  onSuspender?: () => void;
  onDevolucion?: () => void;
  onDescuento?: () => void;
  onCambiarPrecio?: () => void;
  onEfectivo?: () => void;
  onTransferencia?: () => void;
  onQr?: () => void;
  onTarjeta?: () => void;
  onCobrar?: () => void;
  onCancelar?: () => void;
  onConfirmar?: () => void;
  onLineaAnterior?: () => void;
  onLineaSiguiente?: () => void;
  onAumentarCantidad?: () => void;
  onDisminuirCantidad?: () => void;
  onDeshacer?: () => void;
  activo?: boolean;
}

/**
 * Atajos globales de la pantalla de venta. F1-F12 y ESC funcionan siempre,
 * incluso con el foco en el campo de código de barras (un lector nunca
 * envía teclas F ni ESC). DELETE y las flechas se ignoran si el foco está
 * en un campo de texto que no sea el de código de barras, para no romper
 * la edición normal de texto en otros formularios.
 */
export function useAtajosTeclado(config: AtajosConfig) {
  useEffect(() => {
    if (config.activo === false) return;

    function manejarTecla(e: KeyboardEvent) {
      const elementoActivo = document.activeElement as HTMLElement | null;
      const esCampoTexto = elementoActivo?.tagName === "INPUT" || elementoActivo?.tagName === "TEXTAREA";
      const esCampoCodigoBarra = elementoActivo?.dataset?.campoCodigoBarra === "true";

      switch (e.key) {
        case "F1": e.preventDefault(); config.onBuscar?.(); return;
        case "F2": e.preventDefault(); config.onCantidad?.(); return;
        case "F3": e.preventDefault(); config.onBorrar?.(); return;
        case "F4": e.preventDefault(); config.onSuspender?.(); return;
        case "F5": e.preventDefault(); config.onDevolucion?.(); return;
        case "F6": e.preventDefault(); config.onDescuento?.(); return;
        case "F7": e.preventDefault(); config.onCambiarPrecio?.(); return;
        case "F8": e.preventDefault(); config.onEfectivo?.(); return;
        case "F9": e.preventDefault(); config.onTransferencia?.(); return;
        case "F10": e.preventDefault(); config.onQr?.(); return;
        case "F11": e.preventDefault(); config.onTarjeta?.(); return;
        case "F12": e.preventDefault(); config.onCobrar?.(); return;
        case "Escape": config.onCancelar?.(); return;
      }

      if (e.ctrlKey && e.key.toLowerCase() === "f") { e.preventDefault(); config.onBuscar?.(); return; }
      if (e.ctrlKey && e.key.toLowerCase() === "s") { e.preventDefault(); config.onSuspender?.(); return; }
      if (e.ctrlKey && e.key.toLowerCase() === "z") { e.preventDefault(); config.onDeshacer?.(); return; }

      if (esCampoTexto && !esCampoCodigoBarra) return;

      switch (e.key) {
        case "Delete": config.onBorrar?.(); break;
        case "Enter": if (!esCampoCodigoBarra) config.onConfirmar?.(); break;
        case "ArrowUp": e.preventDefault(); config.onLineaAnterior?.(); break;
        case "ArrowDown": e.preventDefault(); config.onLineaSiguiente?.(); break;
        case "+": config.onAumentarCantidad?.(); break;
        case "-": config.onDisminuirCantidad?.(); break;
      }
    }

    window.addEventListener("keydown", manejarTecla);
    return () => window.removeEventListener("keydown", manejarTecla);
  }, [config]);
}