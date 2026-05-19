import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

// ============================================================
// Multi-size 3D bin packing
// First-fit decreasing: largest items first. For each item, try
// all 6 rotations against all current free spaces, pick tightest
// fit. After placement, split used space into up to 3 remainders.
// ============================================================

function rotations(b) {
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

function fits(space, dim) {
  return dim[0] <= space.l + 1e-9 && dim[1] <= space.w + 1e-9 && dim[2] <= space.h + 1e-9;
}

function splitSpace(space, dim) {
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

function packBoxes(container, boxTypes) {
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

// ============================================================
// 3D Viewer
// ============================================================

const TYPE_COLORS = [
  { hex: 0xf59e0b, css: '#f59e0b' },
  { hex: 0xec4899, css: '#ec4899' },
  { hex: 0x8b5cf6, css: '#8b5cf6' },
  { hex: 0x10b981, css: '#10b981' },
  { hex: 0xef4444, css: '#ef4444' },
  { hex: 0x3b82f6, css: '#3b82f6' },
  { hex: 0xeab308, css: '#eab308' },
  { hex: 0x14b8a6, css: '#14b8a6' },
];

function colorFor(idx) { return TYPE_COLORS[idx % TYPE_COLORS.length]; }

function PackingViewer({ container, placed, visibleCount }) {
  const mountRef = useRef(null);
  const cameraRef = useRef(null);
  const groupRef = useRef(null);
  const rotationRef = useRef({ x: 0.5, y: 0.7 });
  const draggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.7);
    d1.position.set(1, 2, 1); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0x66ccff, 0.25);
    d2.position.set(-1, -1, -1); scene.add(d2);

    const group = new THREE.Group();
    scene.add(group);
    cameraRef.current = camera;
    groupRef.current = group;

    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    const pointers = new Map();
    let pinchDist = 0;

    const onDown = (e) => {
      dom.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        draggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      } else if (pointers.size === 2) {
        draggingRef.current = false;
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1 && draggingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        rotationRef.current.y += dx * 0.01;
        rotationRef.current.x += dy * 0.01;
        rotationRef.current.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rotationRef.current.x));
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0 && dist > 0) {
          const f = pinchDist / dist;
          camera.position.multiplyScalar(f);
        }
        pinchDist = dist;
      }
    };
    const onUp = (e) => {
      dom.releasePointerCapture?.(e.pointerId);
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) draggingRef.current = false;
    };
    const onWheel = (e) => {
      e.preventDefault();
      const f = e.deltaY > 0 ? 1.1 : 0.9;
      camera.position.multiplyScalar(f);
    };
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointercancel', onUp);
    dom.addEventListener('pointerleave', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (groupRef.current) {
        groupRef.current.rotation.x = rotationRef.current.x;
        groupRef.current.rotation.y = rotationRef.current.y;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointercancel', onUp);
      dom.removeEventListener('pointerleave', onUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const group = groupRef.current;
    const camera = cameraRef.current;
    if (!group || !camera) return;

    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    const { L, W, H } = container;
    if (!L || !W || !H) return;

    const cx = L / 2, cy = W / 2, cz = H / 2;

    const containerGeo = new THREE.BoxGeometry(L, H, W);
    const containerEdges = new THREE.EdgesGeometry(containerGeo);
    const containerLine = new THREE.LineSegments(
      containerEdges,
      new THREE.LineBasicMaterial({ color: 0x4dd0e1 })
    );
    group.add(containerLine);
    containerGeo.dispose();

    const floorGeo = new THREE.PlaneGeometry(L, W);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x1a2238, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -H / 2;
    group.add(floor);

    const visible = placed.slice(0, visibleCount);
    visible.forEach((p) => {
      const geo = new THREE.BoxGeometry(p.l, p.h, p.w);
      const c = colorFor(p.typeId);
      const mat = new THREE.MeshPhongMaterial({
        color: c.hex, transparent: true, opacity: 0.85, shininess: 25,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        p.x + p.l / 2 - cx,
        p.z + p.h / 2 - cz,
        p.y + p.w / 2 - cy
      );
      group.add(mesh);

      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.35, transparent: true })
      );
      line.position.copy(mesh.position);
      group.add(line);
    });

    const maxDim = Math.max(L, W, H);
    camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
    camera.lookAt(0, 0, 0);
  }, [container, placed, visibleCount]);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', cursor: 'grab' }}
      onMouseDown={(e) => { e.currentTarget.style.cursor = 'grabbing'; }}
      onMouseUp={(e) => { e.currentTarget.style.cursor = 'grab'; }}
    />
  );
}

// ============================================================
// UI
// ============================================================

function NumField({ value, onChange, placeholder }) {
  return (
    <input
      type="number" value={value} min="0" step="any" placeholder={placeholder}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full bg-slate-950/60 border border-cyan-500/20 px-2 py-1.5 text-slate-100 font-mono text-xs focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition tabular-nums"
    />
  );
}

function QtyStepper({ value, onChange }) {
  const set = (v) => onChange(Math.max(0, Math.floor(v) || 0));
  return (
    <div className="flex items-stretch border border-cyan-500/20 bg-slate-950/60 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/30 transition">
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={value <= 0}
        className="px-1.5 text-cyan-300/80 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 disabled:hover:bg-transparent text-xs leading-none"
        title="Decrease"
      >−</button>
      <input
        type="number"
        value={value}
        min="0"
        step="1"
        onChange={(e) => set(parseFloat(e.target.value))}
        className="w-full min-w-0 bg-transparent px-1 py-1.5 text-slate-100 font-mono text-xs text-center focus:outline-none tabular-nums"
      />
      <button
        type="button"
        onClick={() => set((value || 0) + 1)}
        className="px-1.5 text-cyan-300/80 hover:text-cyan-300 hover:bg-cyan-500/10 text-xs leading-none"
        title="Increase"
      >+</button>
    </div>
  );
}

function FieldWithLabel({ label, value, onChange, unit }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.2em] text-cyan-300/70 font-mono uppercase">{label}</span>
      <div className="relative mt-1">
        <input
          type="number" value={value} min="0" step="any"
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-slate-950/60 border border-cyan-500/20 px-3 py-2 text-slate-100 font-mono text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">{unit}</span>
      </div>
    </label>
  );
}

export default function App() {
  const [unit, setUnit] = useState('cm');
  const [container, setContainer] = useState({ L: 120, W: 80, H: 100 });
  const [boxTypes, setBoxTypes] = useState([
    { name: 'Box A', l: 40, w: 30, h: 25, qty: 0 },
    { name: 'Box B', l: 30, w: 20, h: 20, qty: 0 },
    { name: 'Box C', l: 20, w: 15, h: 15, qty: 0 },
  ]);
  const [showAll, setShowAll] = useState(true);
  const [sliceCount, setSliceCount] = useState(0);

  const result = useMemo(() => packBoxes(container, boxTypes), [container, boxTypes]);
  const visibleCount = showAll ? result.total : Math.min(sliceCount, result.total);

  const shortages = useMemo(() => {
    return boxTypes
      .map((bt, idx) => {
        const requested = Math.max(0, Math.floor(bt.qty) || 0);
        const packed = result.counts[idx] || 0;
        const short = requested - packed;
        return { idx, name: bt.name, requested, packed, short };
      })
      .filter(s => s.short > 0);
  }, [boxTypes, result.counts]);

  const visibleBoxesControl = result.total > 0 ? (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] tracking-[0.2em] uppercase">
        <label className="text-slate-400">Visible boxes</label>
        <button
          onClick={() => setShowAll(!showAll)}
          className={`px-2 py-0.5 ${showAll ? 'bg-cyan-400 text-slate-950' : 'text-cyan-300 border border-cyan-500/30'}`}
        >
          {showAll ? 'All' : 'Slice'}
        </button>
      </div>
      <input
        type="range" min="0" max={result.total} value={visibleCount}
        onChange={(e) => { setShowAll(false); setSliceCount(parseInt(e.target.value)); }}
        className="w-full"
      />
      <div className="text-[10px] text-slate-500 font-mono text-right">
        {visibleCount} / {result.total}
      </div>
    </div>
  ) : null;

  useEffect(() => { setSliceCount(result.total); }, [result.total]);

  const addBoxType = () => {
    setBoxTypes([...boxTypes, {
      name: `Box ${String.fromCharCode(65 + boxTypes.length)}`,
      l: 20, w: 20, h: 20, qty: 0,
    }]);
  };
  const removeBoxType = (i) => setBoxTypes(boxTypes.filter((_, idx) => idx !== i));
  const updateBoxType = (i, field, value) => {
    setBoxTypes(boxTypes.map((bt, idx) => idx === i ? { ...bt, [field]: value } : bt));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
        body { margin: 0; }
        .grid-bg {
          background-image:
            linear-gradient(rgba(77, 208, 225, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(77, 208, 225, 0.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="range"] { -webkit-appearance: none; background: transparent; }
        input[type="range"]::-webkit-slider-runnable-track { height: 2px; background: rgba(77, 208, 225, 0.3); }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 14px; height: 14px;
          background: #4dd0e1; border-radius: 50%; margin-top: -6px; cursor: pointer;
        }
      `}</style>

      <div className="grid-bg min-h-screen">
        <header className="border-b border-cyan-500/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-amber-400 animate-pulse" />
            <h1 className="text-xs tracking-[0.4em] uppercase text-slate-300">
              Container · Packing · Calculator
            </h1>
          </div>
          <div className="flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase">
            {['cm', 'in', 'mm', 'm'].map(u => (
              <button key={u} onClick={() => setUnit(u)}
                className={`px-3 py-1.5 transition ${unit === u ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-slate-500 hover:text-cyan-300'}`}>
                {u}
              </button>
            ))}
          </div>
        </header>

        <div className="grid lg:grid-cols-[440px_1fr] gap-0 lg:min-h-[calc(100vh-65px)]">
          <aside className="order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-cyan-500/20 p-6 space-y-6 bg-slate-950/40 lg:overflow-y-auto lg:max-h-[calc(100vh-65px)]">
            {visibleBoxesControl && (
              <section className="lg:hidden">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-px bg-cyan-400" />
                  <h2 className="text-[10px] tracking-[0.3em] uppercase text-cyan-300">Visible Boxes</h2>
                  <div className="flex-1 h-px bg-cyan-500/20" />
                </div>
                {visibleBoxesControl}
              </section>
            )}

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-px bg-cyan-400" />
                <h2 className="text-[10px] tracking-[0.3em] uppercase text-cyan-300">Container</h2>
                <div className="flex-1 h-px bg-cyan-500/20" />
                <span className="text-[10px] text-slate-500 font-mono">01</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FieldWithLabel label="Length" value={container.L} onChange={(v) => setContainer({...container, L: v})} unit={unit} />
                <FieldWithLabel label="Width" value={container.W} onChange={(v) => setContainer({...container, W: v})} unit={unit} />
                <FieldWithLabel label="Height" value={container.H} onChange={(v) => setContainer({...container, H: v})} unit={unit} />
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-px bg-amber-400" />
                <h2 className="text-[10px] tracking-[0.3em] uppercase text-amber-300">Box Types</h2>
                <div className="flex-1 h-px bg-amber-500/20" />
                <span className="text-[10px] text-slate-500 font-mono">02</span>
              </div>

              <div className="grid grid-cols-[24px_1fr_44px_44px_44px_96px_28px] gap-1.5 mb-2 text-[9px] tracking-[0.15em] uppercase text-slate-500">
                <div></div>
                <div>Name</div>
                <div className="text-center">L</div>
                <div className="text-center">W</div>
                <div className="text-center">H</div>
                <div className="text-center">Qty</div>
                <div></div>
              </div>

              <div className="space-y-2">
                {boxTypes.map((bt, i) => {
                  const c = colorFor(i);
                  const placedCount = result.counts[i] || 0;
                  const wasSkipped = result.skippedTypeIds.includes(i);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="grid grid-cols-[24px_1fr_44px_44px_44px_96px_28px] gap-1.5 items-center">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: c.css }} />
                        <input
                          type="text" value={bt.name}
                          onChange={(e) => updateBoxType(i, 'name', e.target.value)}
                          className="w-full bg-slate-950/60 border border-cyan-500/20 px-2 py-1.5 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none transition"
                        />
                        <NumField value={bt.l} onChange={(v) => updateBoxType(i, 'l', v)} />
                        <NumField value={bt.w} onChange={(v) => updateBoxType(i, 'w', v)} />
                        <NumField value={bt.h} onChange={(v) => updateBoxType(i, 'h', v)} />
                        <QtyStepper
                          value={bt.qty}
                          onChange={(v) => updateBoxType(i, 'qty', v)}
                        />
                        <button
                          onClick={() => removeBoxType(i)}
                          disabled={boxTypes.length === 1}
                          className="text-slate-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed text-base leading-none"
                          title="Remove"
                        >×</button>
                      </div>
                      <div className="grid grid-cols-[24px_1fr] gap-1.5">
                        <div></div>
                        <div className="text-[9px] font-mono text-slate-500 flex items-center justify-between pr-2">
                          <span>
                            Packed: <span className="text-emerald-400">{placedCount}</span>
                            {bt.qty > 0 && <span className="text-slate-600"> / {bt.qty}</span>}
                          </span>
                          {wasSkipped && bt.qty > 0 && <span className="text-red-400/80">Didn't all fit</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={addBoxType}
                className="mt-3 w-full border border-dashed border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/5 text-amber-300/70 hover:text-amber-300 text-[10px] tracking-[0.2em] uppercase py-2 transition"
              >
                + Add box type
              </button>

              <div className="text-[9px] text-slate-500 mt-2 leading-relaxed">
                Qty = how many of this type to pack. Use <span className="text-slate-300">−</span> / <span className="text-slate-300">+</span> or type a value. <span className="text-slate-300">0</span> means none.
              </div>
            </section>

            {shortages.length > 0 && (
              <div role="alert" className="border border-red-500/40 bg-red-950/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 bg-red-400 animate-pulse" />
                  <div className="text-[10px] tracking-[0.3em] uppercase text-red-300 font-bold">
                    Doesn't fit
                  </div>
                </div>
                <div className="text-[10px] text-red-100/80 mb-2 leading-relaxed">
                  The container is too small to hold every box you requested:
                </div>
                <ul className="space-y-1 text-[10px] font-mono">
                  {shortages.map(s => (
                    <li key={s.idx} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 shrink-0" style={{ backgroundColor: colorFor(s.idx).css }} />
                        <span className="text-slate-200 truncate">{s.name}</span>
                      </span>
                      <span className="text-red-300 tabular-nums shrink-0">
                        {s.packed} / {s.requested}
                        <span className="text-red-400/70"> (−{s.short})</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="text-[9px] text-red-200/60 mt-2 leading-relaxed">
                  Reduce a Qty, shrink the box, or enlarge the container.
                </div>
              </div>
            )}

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-px bg-emerald-400" />
                <h2 className="text-[10px] tracking-[0.3em] uppercase text-emerald-300">Output</h2>
                <div className="flex-1 h-px bg-emerald-500/20" />
                <span className="text-[10px] text-slate-500 font-mono">03</span>
              </div>

              <div className="border border-emerald-400/30 bg-emerald-950/20 p-5 mb-4">
                <div className="text-[10px] tracking-[0.3em] uppercase text-emerald-300/70 mb-1">Total Boxes</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold text-emerald-300 tabular-nums">
                    {result.total.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">units · {result.utilization.toFixed(1)}% full</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-cyan-500/10">
                <Stat label="Used Vol." value={formatVolume(result.usedVol, unit)} small />
                <Stat label="Container Vol." value={formatVolume(result.containerVol, unit)} small />
              </div>

              {visibleBoxesControl && (
                <div className="mt-5 hidden lg:block">
                  {visibleBoxesControl}
                </div>
              )}
            </section>

            <div className="text-[9px] text-slate-600 leading-relaxed pt-4 border-t border-slate-800">
              First-fit-decreasing heuristic: largest boxes placed first, all 6 rotations tested per free space. Strong approximation — 3D bin packing is NP-hard, no exact answer in real time.
            </div>
          </aside>

          <main className="order-1 lg:order-2 relative bg-slate-950 h-[70vh] lg:h-auto min-h-[320px]">
            <div className="absolute top-4 left-4 z-10 text-[10px] tracking-[0.3em] uppercase text-slate-500 font-mono">
              <div>3D · Viewport</div>
              <div className="text-slate-600 mt-1 normal-case tracking-wider">Drag to rotate · Scroll / pinch to zoom</div>
            </div>

            <div className="absolute top-4 right-4 z-10 space-y-1 text-[10px] tracking-[0.15em] uppercase font-mono">
              {boxTypes.map((bt, i) => {
                if ((result.counts[i] || 0) === 0) return null;
                return (
                  <div key={i} className="flex items-center gap-2 justify-end">
                    <span className="text-slate-400">{bt.name}</span>
                    <span className="text-slate-200 tabular-nums">×{result.counts[i]}</span>
                    <div className="w-3 h-3" style={{ backgroundColor: colorFor(i).css }} />
                  </div>
                );
              })}
            </div>

            {shortages.length > 0 && (
              <div
                role="alert"
                className="absolute bottom-4 left-4 right-4 z-10 border border-red-500/50 bg-red-950/80 backdrop-blur-sm px-3 py-2 text-[10px] font-mono"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-red-400 animate-pulse shrink-0" />
                  <span className="tracking-[0.25em] uppercase text-red-300 font-bold">
                    {shortages.length === 1 ? '1 box type' : `${shortages.length} box types`} didn't all fit
                  </span>
                </div>
                <div className="text-red-100/80 leading-relaxed">
                  {shortages.map((s, i) => (
                    <span key={s.idx}>
                      {i > 0 && <span className="text-red-400/40"> · </span>}
                      <span className="text-slate-200">{s.name}</span>
                      <span className="text-red-300"> −{s.short}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <PackingViewer
              container={container}
              placed={result.placed}
              visibleCount={visibleCount}
            />

            {result.total === 0 && (() => {
              const anyRequested = boxTypes.some(bt => bt.qty > 0 && bt.l > 0 && bt.w > 0 && bt.h > 0);
              return (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-amber-400 text-xs tracking-[0.3em] uppercase mb-2">
                      {anyRequested ? 'No fit' : 'Empty container'}
                    </div>
                    <div className="text-slate-500 text-xs">
                      {anyRequested ? 'Box dimensions exceed container' : 'Set a Qty above to start packing'}
                    </div>
                  </div>
                </div>
              );
            })()}
          </main>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, small }) {
  return (
    <div className="bg-slate-950/80 p-3">
      <div className="text-[9px] tracking-[0.2em] uppercase text-slate-500 mb-1">{label}</div>
      <div className={`${small ? 'text-xs' : 'text-base'} text-slate-100 font-mono tabular-nums`}>{value}</div>
    </div>
  );
}

function formatVolume(v, unit) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M ${unit}³`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K ${unit}³`;
  return `${v.toFixed(0)} ${unit}³`;
}
