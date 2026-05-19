export const TYPE_COLORS = [
  { hex: 0xf59e0b, css: '#f59e0b' },
  { hex: 0xec4899, css: '#ec4899' },
  { hex: 0x8b5cf6, css: '#8b5cf6' },
  { hex: 0x10b981, css: '#10b981' },
  { hex: 0xef4444, css: '#ef4444' },
  { hex: 0x3b82f6, css: '#3b82f6' },
  { hex: 0xeab308, css: '#eab308' },
  { hex: 0x14b8a6, css: '#14b8a6' },
];

export function colorFor(idx) {
  return TYPE_COLORS[idx % TYPE_COLORS.length];
}
