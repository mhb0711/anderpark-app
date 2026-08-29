import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'anderpark-require-task-note';

function load(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  // Default true — preserves the original "write what you did" behavior
  // until someone explicitly opts into the simpler one-tap flow.
  return raw === null ? true : raw === 'true';
}

// Module-level so every component reading this stays in sync without a
// shared provider — same pattern as lib/sound.ts's settings.
let requireNote = load();
const listeners = new Set<() => void>();

export function setRequireTaskNote(value: boolean) {
  requireNote = value;
  localStorage.setItem(STORAGE_KEY, String(value));
  listeners.forEach((fn) => fn());
}

export function useRequireTaskNote() {
  const [value, setValue] = useState(requireNote);
  useEffect(() => {
    const listener = () => setValue(requireNote);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  const setter = useCallback((v: boolean) => setRequireTaskNote(v), []);
  return { requireNote: value, setRequireTaskNote: setter };
}
