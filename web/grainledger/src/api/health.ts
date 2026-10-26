/**
 * GrainLedger Backend Health Check
 * Validates actual connectivity to the backend server (Port 5080)
 */

let inFlightCheck: Promise<boolean> | null = null;

/**
 * Checks connection to the backend server.
 * Returns true if server is reachable and healthy, false otherwise.
 */
export async function checkBackendHealth(): Promise<boolean> {
  // If the browser is completely offline, no need to attempt HTTP
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  // Deduplicate concurrent checks into a single promise
  if (inFlightCheck) {
    return inFlightCheck;
  }

  inFlightCheck = (async () => {
    const checkEndpoint = async (url: string, timeoutMs: number): Promise<boolean> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeoutId);

        // Gateway / proxy connection failures (502 Bad Gateway, 503, 504)
        if (response.status >= 502 && response.status <= 504) {
          return false;
        }

        // Avoid false-positive SPA index.html fallback
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          return false;
        }

        return response.ok;
      } catch {
        clearTimeout(timeoutId);
        return false;
      }
    };

    // Primary check: /api/health
    const apiOk = await checkEndpoint('/api/health', 3500);
    if (apiOk) {
      return true;
    }

    // Fallback check: /health directly
    const directOk = await checkEndpoint('/health', 2500);
    return directOk;
  })().finally(() => {
    inFlightCheck = null;
  });

  return inFlightCheck;
}
