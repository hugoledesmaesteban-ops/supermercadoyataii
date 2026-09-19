import { create } from "zustand";

export interface UsuarioSesion {
  id: number;
  nombre_usuario: string;
  nombre_completo: string;
  rol: string;
}

interface SesionState {
  usuario: UsuarioSesion | null;
  cajaId: number | null;
  setUsuario: (usuario: UsuarioSesion | null) => void;
  setCajaId: (cajaId: number | null) => void;
  cerrarSesion: () => void;
}

export const useSesionStore = create<SesionState>((set) => ({
  usuario: null,
  cajaId: null,
  setUsuario: (usuario) => set({ usuario }),
  setCajaId: (cajaId) => set({ cajaId }),
  cerrarSesion: () => set({ usuario: null, cajaId: null }),
}));
