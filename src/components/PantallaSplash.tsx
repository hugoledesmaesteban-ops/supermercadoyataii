import { useEffect, useState } from "react";
import logoHlSistemas from "@/assets/logo-hl-sistemas.png";

interface Props {
  duracionMs?: number;
  onTerminar: () => void;
}

export default function PantallaSplash({ duracionMs = 1500, onTerminar }: Props) {
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setSaliendo(true), duracionMs - 300);
    const t2 = window.setTimeout(() => onTerminar(), duracionMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [duracionMs, onTerminar]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-opacity duration-300 ${
        saliendo ? "opacity-0" : "opacity-100"
      }`}
    >
      <img
        src={logoHlSistemas}
        alt="HL Sistemas"
        className="w-72 max-w-[80vw] h-auto object-contain"
      />
      <div className="mt-8 flex items-center gap-2 text-slate-400 text-sm">
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
        <span>Iniciando sistema…</span>
      </div>
    </div>
  );
}
