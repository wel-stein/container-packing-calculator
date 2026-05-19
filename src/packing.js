// ============================================================
// Multi-size 3D bin packing
// First-fit decreasing: largest items first. For each item, try
// all 6 rotations against all current free spaces, pick tightest
// fit. After placement, split used space into up to 3 remainders.
// ============================================================

export function rotations(b) {
  const { l, w, h } = b;
  const set = new Set();
  const out = [];
  const add = (a, b2, c) => {
    const k = `${a},${b2},${c}`;
    if (!set.has(k)) { set.add(k); out.push([a, b2, c]); }
  };
  add(l, w, h); add(l, h, w);
  add(w, l, h); add(w, h, l);
  add(h, l, w); add(h, w, l);
  return out;
}

export function fits(space, dim) {
  return dim[0] <= space.l + 1e-9 && dim[1] <= space.w + 1e-9 && dim[2] <= space.h + 1e-9;
}

export function splitSpace(space, dim) {
  const [bl, bw, bh] = dim;
  const out = [];
  if (space.l - bl > 1e-6) {
    out.push({ x: space.x + bl, y: space.y, z: space.z,
      l: space.l - bl, w: space.w, h: space.h });
  }
  if (space.w - bw > 1e-6) {
    out.push({ x: space.x, y: space.y + bw, z: space.z,
      l: bl, w: space.w - bw, h: space.h });
  }
  if (space.h - bh > 1e-6) {
    out.push({ x: space.x, y: space.y, z: space.z + bh,
      l: bl, w: bw, h: space.h - bh });
  }
  return out;
}

export function packBoxes(container, boxTypes) {
  const items = [];
  boxTypes.forEach((bt, idx) => {
    if (bt.l <= 0 || bt.w <= 0 || bt.h <= 0) return;
    const qty = Math.max(0, Math.floor(bt.qty) || 0);
    for (let i = 0; i < qty; i++) {
      items.push({ typeId: idx, l: bt.l, w: bt.w, h: bt.h, vol: bt.l * bt.w * bt.h });
    }
  });

  items.sort((a, b) => b.vol - a.vol);

  let spaces = [{ x: 0, y: 0, z: 0, l: container.L, w: container.W, h: container.H }];
  const placed = [];
  const skipped = new Set();

  for (const item of items) {
    const rots = rotations(item);
    let best = null;

    for (let si = 0; si < spaces.length; si++) {
      const sp = spaces[si];
      for (const r of rots) {
        if (!fits(sp, r)) continue;
        const waste = (sp.l - r[0]) + (sp.w - r[1]) + (sp.h - r[2]);
        if (!best || waste < best.waste) {
          best = { spaceIdx: si, dim: r, waste };
        }
      }
    }

    if (!best) { skipped.add(item.typeId); continue; }

    const sp = spaces[best.spaceIdx];
    placed.push({
      typeId: item.typeId,
      x: sp.x, y: sp.y, z: sp.z,
      l: best.dim[0], w: best.dim[1], h: best.dim[2],
    });

    const remainders = splitSpace(sp, best.dim);
    spaces.splice(best.spaceIdx, 1, ...remainders);

    spaces = spaces.filter((s, i) => {
      return !spaces.some((o, j) => {
        if (i === j) return false;
        return (
          s.x >= o.x - 1e-9 && s.y >= o.y - 1e-9 && s.z >= o.z - 1e-9 &&
          s.x + s.l <= o.x + o.l + 1e-9 &&
          s.y + s.w <= o.y + o.w + 1e-9 &&
          s.z + s.h <= o.z + o.h + 1e-9
        );
      });
    });
  }

  const counts = boxTypes.map(() => 0);
  placed.forEach(p => { counts[p.typeId]++; });

  const containerVol = container.L * container.W * container.H;
  const usedVol = placed.reduce((s, p) => s + p.l * p.w * p.h, 0);

  return {
    placed,
    counts,
    total: placed.length,
    utilization: containerVol > 0 ? (usedVol / containerVol) * 100 : 0,
    containerVol,
    usedVol,
    skippedTypeIds: Array.from(skipped),
  };
}
