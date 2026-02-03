import { TIPO_TURNO_CONFIG } from "./types";

export default function Legend() {
  const items = Object.values(TIPO_TURNO_CONFIG);

  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-md border-t border-slate-200">
      <div className="flex items-center gap-2 mr-4">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
        </span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Referencias
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 px-2 py-1 rounded-lg border border-slate-100 bg-slate-50/50 shadow-sm transition-all hover:shadow-md hover:bg-white"
          >
            <div
              className={`w-1.5 h-3 rounded-full ${item.border.replace("border-l-", "bg-")}`}
            />
            <span className="text-[11px] text-slate-600 font-bold uppercase tracking-tight">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
