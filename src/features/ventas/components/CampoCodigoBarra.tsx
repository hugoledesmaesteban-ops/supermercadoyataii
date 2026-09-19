import { useRef, useState } from "react";
import { buscarProductoPorCodigo } from "@/services/productosService";
import { useCarritoStore } from "@/store/carritoStore";
import type { Producto } from "@/types/producto";

interface Props {
  onProductoPesable: (producto: Producto) => void;
}

type Banner =
  | { tipo: "no_encontrado"; codigo: string }
  | { tipo: "sin_precio"; producto: Producto }
  | { tipo: "stock_insuficiente"; producto: Producto; solicitado: number }
  | { tipo: "vencido"; producto: Producto }
  | { tipo: "balanza_sin_producto"; plu: string }
  | { tipo: "balanza_sin_precio"; producto: Producto }
  | { tipo: "balanza_peso_invalido"; peso: number };

// === DECODIFICADOR ETIQUETAS BALANZA KRETZ REPORT LT (MODO PESO) ===
// Formato 2-5-5-1 (EAN-13):
//   [2 digitos prefijo "20"] [5 digitos PLU] [5 digitos PESO en gramos] [1 digito check]
// Ejemplo: 2000085013502 -> PLU "00085", peso 01350 = 1.350 kg
const PREFIJO_BALANZA = "20";

interface CodigoBalanza {
  plu: string;
  pesoGramos: number;
}

function decodificarCodigoBalanza(codigo: string): CodigoBalanza | null {
  if (codigo.length !== 13) return null;
  if (!codigo.startsWith(PREFIJO_BALANZA)) return null;
  if (!/^\d{13}$/.test(codigo)) return null;

  const plu = codigo.substring(2, 7);
  const pesoGramos = parseInt(codigo.substring(7, 12), 10);
  if (isNaN(pesoGramos)) return null;

  return { plu, pesoGramos };
}

export default function CampoCodigoBarra({ onProductoPesable }: Props) {
  const [valor, setValor] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    agregarProducto,
    agregarPesable,
    cantidadPreparada,
    establecerCantidadPreparada,
  } = useCarritoStore();

  function manejarCambio(texto: string) {
    const coincidenciaCantidad = texto.match(/^(\d+)_$/);
    if (coincidenciaCantidad) {
      establecerCantidadPreparada(parseInt(coincidenciaCantidad[1], 10));
      setValor("");
      return;
    }
    setValor(texto);
  }

  function estaVencido(fechaIso: string): boolean {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha < hoy;
  }

  async function manejarEscaneo(codigo: string) {
    const codigoLimpio = codigo.trim();
    if (!codigoLimpio) return;

    // === DETECCION DE ETIQUETA DE BALANZA KRETZ ===
    const codigoBalanza = decodificarCodigoBalanza(codigoLimpio);
    if (codigoBalanza) {
      setBuscando(true);
      try {
        // El PLU de la balanza se busca como codigo de barras del producto.
        const producto = await buscarProductoPorCodigo(codigoBalanza.plu);
        if (!producto) {
          setBanner({ tipo: "balanza_sin_producto", plu: codigoBalanza.plu });
          return;
        }
        if (!producto.precio_venta || producto.precio_venta <= 0) {
          setBanner({ tipo: "balanza_sin_precio", producto });
          return;
        }
        // El peso viene en gramos. Lo pasamos a kg.
        const pesoKg = codigoBalanza.pesoGramos / 1000;
        if (pesoKg <= 0 || pesoKg > 50) {
          setBanner({ tipo: "balanza_peso_invalido", peso: pesoKg });
          return;
        }
        agregarPesable(producto, pesoKg, "MANUAL");
        setBanner(null);
      } finally {
        setBuscando(false);
        setValor("");
        inputRef.current?.focus();
      }
      return;
    }

    // === FLUJO NORMAL (codigos de barras comunes) ===
    const cantidad = cantidadPreparada ?? 1;
    setBuscando(true);
    try {
      const producto = await buscarProductoPorCodigo(codigoLimpio);
      if (!producto) {
        setBanner({ tipo: "no_encontrado", codigo: codigoLimpio });
        return;
      }
      if (producto.vencimiento && estaVencido(producto.vencimiento)) {
        setBanner({ tipo: "vencido", producto });
        return;
      }
      if (!producto.precio_venta || producto.precio_venta <= 0) {
        setBanner({ tipo: "sin_precio", producto });
        return;
      }
      if (!producto.es_pesable && producto.stock < cantidad) {
        setBanner({ tipo: "stock_insuficiente", producto, solicitado: cantidad });
        return;
      }

      if (producto.es_pesable) onProductoPesable(producto);
      else agregarProducto(producto, cantidad);
      setBanner(null);
    } finally {
      setBuscando(false);
      setValor("");
      establecerCantidadPreparada(null);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {cantidadPreparada && (
          <div className="h-[60px] px-4 flex items-center bg-brand text-white rounded-lg font-bold whitespace-nowrap">
            CANTIDAD PREPARADA: {cantidadPreparada}
          </div>
        )}
        <input
          ref={inputRef}
          data-campo-codigo-barra="true"
          autoFocus
          value={valor}
          onChange={(e) => manejarCambio(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") manejarEscaneo(valor);
          }}
          placeholder={
            buscando
              ? "Buscando..."
              : "Escanear codigo de barras... (ej: 10_ + escaneo = 10 unidades)"
          }
          className="flex-1 h-[60px] px-4 text-xl border-2 border-brand rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {banner?.tipo === "no_encontrado" && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex justify-between items-center">
          <span>PRODUCTO NO ENCONTRADO: {banner.codigo}</span>
          <button onClick={() => setBanner(null)} className="text-sm underline">
            Cerrar
          </button>
        </div>
      )}
      {banner?.tipo === "balanza_sin_producto" && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex justify-between items-center">
          <span>
            ETIQUETA DE BALANZA - PLU {banner.plu} sin producto en el sistema.
            Cargalo en Productos con ese codigo de barras.
          </span>
          <button onClick={() => setBanner(null)} className="text-sm underline">
            Cerrar
          </button>
        </div>
      )}
      {banner?.tipo === "balanza_sin_precio" && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex justify-between items-center">
          <span>
            PRODUCTO DE BALANZA SIN PRECIO POR KG: {banner.producto.nombre}
          </span>
          <button onClick={() => setBanner(null)} className="text-sm underline">
            Cerrar
          </button>
        </div>
      )}
      {banner?.tipo === "balanza_peso_invalido" && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex justify-between items-center">
          <span>
            PESO INVALIDO EN ETIQUETA DE BALANZA: {banner.peso.toFixed(3)} kg
          </span>
          <button onClick={() => setBanner(null)} className="text-sm underline">
            Cerrar
          </button>
        </div>
      )}
      {banner?.tipo === "sin_precio" && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex justify-between items-center">
          <span>PRODUCTO SIN PRECIO: {banner.producto.nombre}</span>
          <button onClick={() => setBanner(null)} className="text-sm underline">
            Cerrar
          </button>
        </div>
      )}
      {banner?.tipo === "stock_insuficiente" && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3">
          <p>STOCK INSUFICIENTE - {banner.producto.nombre}</p>
          <p className="text-sm">
            Disponible: {banner.producto.stock} - Solicitado: {banner.solicitado}
          </p>
          <button onClick={() => setBanner(null)} className="text-sm underline mt-1">
            Cerrar
          </button>
        </div>
      )}
      {banner?.tipo === "vencido" && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3">
          <p>PRODUCTO VENCIDO - {banner.producto.nombre}</p>
          <p className="text-sm">Vencimiento: {banner.producto.vencimiento}</p>
          <button onClick={() => setBanner(null)} className="text-sm underline mt-1">
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}