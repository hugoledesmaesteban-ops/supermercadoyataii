import { useState } from "react";
import {
  leerConfigImpresora,
  leerConfigComercio,
  leerModoImpresora,
  leerNombreImpresoraUsb,
  imprimirTicket,
  imprimirTicketUsb,
  abrirCajon,
  abrirCajonUsb,
  formatearFechaHora,
  type DatosTicket,
  type ItemTicket,
  type PagoTicket,
} from "@/services/impresionService";
import type { LineaCarrito } from "@/store/carritoStore";
import type { PagoInput, VentaConfirmada } from "@/types/venta";

const CLAVE_COLA = "pos-cola-impresion";

interface TicketPendiente {
  id: string;
  ticket: DatosTicket;
  pagos_efectivo: boolean;
  timestamp: string;
  intentos: number;
}

function leerCola(): TicketPendiente[] {
  try {
    const raw = localStorage.getItem(CLAVE_COLA);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function guardarCola(cola: TicketPendiente[]) {
  try {
    localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
  } catch {
    /* quota */
  }
}

export async function construirTicket(
  venta: VentaConfirmada,
  lineas: LineaCarrito[],
  pagos: PagoInput[],
): Promise<DatosTicket> {
  const comercio = await leerConfigComercio();
  const { fecha, hora } = formatearFechaHora(new Date());

  const items: ItemTicket[] = lineas.map((l) => ({
    nombre: l.producto.nombre,
    cantidad_display: l.producto.es_pesable
      ? `${l.cantidad.toFixed(3)}kg`
      : String(l.cantidad),
    precio_unitario: l.precioUnitario,
    total: l.cantidad * l.precioUnitario - l.descuento,
  }));

  const pagosTicket: PagoTicket[] = pagos.map((p) => ({
    metodo: p.metodo,
    monto: p.monto,
  }));

  return {
    ...comercio,
    numero_venta: venta.numero,
    fecha,
    hora,
    items,
    subtotal: venta.subtotal,
    descuento: venta.descuento,
    total: venta.total,
    pagos: pagosTicket,
    vuelto: venta.vuelto_total,
  };
}

/**
 * Envía un ticket por el método que esté configurado (USB o Ethernet).
 * Devuelve true si se imprimió OK, false si hubo error.
 */
async function enviarTicket(ticket: DatosTicket): Promise<boolean> {
  const modo = await leerModoImpresora();

  if (modo === "usb") {
    const nombre = await leerNombreImpresoraUsb();
    if (!nombre) return false;
    try {
      await imprimirTicketUsb(nombre, ticket);
      return true;
    } catch {
      return false;
    }
  }

  const config = await leerConfigImpresora();
  if (!config) return false;
  try {
    await imprimirTicket(config, ticket);
    return true;
  } catch {
    return false;
  }
}

async function enviarPulsoCajon(): Promise<void> {
  const modo = await leerModoImpresora();

  if (modo === "usb") {
    const nombre = await leerNombreImpresoraUsb();
    if (!nombre) return;
    try {
      await abrirCajonUsb(nombre);
    } catch {
      /* no bloqueante */
    }
    return;
  }

  const config = await leerConfigImpresora();
  if (!config) return;
  try {
    await abrirCajon(config);
  } catch {
    /* no bloqueante */
  }
}

export function useImpresion() {
  const [cantidadPendientes, setCantidadPendientes] = useState(() => leerCola().length);

  function refrescar() {
    setCantidadPendientes(leerCola().length);
  }

  function encolar(ticket: DatosTicket, pagosEfectivo: boolean) {
    const cola = leerCola();
    cola.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ticket,
      pagos_efectivo: pagosEfectivo,
      timestamp: new Date().toISOString(),
      intentos: 0,
    });
    guardarCola(cola);
    refrescar();
  }

  /**
   * Intenta imprimir. Si falla, deja el ticket en la cola.
   */
  async function imprimirConReintento(
    ticket: DatosTicket,
    pagosEfectivo: boolean,
  ): Promise<boolean> {
    const ok = await enviarTicket(ticket);
    if (!ok) {
      encolar(ticket, pagosEfectivo);
      return false;
    }
    if (pagosEfectivo) {
      await enviarPulsoCajon();
    }
    return true;
  }

  async function reintentarTodas(): Promise<{ exitos: number; fallidos: number }> {
    const cola = leerCola();
    if (cola.length === 0) return { exitos: 0, fallidos: 0 };

    const pendientes: TicketPendiente[] = [];
    let exitos = 0;

    for (const p of cola) {
      const ok = await enviarTicket(p.ticket);
      if (ok) {
        exitos += 1;
        if (p.pagos_efectivo) await enviarPulsoCajon();
      } else {
        pendientes.push({ ...p, intentos: p.intentos + 1 });
      }
    }

    guardarCola(pendientes);
    refrescar();
    return { exitos, fallidos: pendientes.length };
  }

  function descartarTodo() {
    guardarCola([]);
    refrescar();
  }

  return {
    cantidadPendientes,
    imprimirConReintento,
    reintentarTodas,
    descartarTodo,
    refrescar,
  };
}
