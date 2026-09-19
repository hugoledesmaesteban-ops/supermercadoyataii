import { invoke } from "@tauri-apps/api/tauri";

export interface Promocion {
  id: number; // 0 al crear, el backend lo ignora
  nombre: string;
  tipo: "PORCENTAJE" | "2X1" | "PRECIO_FIJO" | "COMBO";
  valor: number | null;
  categoria_id: number | null;
  cantidad_minima: number;
  prioridad: number;
}

export const listarPromociones = () => invoke<Promocion[]>("listar_promociones");

export const crearPromocion = (promocion: Promocion, productosAsociados: number[]) =>
  invoke<number>("crear_promocion", { promocion, productosAsociados });
