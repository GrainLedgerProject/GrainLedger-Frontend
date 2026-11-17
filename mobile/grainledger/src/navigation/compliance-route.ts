export type CompliancePath = '/compliance/lab-samples' | '/compliance/lab-samples/new' | '/compliance/lab-results' | `/compliance/lab-results/${string}` | '/compliance/safety-margin' | '/compliance/residue-profiles';
/** Only mounted destinations, canonical percent-encoding and a single opaque report identifier. */
export function safeCompliancePath(value: unknown): CompliancePath | null {
  if (typeof value !== 'string') return null;
  if (['/compliance/lab-samples', '/compliance/lab-samples/new', '/compliance/lab-results', '/compliance/safety-margin', '/compliance/residue-profiles'].includes(value)) return value as CompliancePath;
  if (!/^\/compliance\/lab-results\/[^/?#\\]+$/.test(value)) return null;
  const segment = value.slice('/compliance/lab-results/'.length);
  try {
    const id = decodeURIComponent(segment);
    if (!id.trim() || id === '.' || id.includes('..') || /[/\\%\u0000-\u001f\u007f]/.test(id) || encodeURIComponent(id) !== segment) return null;
    return value as CompliancePath;
  } catch { return null; }
}
