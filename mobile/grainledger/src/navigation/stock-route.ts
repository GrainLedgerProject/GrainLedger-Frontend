/** A decoded lot identifier, never a path or pre-encoded URL segment. */
export function readLotId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' && value !== '.' &&
    !value.includes('..') && !/[\u0000-\u001f\u007f/\\%]/.test(value) ? value : null;
}

/** Allow only the mounted Stock detail route as an authenticated return destination. */
export function safeStockDetailPath(value: unknown): `/stock/lots/${string}` | null {
  if (typeof value !== 'string' || !/^\/stock\/lots\/[^/?#\\]+$/.test(value)) return null;
  const segment = value.slice('/stock/lots/'.length);
  try {
    const id = readLotId(decodeURIComponent(segment));
    return id !== null && encodeURIComponent(id) === segment ? `/stock/lots/${segment}` : null;
  } catch { return null; }
}
