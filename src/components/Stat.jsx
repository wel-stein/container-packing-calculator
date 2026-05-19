export default function Stat({ label, value, small }) {
  return (
    <div className="bg-slate-950/80 p-3">
      <div className="text-[9px] tracking-[0.2em] uppercase text-slate-500 mb-1">{label}</div>
      <div className={`${small ? 'text-xs' : 'text-base'} text-slate-100 font-mono tabular-nums`}>{value}</div>
    </div>
  );
}
