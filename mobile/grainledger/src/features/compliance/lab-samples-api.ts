// Source: web LabSampleRegistrationPage.SampleSummary/HandoverRecord and api/compliance.ts.
import { z } from 'zod';
import type { AuthUser } from '../auth/contracts';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError } from '../../services/api/errors';

export const canViewLabSamples = (user: AuthUser | null) => Boolean(user?.isActive && user.normalizedRole === 'CUSTOMER_MANAGER');
const sampleSchema = z.object({
  id: z.string().min(1), sourceLotId: z.string().min(1), code: z.string().nullish(), sealCode: z.string().nullish(),
  collectedAt: z.string(), handoverCount: z.number().int().nonnegative(), materialDescription: z.string().nullish(),
});
const handoverSchema = z.object({
  id: z.string().nullish(), entityId: z.string().nullish(), fromParty: z.string().nullable(), toParty: z.string().nullable(),
  handedOverAt: z.string().min(1), sealCondition: z.string().nullable(), evidenceRef: z.string().nullish(),
  handoverKind: z.string().nullish(), laboratoryName: z.string().nullish(), laboratoryReference: z.string().nullish(),
  laboratorySampleReference: z.string().nullish(),
});
export type LabSample = z.infer<typeof sampleSchema>;
export type SampleHandover = z.infer<typeof handoverSchema>;
export interface LabSamplePage { items: LabSample[]; hasMore: boolean }
export type SampleFilter = 'ALL' | 'HANDED_OVER' | 'IN_STORE';
function invalidData(): never { throw new ApiError('Unsupported lab sample data.', 0, 'contract'); }
export function parseLabSamplePage(value: unknown, requestedPage: number): LabSamplePage {
  const result = z.object({ items: z.array(sampleSchema), hasMore: z.boolean().optional(),
    page: z.number().int().positive().optional() }).safeParse(Array.isArray(value) ? { items: value } : value);
  if (!result.success) return invalidData();
  const { items, hasMore = false, page } = result.data;
  if ((page !== undefined && page !== requestedPage) || new Set(items.map((item) => item.id)).size !== items.length ||
    (hasMore && items.length === 0)) return invalidData();
  return { items, hasMore };
}
export function parseSampleHandovers(value: unknown): SampleHandover[] {
  const result = z.object({ items: z.array(handoverSchema) }).safeParse(Array.isArray(value) ? { items: value } : value);
  if (!result.success) return invalidData();
  const identities = result.data.items.map((item) => item.id || item.entityId).filter(Boolean);
  if (new Set(identities).size !== identities.length) return invalidData();
  return result.data.items;
}
export function filterLabSamples(items: LabSample[], search: string, status: SampleFilter) {
  const term = search.trim().toLowerCase();
  return items.filter((item) => (!term || [item.code, item.sealCode, item.sourceLotId, item.materialDescription]
    .some((value) => value?.toLowerCase().includes(term))) && (status === 'ALL' ||
      (status === 'HANDED_OVER' ? item.handoverCount > 0 : item.handoverCount === 0)));
}
export function labSampleStats(items: LabSample[]) {
  return { total: items.length, sealed: items.filter((item) => Boolean(item.sealCode)).length,
    handedOver: items.filter((item) => item.handoverCount > 0).length, inStore: items.filter((item) => item.handoverCount === 0).length };
}
export function sampleDate(value: string, locale: 'vi' | 'en') {
  if (!value) return locale === 'vi' ? 'Chưa được cung cấp' : 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US');
}
export function createLabSamplesService(api: ApiClient, user: AuthUser, isCurrent = () => true) {
  function check(signal?: AbortSignal) {
    if (!canViewLabSamples(user)) throw new ApiError('Lab sample access denied.', 403, 'http');
    if (!isCurrent() || signal?.aborted) throw new ApiError('The request was cancelled.', 0, 'cancelled');
  }
  return {
    async list(page: number, signal?: AbortSignal) {
      check(signal);
      if (!Number.isSafeInteger(page) || page < 1) throw new ApiError('Invalid sample page.', 0, 'configuration');
      const value = await api.request('/api/samples', { query: { page, pageSize: 20 }, signal });
      check(signal);
      return parseLabSamplePage(value, page);
    },
    async handovers(id: string, signal?: AbortSignal) {
      check(signal);
      if (typeof id !== 'string' || !id.trim() || id === '.' || id.includes('..') || /[/\\%\u0000-\u001f\u007f]/.test(id)) {
        throw new ApiError('Invalid sample identifier.', 0, 'contract');
      }
      const value = await api.request(`/api/samples/${encodeURIComponent(id)}/handovers`, { signal });
      check(signal);
      return parseSampleHandovers(value);
    },
  };
}
