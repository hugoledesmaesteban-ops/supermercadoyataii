import { create } from "zustand";
import type { Producto } from "@/types/producto";
import type { ItemVentaInput, OrigenPeso } from "@/types/venta";

export interface LineaCarrito {
  clave: string;
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  origenPeso: OrigenPeso | null;
}

interface CarritoState {
  lineas: LineaCarrito[];
  claveSeleccionada: string | null;
  cantidadPreparada: number | null;

  agregarProducto: (producto: Producto, cantidad?: number) => void;
  agregarPesable: (producto: Producto, kg: number, origenPeso: OrigenPeso) => void;
  cambiarCantidad: (clave: string, cantidad: number) => void;
  aplicarDescuento: (clave: string, descuento: number) => void;
  aplicarDescuentoPorcentaje: (clave: string, porcentaje: number) => void;
  limpiarDescuentoLinea: (clave: string) => void;
  cambiarPrecioLinea: (clave: string, nuevoPrecio: number) => void;
  quitarLinea: (clave: string) => void;
  vaciarCarrito: () => void;
  reemplazarCarrito: (lineas: LineaCarrito[]) => void;

  seleccionarLinea: (clave: string | null) => void;
  seleccionarLineaAnterior: () => void;
  seleccionarLineaSiguiente: () => void;
  incrementarSeleccionada: () => void;
  decrementarSeleccionada: () => void;
  quitarLineaSeleccionada: () => void;
  lineaSeleccionada: () => LineaCarrito | null;

  establecerCantidadPreparada: (n: number | null) => void;

  subtotal: () => number;
  descuentoTotal: () => number;
  total: () => number;
  aItemsVenta: () => ItemVentaInput[];
}

/**
 * Calcula el descuento TOTAL que corresponde a una línea según la cantidad.
 * Si la cantidad es menor a `descuento_cantidad_minima`, NO aplica descuento.
 */
function descuentoTotalDeLinea(producto: Producto, cantidad: number): number {
  const pct = producto.descuento_porcentaje ?? 0;
  const min = producto.descuento_cantidad_minima ?? 1;
  if (pct <= 0) return 0;
  if (cantidad < min) return 0;

  const precioUnit = producto.es_pesable && producto.precio_por_kg
    ? producto.precio_por_kg
    : producto.precio_venta;
  const bruto = cantidad * precioUnit;
  return Math.round(bruto * (pct / 100) * 100) / 100;
}

export const useCarritoStore = create<CarritoState>((set, get) => ({
  lineas: [],
  claveSeleccionada: null,
  cantidadPreparada: null,

  agregarProducto: (producto, cantidad = 1) =>
    set((state) => {
      const existente = state.lineas.find((l) => l.producto.id === producto.id && !producto.es_pesable);

      if (existente) {
        const nuevaCant = existente.cantidad + cantidad;
        const nuevoDesc = descuentoTotalDeLinea(existente.producto, nuevaCant);
        return {
          lineas: state.lineas.map((l) =>
            l.clave === existente.clave
              ? { ...l, cantidad: nuevaCant, descuento: nuevoDesc }
              : l,
          ),
          claveSeleccionada: existente.clave,
        };
      }
      const clave = `${producto.id}-${Date.now()}`;
      const nuevoDesc = descuentoTotalDeLinea(producto, cantidad);
      const nuevaLinea: LineaCarrito = {
        clave, producto, cantidad,
        precioUnitario: producto.precio_venta,
        descuento: nuevoDesc,
        origenPeso: null,
      };
      return { lineas: [...state.lineas, nuevaLinea], claveSeleccionada: clave };
    }),

  agregarPesable: (producto, kg, origenPeso) =>
    set((state) => {
      const clave = `${producto.id}-${Date.now()}`;
      const precioKg = producto.precio_por_kg ?? producto.precio_venta;
      const nuevoDesc = descuentoTotalDeLinea(producto, kg);
      return {
        lineas: [...state.lineas, {
          clave, producto, cantidad: kg,
          precioUnitario: precioKg,
          descuento: nuevoDesc,
          origenPeso,
        }],
        claveSeleccionada: clave,
      };
    }),

  cambiarCantidad: (clave, cantidad) =>
    set((state) => ({
      lineas: state.lineas
        .map((l) => {
          if (l.clave !== clave) return l;
          const nuevoDesc = descuentoTotalDeLinea(l.producto, cantidad);
          return { ...l, cantidad, descuento: nuevoDesc };
        })
        .filter((l) => l.cantidad > 0),
    })),

  aplicarDescuento: (clave, descuento) =>
    set((state) => ({ lineas: state.lineas.map((l) => (l.clave === clave ? { ...l, descuento } : l)) })),

  aplicarDescuentoPorcentaje: (clave, porcentaje) =>
    set((state) => ({
      lineas: state.lineas.map((l) => {
        if (l.clave !== clave) return l;
        const bruto = l.cantidad * l.precioUnitario;
        const descuento = Math.round(bruto * (porcentaje / 100) * 100) / 100;
        return { ...l, descuento };
      }),
    })),

  limpiarDescuentoLinea: (clave) =>
    set((state) => ({ lineas: state.lineas.map((l) => (l.clave === clave ? { ...l, descuento: 0 } : l)) })),

  cambiarPrecioLinea: (clave, nuevoPrecio) =>
    set((state) => ({
      lineas: state.lineas.map((l) => {
        if (l.clave !== clave) return l;
        const nuevoDesc = descuentoTotalDeLinea({ ...l.producto, precio_venta: nuevoPrecio }, l.cantidad);
        return { ...l, precioUnitario: nuevoPrecio, descuento: nuevoDesc };
      }),
    })),

  quitarLinea: (clave) =>
    set((state) => ({
      lineas: state.lineas.filter((l) => l.clave !== clave),
      claveSeleccionada: state.claveSeleccionada === clave ? null : state.claveSeleccionada,
    })),

  vaciarCarrito: () => set({ lineas: [], claveSeleccionada: null, cantidadPreparada: null }),

  reemplazarCarrito: (lineas) => set({ lineas, claveSeleccionada: null, cantidadPreparada: null }),

  seleccionarLinea: (clave) => set({ claveSeleccionada: clave }),

  seleccionarLineaAnterior: () =>
    set((state) => {
      if (state.lineas.length === 0) return {};
      const idx = state.lineas.findIndex((l) => l.clave === state.claveSeleccionada);
      const nuevoIdx = idx <= 0 ? state.lineas.length - 1 : idx - 1;
      return { claveSeleccionada: state.lineas[nuevoIdx].clave };
    }),

  seleccionarLineaSiguiente: () =>
    set((state) => {
      if (state.lineas.length === 0) return {};
      const idx = state.lineas.findIndex((l) => l.clave === state.claveSeleccionada);
      const nuevoIdx = idx === -1 || idx === state.lineas.length - 1 ? 0 : idx + 1;
      return { claveSeleccionada: state.lineas[nuevoIdx].clave };
    }),

  incrementarSeleccionada: () =>
    set((state) => ({
      lineas: state.lineas.map((l) => {
        if (l.clave !== state.claveSeleccionada || l.producto.es_pesable) return l;
        const nuevaCant = l.cantidad + 1;
        const nuevoDesc = descuentoTotalDeLinea(l.producto, nuevaCant);
        return { ...l, cantidad: nuevaCant, descuento: nuevoDesc };
      }),
    })),

  decrementarSeleccionada: () =>
    set((state) => ({
      lineas: state.lineas
        .map((l) => {
          if (l.clave !== state.claveSeleccionada || l.producto.es_pesable) return l;
          const nuevaCant = l.cantidad - 1;
          const nuevoDesc = descuentoTotalDeLinea(l.producto, nuevaCant);
          return { ...l, cantidad: nuevaCant, descuento: nuevoDesc };
        })
        .filter((l) => l.cantidad > 0),
    })),

  quitarLineaSeleccionada: () =>
    set((state) => ({
      lineas: state.lineas.filter((l) => l.clave !== state.claveSeleccionada),
      claveSeleccionada: null,
    })),

  lineaSeleccionada: () => get().lineas.find((l) => l.clave === get().claveSeleccionada) ?? null,

  establecerCantidadPreparada: (n) => set({ cantidadPreparada: n }),

  subtotal: () => get().lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0),
  descuentoTotal: () => get().lineas.reduce((acc, l) => acc + l.descuento, 0),
  total: () => Math.max(get().subtotal() - get().descuentoTotal(), 0),

  aItemsVenta: () =>
    get().lineas.map((l) => ({
      producto_id: l.producto.id as number,
      cantidad: l.cantidad,
      es_pesable: l.producto.es_pesable,
      origen_peso: l.origenPeso,
      precio_unitario: l.precioUnitario,
      descuento: l.descuento,
      promocion_id: null,
    })),
}));
