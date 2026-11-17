import { normalizeApiError, type ApiError } from '../services/api/errors';

export type AsyncState<T> =
  | { status: 'idle' | 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: ApiError };

/** One resource, latest request wins. No global pending flag or retained data across identities. */
export function createAsyncResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const initial: AsyncState<T> = { status: 'idle', data: null, error: null };
  let state: AsyncState<T> = initial;
  let sequence = 0;
  let controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: AsyncState<T>) => { state = next; listeners.forEach((listener) => listener()); };

  async function run() {
    const expected = ++sequence;
    controller?.abort();
    const current = new AbortController();
    controller = current;
    publish({ status: 'loading', data: null, error: null });
    try {
      const data = await load(current.signal);
      if (expected === sequence && !current.signal.aborted) publish({ status: 'success', data, error: null });
    } catch (failure) {
      if (expected !== sequence) return;
      const error = normalizeApiError(failure);
      publish(error.code === 'cancelled' ? initial : { status: 'error', data: null, error });
    } finally { if (expected === sequence) controller = undefined; }
  }
  function reset() {
    sequence++;
    controller?.abort();
    controller = undefined;
    publish(initial);
  }
  return { run, reset, getSnapshot: () => state, getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
}
