/**
 * Browser storage, always wrapped: it can be missing, full, or blocked in a
 * private window, and the app must work the same without it.
 */
const PREFIX = "insert-rhyme:";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage is off or full: the setting just won't be remembered.
  }
}
