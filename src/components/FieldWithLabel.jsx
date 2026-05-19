import { useNumericInput } from '../utils/useNumericInput';

export default function FieldWithLabel({ label, value, onChange, unit }) {
  const input = useNumericInput(value, onChange);
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.2em] text-cyan-300/70 font-mono uppercase">{label}</span>
      <div className="relative mt-1">
        <input
          type="number" min="0" step="any"
          {...input}
          className="w-full bg-slate-950/60 border border-cyan-500/20 px-3 py-2 text-slate-100 font-mono text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">{unit}</span>
      </div>
    </label>
  );
}
