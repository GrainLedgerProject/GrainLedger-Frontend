import { z } from 'zod';
import { Decimal } from 'decimal.js';
import type { AuthUser } from '../auth/contracts';
import type { ApiClient, ApiRequestOptions } from '../../services/api/http-client';
import { ApiError } from '../../services/api/errors';
import { validComplianceId } from '../compliance/sample-commands';

export const nullableText = z.string().nullable();
export const idSchema = z.uuid().refine((id) => id !== '00000000-0000-0000-0000-000000000000');
export const decimalText = z.string().refine((value) => /^[+-]?\d+(?:\.\d+)?$/.test(value) && new Decimal(value).isFinite(), 'Use an exact decimal.');
export const positiveInt = z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number).pipe(z.number().int().positive().safe());
export const dateTime = z.string().refine((value) => /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)), 'Use an ISO date and time with timezone.');
export const permission = (user: AuthUser | null, name: string) => Boolean(user?.isActive && user.permissions.includes(name));
export function contract<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiError('Unsupported domain response.', 0, 'contract');
  return parsed.data;
}
export function endpointId(id: string) {
  if (!validComplianceId(id)) throw new ApiError('Invalid identifier.', 0, 'contract');
  return encodeURIComponent(id);
}
export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  if (new Set(items.map(key)).size !== items.length) throw new ApiError('Duplicate records.', 0, 'contract');
  return items;
}
export function scopedApi(api: ApiClient, user: AuthUser, current: () => boolean) {
  function check(signal?: AbortSignal, allowed = true) {
    if (!user.isActive || !allowed) throw new ApiError('Access denied.', 403, 'http');
    if (!current() || signal?.aborted) throw new ApiError('Cancelled.', 0, 'cancelled');
  }
  return { check, async request(path: string, init: ApiRequestOptions, allowed = true) {
    check(init.signal, allowed); const result = await api.request(path, init); check(init.signal, allowed); return result;
  } };
}
export function pageNumber(page: number) {
  if (!Number.isSafeInteger(page) || page < 1) throw new ApiError('Invalid page.', 0, 'configuration');
  return page;
}
