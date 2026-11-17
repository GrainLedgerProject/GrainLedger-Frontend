import { normalizeApiError, type ApiError } from '../../services/api/errors';
import { farmerErrors, type Farmer, type FarmerCommand, type FarmerForm, type createFarmerService } from './farmers-api';

type ActionState = { status: 'idle' | 'saving' | 'success' | 'error'; kind: FarmerCommand['kind'] | null; error: ApiError | null; cacheWarning: boolean };
export function createFarmerActions(service: Pick<ReturnType<typeof createFarmerService>, 'execute'>, uuid: () => string, now = () => new Date().toISOString()) {
  const initial: ActionState = { status: 'idle', kind: null, error: null, cacheWarning: false };
  let state = initial;
  let sequence = 0;
  let pending: Promise<boolean> | null = null;
  let controller: AbortController | undefined;
  let saved: { fingerprint: string; command: FarmerCommand } | undefined;
  const listeners = new Set<() => void>();
  const publish = (value: ActionState) => { state = value; listeners.forEach((listener) => listener()); };
  function run(command: FarmerCommand) {
    if (pending) return pending;
    const expected = ++sequence;
    controller = new AbortController();
    const signal = controller.signal;
    publish({ ...initial, status: 'saving', kind: command.kind });
    const task = (async () => {
      try {
        const result = await service.execute(command, signal);
        if (expected !== sequence || signal.aborted) return false;
        saved = undefined;
        publish({ ...initial, status: 'success', kind: command.kind, cacheWarning: result.cacheWarning });
        return true;
      } catch (failure) {
        if (expected === sequence && !signal.aborted) publish({ ...initial, status: 'error', kind: command.kind, error: normalizeApiError(failure) });
        return false;
      }
    })();
    pending = task;
    void task.finally(() => { if (expected === sequence) { pending = null; controller = undefined; } });
    return task;
  }
  return {
    save(form: FarmerForm, farmer: Farmer | null) {
      if (pending) return pending;
      const errors = farmerErrors(form);
      if (errors.code || errors.name) return Promise.resolve(false);
      const data = { code: form.code.trim(), name: form.name.trim(), contact: form.contact.trim() };
      const fingerprint = JSON.stringify([farmer?.id ?? null, farmer?.version ?? null, data]);
      try {
        if (saved?.fingerprint !== fingerprint) saved = { fingerprint, command: farmer
          ? { kind: 'update', id: farmer.id, data: { ...data, contact: data.contact || null, expectedVersion: farmer.version || 1 } }
          : { kind: 'create', data: { deviceId: 'grainledger-mobile', clientOperationId: uuid(), capturedAt: now(), payloadSchemaVersion: 2,
            payload: { entityId: uuid(), ...data } } } };
      } catch (failure) {
        publish({ ...initial, status: 'error', error: normalizeApiError(failure) });
        return Promise.resolve(false);
      }
      return run(saved.command);
    },
    remove: (farmer: Farmer) => run({ kind: 'delete', id: farmer.id, data: { version: farmer.version || 1 } }),
    reset() {
      sequence++; controller?.abort(); pending = null; saved = undefined; publish(initial);
    },
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state, getServerSnapshot: () => initial,
  };
}
