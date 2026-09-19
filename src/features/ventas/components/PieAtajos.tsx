const ATAJOS: { tecla: string; label: string }[] = [
  { tecla: "F1", label: "Buscar" },
  { tecla: "F2", label: "Cantidad" },
  { tecla: "F3", label: "Borrar" },
  { tecla: "F4", label: "Suspender" },
  { tecla: "F5", label: "Devolución" },
  { tecla: "F6", label: "Descuento" },
  { tecla: "F11", label: "Pantalla" },
  { tecla: "F12", label: "Cobrar" },
];

export default function PieAtajos() {
  return (
    <footer className="bg-slate-950 text-white px-4 py-2 flex items-center gap-3 flex-wrap text-xs">
      {ATAJOS.map((a) => (
        <div key={a.tecla} className="flex items-center gap-1.5">
          <span className="bg-amber-400 text-slate-900 font-bold px-2 py-0.5 rounded">
            {a.tecla}
          </span>
          <span className="text-slate-200">{a.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 ml-auto">
        <span className="bg-slate-700 text-white font-bold px-2 py-0.5 rounded">ESC</span>
        <span className="text-slate-200">Cancelar</span>
      </div>
    </footer>
  );
}
