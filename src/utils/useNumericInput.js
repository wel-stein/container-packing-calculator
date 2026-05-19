import { useEffect, useState } from 'react';

// Keeps a raw string in local state so partial input ("", "0.", "-")
// doesn't snap the committed numeric value to 0 mid-typing. Commits
// on every change that parses cleanly; intermediate states are kept
// visible without firing onChange. On blur, an unparseable raw is
// restored to the last committed value.
export function useNumericInput(value, onChange, { integer = false } = {}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed) || parsed !== value) {
      setRaw(String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e) => {
    const s = e.target.value;
    setRaw(s);
    if (s === '' || s === '-' || s === '.' || s === '-.') return;
    const n = parseFloat(s);
    if (Number.isNaN(n)) return;
    onChange(integer ? Math.max(0, Math.floor(n)) : n);
  };

  const handleBlur = () => {
    const n = parseFloat(raw);
    if (Number.isNaN(n) || raw === '' || raw === '-' || raw === '.' || raw === '-.') {
      setRaw(String(value));
    }
  };

  return { value: raw, onChange: handleChange, onBlur: handleBlur };
}
