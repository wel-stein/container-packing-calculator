import { describe, it, expect } from 'vitest';
import { rotations, fits, splitSpace, packBoxes } from './packing';

describe('rotations', () => {
  it('returns 1 unique rotation for a cube', () => {
    expect(rotations({ l: 10, w: 10, h: 10 })).toHaveLength(1);
  });

  it('returns 3 unique rotations for a square-base prism', () => {
    expect(rotations({ l: 10, w: 10, h: 5 })).toHaveLength(3);
  });

  it('returns 6 unique rotations for fully distinct dims', () => {
    expect(rotations({ l: 1, w: 2, h: 3 })).toHaveLength(6);
  });
});

describe('fits', () => {
  const space = { l: 10, w: 10, h: 10 };

  it('returns true when dim exactly equals the space', () => {
    expect(fits(space, [10, 10, 10])).toBe(true);
  });

  it('returns false when any axis exceeds the space', () => {
    expect(fits(space, [11, 10, 10])).toBe(false);
    expect(fits(space, [10, 11, 10])).toBe(false);
    expect(fits(space, [10, 10, 11])).toBe(false);
  });

  it('tolerates tiny floating-point noise', () => {
    expect(fits(space, [10 + 1e-12, 10, 10])).toBe(true);
  });
});

describe('splitSpace', () => {
  const space = { x: 0, y: 0, z: 0, l: 10, w: 10, h: 10 };

  it('returns 3 remainders when the item is strictly smaller in all dims', () => {
    expect(splitSpace(space, [3, 4, 5])).toHaveLength(3);
  });

  it('returns 0 remainders when the item fills the space', () => {
    expect(splitSpace(space, [10, 10, 10])).toHaveLength(0);
  });

  it('places the L remainder to the right of the placed item', () => {
    const out = splitSpace(space, [3, 10, 10]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ x: 3, l: 7, w: 10, h: 10 });
  });
});

describe('packBoxes', () => {
  it('packs three 10-cubes into a 30×10×10 container at 100% utilization', () => {
    const r = packBoxes({ L: 30, W: 10, H: 10 }, [
      { l: 10, w: 10, h: 10, qty: 3 },
    ]);
    expect(r.total).toBe(3);
    expect(r.utilization).toBeCloseTo(100);
    expect(r.skippedTypeIds).toEqual([]);
    expect(r.counts).toEqual([3]);
  });

  it('records a typeId in skippedTypeIds when a box is larger than the container', () => {
    const r = packBoxes({ L: 30, W: 10, H: 10 }, [
      { l: 50, w: 10, h: 10, qty: 1 },
    ]);
    expect(r.total).toBe(0);
    expect(r.skippedTypeIds).toEqual([0]);
  });

  it('treats qty=0 as none (not skipped)', () => {
    const r = packBoxes({ L: 30, W: 30, H: 30 }, [
      { l: 10, w: 10, h: 10, qty: 0 },
    ]);
    expect(r.total).toBe(0);
    expect(r.skippedTypeIds).toEqual([]);
    expect(r.counts).toEqual([0]);
  });

  it('rotates a box so the longest axis aligns with the container height', () => {
    // Container 10×10×30, box 30×5×5 only fits if rotated.
    const r = packBoxes({ L: 10, W: 10, H: 30 }, [
      { l: 30, w: 5, h: 5, qty: 1 },
    ]);
    expect(r.total).toBe(1);
  });

  it('ignores box types with non-positive dimensions', () => {
    const r = packBoxes({ L: 30, W: 30, H: 30 }, [
      { l: 0, w: 10, h: 10, qty: 5 },
      { l: 10, w: 10, h: 10, qty: 2 },
    ]);
    expect(r.total).toBe(2);
    expect(r.counts).toEqual([0, 2]);
  });

  it('returns a per-type count array of the same length as boxTypes', () => {
    const r = packBoxes({ L: 30, W: 10, H: 10 }, [
      { l: 10, w: 10, h: 10, qty: 2 },
      { l: 5, w: 5, h: 5, qty: 4 },
    ]);
    expect(r.counts).toHaveLength(2);
    expect(r.counts[0] + r.counts[1]).toBe(r.total);
  });

  it('computes utilization from container vs used volume', () => {
    const r = packBoxes({ L: 20, W: 10, H: 10 }, [
      { l: 10, w: 10, h: 10, qty: 1 },
    ]);
    expect(r.containerVol).toBe(2000);
    expect(r.usedVol).toBe(1000);
    expect(r.utilization).toBeCloseTo(50);
  });
});
