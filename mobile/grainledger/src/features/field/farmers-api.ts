// Source: web FarmerRegistrationPage, api/procurement.ts, pwa/offlineCache and owner.
import { z } from 'zod';
import type { AuthUser } from '../auth/contracts';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError, normalizeApiError } from '../../services/api/errors';

export const farmerRoles = ['CUSTOMER_PROCUREMENT_OFFICER', 'MILL_ADMIN'] as const;
export const canManageFarmers = (user: AuthUser | null) => Boolean(user?.isActive && farmerRoles.some((role) => role === user.normalizedRole));
const farmerSchema = z.object({
  id: z.string().min(1), code: z.string(), name: z.string().min(1), contact: z.string().nullish(),
  version: z.number().int().nonnegative().optional(), totalPlots: z.number().int().nonnegative().nullish(),
  totalAreaHa: z.number().finite().nonnegative().nullish(),
});
export type Farmer = z.infer<typeof farmerSchema>;
export interface FarmerForm { code: string; name: string; contact: string }
export function farmerErrors(form: FarmerForm) {
  return { code: !form.code.trim(), name: !form.name.trim() };
}
export function parseFarmers(value: unknown): Farmer[] {
  const parsed = z.object({ items: z.array(farmerSchema) }).safeParse(Array.isArray(value) ? { items: value } : value);
  if (!parsed.success || new Set(parsed.data.items.map((item) => item.id)).size !== parsed.data.items.length) {
    throw new ApiError('Unsupported farmer response.', 0, 'contract');
  }
  return parsed.data.items;
}
export interface FarmerStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export interface FarmerCache { items: Farmer[]; updatedAt: string }
export function farmerCacheKey(origin: string, user: AuthUser) {
  // Tenant/user, backend and access identity are immutable for this cache instance.
  return `grainledger.farmers.v1:${JSON.stringify([origin, user.organizationId, user.id, user.normalizedRole, [...user.permissions].sort()])}`;
}
export function createFarmerCache(storage: FarmerStorage, key: string) {
  let queue: Promise<void> = Promise.resolve();
  function write(action: () => Promise<void>) {
    const task = queue.catch(() => {}).then(action);
    queue = task;
    return task;
  }
  return {
    async read(): Promise<FarmerCache | null> {
      const raw = await storage.getItem(key);
      if (raw === null) return null;
      const record = z.object({ schemaVersion: z.literal(1), updatedAt: z.string().datetime(), items: z.array(farmerSchema) }).safeParse(JSON.parse(raw));
      if (!record.success) throw new ApiError('Unsupported farmer cache.', 0, 'contract');
      return { items: parseFarmers(record.data.items), updatedAt: record.data.updatedAt };
    },
    save: (items: Farmer[], updatedAt: string) => write(() => storage.setItem(key, JSON.stringify({ schemaVersion: 1, items, updatedAt }))),
    clear: () => write(() => storage.removeItem(key)),
  };
}
export type FarmerCommand = { kind: 'create'; data: {
  deviceId: 'grainledger-mobile'; clientOperationId: string; capturedAt: string; payloadSchemaVersion: 2;
  payload: { entityId: string; code: string; name: string; contact: string };
} } | { kind: 'update'; id: string; data: { code: string; name: string; contact: string | null; expectedVersion: number } }
  | { kind: 'delete'; id: string; data: { version: number } };
export interface FarmerList { items: Farmer[]; source: 'server' | 'cache'; updatedAt: string; cacheWarning: boolean }

export function createFarmerService(api: ApiClient, user: AuthUser, cache: ReturnType<typeof createFarmerCache>, isCurrent = () => true) {
  let revision = 0;
  function check(signal?: AbortSignal) {
    if (!canManageFarmers(user)) throw new ApiError('Farmer access denied.', 403, 'http');
    if (!isCurrent() || signal?.aborted) throw new ApiError('The operation was cancelled.', 0, 'cancelled');
  }
  return {
    async list(search: string, signal?: AbortSignal): Promise<FarmerList> {
      check(signal);
      const expected = revision;
      let value: unknown;
      try { value = await api.request('/api/farmers', { query: { pageSize: 50, search: search || undefined }, signal }); }
      catch (failure) {
        check(signal);
        const error = normalizeApiError(failure);
        if (error.code !== 'network' && error.code !== 'timeout') throw error;
        let saved: FarmerCache | null;
        try { saved = await cache.read(); } catch { throw error; }
        check(signal);
        if (!saved) throw error;
        // Offline matching is explicitly limited to the last unfiltered, loaded page.
        const term = search.toLocaleLowerCase('vi');
        const items = saved.items.filter((item) => !term || `${item.name}\n${item.code}`.toLocaleLowerCase('vi').includes(term));
        return { items, source: 'cache', updatedAt: saved.updatedAt, cacheWarning: false };
      }
      check(signal);
      const items = parseFarmers(value);
      const updatedAt = new Date().toISOString();
      let cacheWarning = false;
      // Never overwrite the reference page with only the latest search results.
      if (!search && expected === revision) {
        try { await cache.save(items, updatedAt); } catch { cacheWarning = true; }
      }
      check(signal);
      return { items, source: 'server', updatedAt, cacheWarning };
    },
    async execute(command: FarmerCommand, signal?: AbortSignal) {
      check(signal);
      if (command.kind !== 'create' && (!command.id.trim() || command.id === '.' || command.id.includes('..') || /[/\\%\u0000-\u001f\u007f]/.test(command.id))) {
        throw new ApiError('Invalid farmer identifier.', 0, 'contract');
      }
      revision++;
      const endpoint = command.kind === 'create' ? '/api/farmers' : `/api/farmers/${encodeURIComponent(command.id)}`;
      await api.request(endpoint, { method: command.kind === 'create' ? 'POST' : command.kind === 'update' ? 'PUT' : 'DELETE', data: command.data, signal });
      check(signal);
      // A cache failure must not turn an already-accepted mutation into a retry.
      let cacheWarning = false;
      try { await cache.clear(); } catch { cacheWarning = true; }
      check(signal);
      return { cacheWarning };
    },
  };
}
