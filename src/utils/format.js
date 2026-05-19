export function formatVolume(v, unit) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M ${unit}³`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K ${unit}³`;
  return `${v.toFixed(0)} ${unit}³`;
}
