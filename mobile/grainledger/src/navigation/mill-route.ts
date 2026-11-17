/** A decoded receiving identifier, never a path or pre-encoded URL segment. */
export function readReceivingId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' && value !== '.' &&
    !value.includes('..') && !/[\u0000-\u001f\u007f/\\%]/.test(value) ? value : null;
}

/** Allow mounted receiving routes as authenticated return destinations. */
export function safeReceivingPath(value: unknown): '/mill/receiving' | `/mill/receiving/${string}` | null {
  if (typeof value !== 'string') return null;
  if (value === '/mill/receiving') return value;
  if (!/^\/mill\/receiving\/[^/?#\\]+$/.test(value)) return null;
  const segment = value.slice('/mill/receiving/'.length);
  try {
    const id = readReceivingId(decodeURIComponent(segment));
    return id !== null && encodeURIComponent(id) === segment ? `/mill/receiving/${segment}` : null;
  } catch { return null; }
}
