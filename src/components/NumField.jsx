import { useNumericInput } from '../utils/useNumericInput';

export default function NumField({ value, onChange, placeholder, ariaLabel }) {
  const input = useNumericInput(value, onChange);
  return (
    <input
      type="number"
      min="0"
      step="any"
      placeholder={placeholder}
      aria-label={ariaLabel}
      {...input}
      className="w-full bg-slate-950/60 border border-cyan-500/20 px-2 py-1.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition tabular-nums"
    />
  );
}
