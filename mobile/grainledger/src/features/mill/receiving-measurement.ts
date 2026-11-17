// Source: web ReceivingTasksPage.handleSubmitMeasurement and its number inputs.
import { Decimal } from 'decimal.js';
import type { AuthUser } from '../auth/contracts';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError, normalizeApiError } from '../../services/api/errors';
import { readReceivingId } from '../../navigation/mill-route';
import { isOperator, type ReceivingTaskDetail } from './receiving-api';

export interface MeasurementFields { weight: string; moisture: string }
type FieldError = 'required' | 'number' | 'step';
export type MeasurementErrors = Partial<Record<keyof MeasurementFields, FieldError>>;
export type MeasurementContext = Pick<ReceivingTaskDetail, 'id' | 'facilityId' | 'receivingVersion' | 'actualTotalKg'>;
export function canRecordMeasurement(user: AuthUser | null, task: MeasurementContext) {
  // Source visibility is operator/admin + no actual mass, not a guessed status allowlist.
  return Boolean(user?.isActive && isOperator(user.normalizedRole) && !task.actualTotalKg);
}
function readNumber(input: string, decimals: number): { value?: string; error?: FieldError } {
  const normalized = input.trim().replace(',', '.');
  if (!normalized) return { error: 'required' };
  // Match finite number-input values; Decimal owns precision, never binary mass arithmetic.
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized) || !Number.isFinite(Number(normalized))) return { error: 'number' };
  const value = new Decimal(normalized);
  if (!value.isFinite()) return { error: 'number' };
  if (value.decimalPlaces() > decimals) return { error: 'step' };
  return { value: value.toFixed() };
}
export function validateMeasurement(fields: MeasurementFields) {
  const weight = readNumber(fields.weight, 2); // HTML step=0.01, no min/max in source.
  const moisture = readNumber(fields.moisture, 1); // HTML step=0.1, no invented 0..100 policy.
  const errors: MeasurementErrors = {};
  if (weight.error) errors.weight = weight.error;
  if (moisture.error) errors.moisture = moisture.error;
  return { errors, values: weight.value !== undefined && moisture.value !== undefined ? { weight: weight.value, moisture: moisture.value } : null };
}
export interface ReceivingMeasurementRequest {
  operationId: string; expectedReceivingVersion: number; capturedAt: string; observations: string;
  items: { procurementItemId: string; measuredValue: string; measuredUnit: 'KG' }[];
  grossWeightKg: string; tareWeightKg: '0.000'; netWeightKg: string; moisturePercent: string; measuredAt: string;
}
export function createMeasurementService(api: ApiClient, user: AuthUser, isCurrent = () => true) {
  return {
    async record(task: MeasurementContext, body: ReceivingMeasurementRequest, signal?: AbortSignal): Promise<void> {
      if (!user.isActive || !isOperator(user.normalizedRole)) throw new ApiError('Measurement access denied.', 403, 'http');
      if (!isCurrent() || signal?.aborted) throw new ApiError('The operation was cancelled.', 0, 'cancelled');
      if (!readReceivingId(task.id) || !task.facilityId || !Number.isSafeInteger(task.receivingVersion) || task.receivingVersion < 0 || body.expectedReceivingVersion !== task.receivingVersion) {
        throw new ApiError('Invalid receiving context.', 0, 'contract');
      }
      if (!canRecordMeasurement(user, task)) throw new ApiError('This task already has a measurement. Reload it.', 409, 'http');
      await api.request(`/api/ledger/receiving/${encodeURIComponent(task.id)}/measurements`, { method: 'POST', data: body, signal });
      if (!isCurrent() || signal?.aborted) throw new ApiError('The operation was cancelled.', 0, 'cancelled');
      // Source ignores the response body; an accepted measurement is not a manager approval.
    },
  };
}

interface MeasurementState {
  status: 'idle' | 'invalid' | 'saving' | 'success' | 'error'; errors: MeasurementErrors; error: ApiError | null;
}
export function createMeasurementAction(service: ReturnType<typeof createMeasurementService>, context: MeasurementContext,
  uuid: () => string, now = () => new Date().toISOString()) {
  const task = { ...context };
  const initial: MeasurementState = { status: 'idle', errors: {}, error: null };
  let state = initial;
  let sequence = 0;
  let controller: AbortController | undefined;
  let pending: Promise<boolean> | null = null;
  let saved: { fingerprint: string; body: ReceivingMeasurementRequest } | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: MeasurementState) => { state = next; listeners.forEach((listener) => listener()); };
  return {
    submit(fields: MeasurementFields) {
      if (pending) return pending;
      if (state.status === 'success') return Promise.resolve(false);
      const parsed = validateMeasurement(fields);
      if (!parsed.values) { publish({ status: 'invalid', errors: parsed.errors, error: null }); return Promise.resolve(false); }
      const expected = ++sequence;
      controller = new AbortController();
      const signal = controller.signal;
      publish({ status: 'saving', errors: {}, error: null });
      const run = (async () => {
        try {
          const { weight, moisture } = parsed.values!;
          const fingerprint = JSON.stringify([weight, moisture]);
          if (saved?.fingerprint !== fingerprint) saved = { fingerprint, body: {
            operationId: uuid(), expectedReceivingVersion: task.receivingVersion, capturedAt: now(),
            observations: `Số cân thực tế bến nhà máy: ${weight} kg, độ ẩm: ${moisture}%`,
            // Preserve web contract: task ID here. Do not invent per-line allocation.
            items: [{ procurementItemId: task.id, measuredValue: weight, measuredUnit: 'KG' }],
            grossWeightKg: weight, tareWeightKg: '0.000', netWeightKg: weight, moisturePercent: moisture, measuredAt: now(),
          } };
          await service.record(task, saved.body, signal);
          if (expected !== sequence || signal.aborted) return false;
          saved = undefined; publish({ status: 'success', errors: {}, error: null }); return true;
        } catch (failure) {
          if (expected === sequence && !signal.aborted) publish({ status: 'error', errors: {}, error: normalizeApiError(failure) });
          return false;
        }
      })();
      pending = run;
      void run.finally(() => { if (expected === sequence) { pending = null; controller = undefined; } });
      return run;
    },
    reset() { sequence++; controller?.abort(); pending = null; saved = undefined; publish(initial); },
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state, getServerSnapshot: () => initial,
  };
}
