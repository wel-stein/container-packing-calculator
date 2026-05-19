export default function QtyStepper({ value, onChange, ariaLabel }) {
  const set = (v) => onChange(Math.max(0, Math.floor(v) || 0));
  return (
    <div className="flex items-stretch border border-cyan-500/20 bg-slate-950/60 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/30 transition">
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={value <= 0}
        className="px-1.5 text-cyan-300/80 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 disabled:hover:bg-transparent text-xs leading-none"
        aria-label="Decrease quantity"
      >−</button>
      <input
        type="number"
        value={value}
        min="0"
        step="1"
        aria-label={ariaLabel}
        onChange={(e) => set(parseFloat(e.target.value))}
        className="w-full min-w-0 bg-transparent px-1 py-1.5 text-slate-100 font-mono text-xs text-center focus:outline-none tabular-nums"
      />
      <button
        type="button"
        onClick={() => set((value || 0) + 1)}
        className="px-1.5 text-cyan-300/80 hover:text-cyan-300 hover:bg-cyan-500/10 text-xs leading-none"
        aria-label="Increase quantity"
      >+</button>
    </div>
  );
}
