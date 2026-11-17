export type GovernancePath = '/events' | `/events/${string}/${string}` | '/risk/holds' | '/risk/holds/new' | '/export/plans/pending' | `/export/plans/${string}/review`;
function canonical(segment: string) {
  try { const decoded = decodeURIComponent(segment); return Boolean(decoded.trim()) && decoded !== '.' && !decoded.includes('..') && !/[/\\%\u0000-\u001f\u007f]/.test(decoded) && encodeURIComponent(decoded) === segment; }
  catch { return false; }
}
export function safeGovernancePath(value: unknown): GovernancePath | null {
  if (typeof value !== 'string') return null;
  if (['/events', '/risk/holds', '/risk/holds/new', '/export/plans/pending'].includes(value)) return value as GovernancePath;
  const review = /^\/export\/plans\/([^/?#\\]+)\/review$/.exec(value);
  if (review && canonical(review[1])) return value as GovernancePath;
  const event = /^\/events\/(event|posting|lot|operation)\/([^/?#\\]+)$/.exec(value);
  return event && canonical(event[2]) ? value as GovernancePath : null;
}
