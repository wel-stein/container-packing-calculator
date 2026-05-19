import { useEffect, useRef, useState } from 'react';

const EMPTY_RESULT = {
  placed: [],
  counts: [],
  total: 0,
  utilization: 0,
  containerVol: 0,
  usedVol: 0,
  skippedTypeIds: [],
};

export function usePacking(container, boxTypes, delay = 200) {
  const [result, setResult] = useState(EMPTY_RESULT);
  const [packing, setPacking] = useState(false);
  const workerRef = useRef(null);
  const timerRef = useRef(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const w = new Worker(new URL('./packing.worker.js', import.meta.url), { type: 'module' });
    workerRef.current = w;
    w.onmessage = (e) => {
      if (e.data.reqId !== reqIdRef.current) return;
      if (e.data.result) setResult(e.data.result);
      setPacking(false);
    };
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    setPacking(true);
    timerRef.current = setTimeout(() => {
      reqIdRef.current += 1;
      workerRef.current?.postMessage({
        reqId: reqIdRef.current,
        container,
        boxTypes,
      });
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [container, boxTypes, delay]);

  return { result, packing };
}
