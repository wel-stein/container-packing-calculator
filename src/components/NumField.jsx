export default function NumField({ value, onChange, placeholder, ariaLabel }) {
  return (
    <input
      type="number"
      value={value}
      min="0"
      step="any"
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full bg-slate-950/60 border border-cyan-500/20 px-2 py-1.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition tabular-nums"
    />
  );
}
