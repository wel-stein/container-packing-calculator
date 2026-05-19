import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { usePacking } from './usePacking';
import { colorFor } from './colors';
import { formatVolume } from './utils/format';
import NumField from './components/NumField';
import QtyStepper from './components/QtyStepper';
import FieldWithLabel from './components/FieldWithLabel';
import Stat from './components/Stat';

const PackingViewer = lazy(() => import('./PackingViewer'));

let nextBoxTypeId = 0;
const newId = () => `bt-${++nextBoxTypeId}`;

const DEFAULT_BOX_TYPES = [
  { id: newId(), name: 'Box A', l: 40, w: 30, h: 25, qty: 0 },
  { id: newId(), name: 'Box B', l: 30, w: 20, h: 20, qty: 0 },
  { id: newId(), name: 'Box C', l: 20, w: 15, h: 15, qty: 0 },
];

export default function App() {
  const [unit, setUnit] = useState('cm');
  const [container, setContainer] = useState({ L: 120, W: 80, H: 100 });
  const [boxTypes, setBoxTypes] = useState(DEFAULT_BOX_TYPES);
  const [showAll, setShowAll] = useState(true);
  const [sliceCount, setSliceCount] = useState(0);

  const { result, packing } = usePacking(container, boxTypes);
  const visibleCount = showAll ? result.total : Math.min(sliceCount, result.total);

  const shortages = useMemo(() => {
    return boxTypes
      .map((bt, idx) => {
        const requested = Math.max(0, Math.floor(bt.qty) || 0);
        const packed = result.counts[idx] || 0;
        const short = requested - packed;
        return { idx, id: bt.id, name: bt.name, requested, packed, short };
      })
      .filter(s => s.short > 0);
  }, [boxTypes, result.counts]);

  useEffect(() => { setSliceCount(result.total); }, [result.total]);

  const addBoxType = () => {
    setBoxTypes([...boxTypes, {
      id: newId(),
      name: `Box ${String.fromCharCode(65 + boxTypes.length)}`,
      l: 20, w: 20, h: 20, qty: 0,
    }]);
  };
  const removeBoxType = (id) => setBoxTypes(boxTypes.filter(bt => bt.id !== id));
  const updateBoxType = (id, field, value) => {
    setBoxTypes(boxTypes.map(bt => bt.id === id ? { ...bt, [field]: value } : bt));
  };

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
                    <div key={bt.id} className="space-y-1">
                      <div className="grid grid-cols-[24px_1fr_44px_44px_44px_96px_28px] gap-1.5 items-center">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: c.css }} />
                        <input
                          type="text" value={bt.name}
                          aria-label={`Name for ${bt.name}`}
                          onChange={(e) => updateBoxType(bt.id, 'name', e.target.value)}
                          className="w-full bg-slate-950/60 border border-cyan-500/20 px-2 py-1.5 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none transition"
                        />
                        <NumField value={bt.l} onChange={(v) => updateBoxType(bt.id, 'l', v)} ariaLabel={`Length for ${bt.name}`} />
                        <NumField value={bt.w} onChange={(v) => updateBoxType(bt.id, 'w', v)} ariaLabel={`Width for ${bt.name}`} />
                        <NumField value={bt.h} onChange={(v) => updateBoxType(bt.id, 'h', v)} ariaLabel={`Height for ${bt.name}`} />
                        <QtyStepper
                          value={bt.qty}
                          onChange={(v) => updateBoxType(bt.id, 'qty', v)}
                          ariaLabel={`Quantity for ${bt.name}`}
                        />
                        <button
                          onClick={() => removeBoxType(bt.id)}
                          disabled={boxTypes.length === 1}
                          className="text-slate-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed text-base leading-none"
                          aria-label={`Remove ${bt.name}`}
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
                    <li key={s.id} className="flex items-center justify-between gap-2">
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
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-emerald-300/70">Total Boxes</div>
                  {packing && (
                    <div className="flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase text-amber-300/80">
                      <div className="w-1.5 h-1.5 bg-amber-400 animate-pulse" />
                      Packing…
                    </div>
                  )}
                </div>
                <div className={`flex items-baseline gap-3 transition-opacity ${packing ? 'opacity-60' : ''}`}>
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
            <div className="absolute top-4 left-4 z-10 text-[10px] tracking-[0.3em] uppercase text-slate-500 font-mono pointer-events-none">
              <div>3D · Viewport</div>
              <div className="text-slate-600 mt-1 normal-case tracking-wider">Drag to rotate · Scroll / pinch to zoom</div>
            </div>

            <div className="absolute top-4 right-4 z-10 space-y-1 text-[10px] tracking-[0.15em] uppercase font-mono pointer-events-none">
              {boxTypes.map((bt, i) => {
                if ((result.counts[i] || 0) === 0) return null;
                return (
                  <div key={bt.id} className="flex items-center gap-2 justify-end">
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
                className="absolute bottom-4 left-4 right-4 z-10 border border-red-500/50 bg-red-950/80 backdrop-blur-sm px-3 py-2 text-[10px] font-mono pointer-events-none"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-red-400 animate-pulse shrink-0" />
                  <span className="tracking-[0.25em] uppercase text-red-300 font-bold">
                    {shortages.length === 1 ? '1 box type' : `${shortages.length} box types`} didn't all fit
                  </span>
                </div>
                <div className="text-red-100/80 leading-relaxed">
                  {shortages.map((s, i) => (
                    <span key={s.id}>
                      {i > 0 && <span className="text-red-400/40"> · </span>}
                      <span className="text-slate-200">{s.name}</span>
                      <span className="text-red-300"> −{s.short}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Suspense fallback={
              <div className="absolute inset-0 flex items-center justify-center text-[10px] tracking-[0.3em] uppercase text-slate-500 font-mono pointer-events-none">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-400 animate-pulse" />
                  Loading 3D viewport…
                </div>
              </div>
            }>
              <PackingViewer
                container={container}
                placed={result.placed}
                visibleCount={visibleCount}
              />
            </Suspense>

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
