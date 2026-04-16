const LEGEND = [
  { color: "#f97316", label: "Wachtend" },
  { color: "#3b82f6", label: "Toegewezen" },
  { color: "#a855f7", label: "Vergrendeld" },
  { color: "#22c55e", label: "Verstuurd naar SAP" },
];

export function MapLegend() {
  return (
    <div className="absolute bottom-8 left-4 z-[500] bg-white rounded-xl shadow-lg px-4 py-3 text-xs space-y-1.5">
      {LEGEND.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: color }}
          />
          <span className="text-gray-700">{label}</span>
        </div>
      ))}
    </div>
  );
}
