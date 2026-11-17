import { normalizeApiError, type ApiError } from '../../services/api/errors';

/** One user-driven command at a time. An unchanged explicit retry reuses its operation IDs and timestamps. */
export function createComplianceAction<T>(execute: (command: T, signal: AbortSignal) => Promise<unknown>) {
  const initial = { status: 'idle' as 'idle' | 'saving' | 'success' | 'error', error: null as ApiError | null, result: null as unknown };
  let state = initial;
  let sequence = 0;
  let pending: Promise<boolean> | null = null;
  let abort: AbortController | undefined;
  let saved: { key: string; command: T } | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: typeof state) => { state = next; listeners.forEach((fn) => fn()); };
  return {
    submit(key: string, build: () => T) {
      if (pending) return pending;
      if (state.status === 'success') return Promise.resolve(false);
      const ticket = ++sequence;
      abort = new AbortController();
      const signal = abort.signal;
      publish({ status: 'saving', error: null, result: null });
      const task = (async () => {
        try {
          if (saved?.key !== key) saved = { key, command: build() };
          const result = await execute(saved.command, signal);
          if (ticket !== sequence || signal.aborted) return false;
          saved = undefined;
          publish({ status: 'success', error: null, result });
          return true;
        } catch (failure) {
          if (ticket === sequence && !signal.aborted) publish({ status: 'error', error: normalizeApiError(failure), result: null });
          return false;
        }
      })();
      pending = task;
      void task.finally(() => { if (ticket === sequence) { pending = null; abort = undefined; } });
      return task;
    },
    reset() { sequence++; abort?.abort(); pending = null; saved = undefined; publish(initial); },
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    getSnapshot: () => state, getServerSnapshot: () => initial,
  };
}
