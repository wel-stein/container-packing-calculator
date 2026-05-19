import { packBoxes } from './packing';

self.onmessage = (e) => {
  const { reqId, container, boxTypes } = e.data;
  try {
    const result = packBoxes(container, boxTypes);
    self.postMessage({ reqId, result });
  } catch (err) {
    self.postMessage({ reqId, error: String(err && err.message || err) });
  }
};
