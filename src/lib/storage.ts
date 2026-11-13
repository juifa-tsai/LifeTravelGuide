import { useState } from 'react';
export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`nagoya:${key}`);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== typeof fallback || Array.isArray(parsed) !== Array.isArray(fallback)) return fallback;
    return parsed as T;
  }
  catch { return fallback; }
}
export function writeStored(key: string, value: unknown) {
  try { localStorage.setItem(`nagoya:${key}`, JSON.stringify(value)); } catch { /* Safari private mode / full storage: keep session state. */ }
}
export function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStored(key, fallback));
  function update(next: T | ((previous: T) => T)) {
    setValue(previous => { const result = typeof next === 'function' ? (next as (p: T) => T)(previous) : next; writeStored(key, result); return result; });
  }
  return [value, update] as const;
}
