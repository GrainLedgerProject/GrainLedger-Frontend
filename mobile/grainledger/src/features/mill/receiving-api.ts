import { Decimal } from 'decimal.js';
import { z } from 'zod';

import type { UserRole } from '../auth/contracts';
import { ApiError } from '../../services/api/errors';
import type { ApiClient } from '../../services/api/http-client';
import { formatMass } from '../stock/stock-api';

export { formatMass };

export const receivingRoles: readonly UserRole[] = ['MILL_OPERATOR', 'MILL_MANAGER', 'MILL_ADMIN'] as const;

export function canAccessReceiving(role: string | null): boolean {
  return role === 'MILL_OPERATOR' || role === 'MILL_MANAGER' || role === 'MILL_ADMIN';
}

export function isOperator(role: string | null): boolean {
  return role === 'MILL_OPERATOR' || role === 'MILL_ADMIN';
}

export function isManager(role: string | null): boolean {
  return role === 'MILL_MANAGER' || role === 'MILL_ADMIN';
}

export const receivingStatuses = [
  'PENDING_ARRIVAL',
  'AWAITING_MANAGER_REVIEW',
  'REMEASUREMENT_REQUESTED',
  'RECEIVED_MATCHED',
  'RECEIVED_WITHIN_TOLERANCE',
  'RECEIVED_SHORTAGE_APPROVED',
  'BLOCKED_UNRESOLVED',
] as const;

export type ReceivingTaskStatus = typeof receivingStatuses[number] | (string & {});

export interface FacilityLookup {
  id: string;
  name: string;
}

export interface ReceivingTaskItem {
  id: string;
  code: string;
  ownerCompanyName: string;
  facilityId: string;
  facilityName?: string;
  receivingLocationId?: string;
  receivingLocationName?: string;
  status: ReceivingTaskStatus;
  receivingVersion: number;
  receivedAt?: string;
  expectedTotalKg: string;
  actualTotalKg?: string | null;
  originMoisturePercent?: string | null;
  arrivalMoisturePercent?: string | null;
  usableStockKg?: string;
  latestMeasurementSetId?: string | null;
}

export interface ReceivingItem {
  id: string;
  lineNo: number;
  sourceLotId?: string;
  lotId?: string;
  lotCode?: string;
  plotSeasonId?: string;
  riceVariety?: string;
  expectedValue?: string;
  expectedUnit?: string;
  expectedKg?: string;
  actualValue?: string | null;
  actualUnit?: string | null;
  actualKg?: string | null;
}

export interface MeasurementSet {
  id: string;
  operationId?: string;
  operatorId?: string;
  capturedAt?: string;
  recordedAt?: string;
  observations?: string;
  threshold?: {
    companyId?: string;
    percentage?: string;
    source?: string;
    revision?: string;
  } | null;
  items?: {
    procurementItemId?: string;
    measuredValue?: string;
    measuredUnit?: string;
    actualKg?: string;
  }[];
}

export interface ReviewRecord {
  id: string;
  operationId?: string;
  measurementSetId?: string;
  action: string;
  reason: string;
  evidenceId?: string | null;
  managerId?: string;
  recordedAt?: string;
}

export interface ReceivingTaskDetail {
  id: string;
  code: string;
  ownerCompanyId?: string;
  ownerCompanyName?: string;
  facilityId: string;
  facilityName?: string;
  receivingLocationId?: string;
  receivingLocationName?: string;
  status: ReceivingTaskStatus;
  receivingVersion: number;
  receivedAt?: string;
  expectedTotalKg: string;
  actualTotalKg?: string | null;
  originMoisturePercent?: string | null;
  usableStockKg?: string;
  latestMeasurementSetId?: string | null;
  effectiveThreshold?: {
    defaultPercentage?: string;
    companyPercentage?: string;
    effectivePercentage?: string;
  } | null;
  items: ReceivingItem[];
  measurementSets: MeasurementSet[];
  reviews: ReviewRecord[];
}

export interface ReceivingTaskPage {
  items: ReceivingTaskItem[];
  paging: {
    page: number;
    pageSize: number;
    totalCount: number;
    hasMore: boolean;
  } | null;
}

export interface ReceivingVariance {
  diffKg: string;
  diffPercent: string;
  isWithinTolerance: boolean;
  isPositive: boolean;
}

export function calculateReceivingVariance(
  expectedKgStr: string | null | undefined,
  actualKgStr: string | null | undefined,
  tolerancePercent = 0.5
): ReceivingVariance | null {
  if (!expectedKgStr || !actualKgStr) return null;
  try {
    const expected = new Decimal(expectedKgStr);
    const actual = new Decimal(actualKgStr);
    if (!expected.isFinite() || !actual.isFinite()) return null;
    const diff = actual.minus(expected);
    const percent = expected.isZero() ? new Decimal(0) : diff.dividedBy(expected).times(100);
    const isWithin = percent.abs().lessThanOrEqualTo(tolerancePercent);
    return {
      diffKg: diff.toFixed(2),
      diffPercent: percent.toFixed(2),
      isWithinTolerance: isWithin,
      isPositive: diff.greaterThan(0),
    };
  } catch {
    return null;
  }
}

export function formatReceivingStatus(
  status: string,
  locale: 'vi' | 'en' = 'vi'
): { label: string; tone: 'warning' | 'info' | 'success' | 'danger' | 'neutral' } {
  switch (status) {
    case 'PENDING_ARRIVAL':
      return {
        label: locale === 'vi' ? 'Chờ cân xe' : 'Pending arrival',
        tone: 'warning',
      };
    case 'AWAITING_MANAGER_REVIEW':
      return {
        label: locale === 'vi' ? 'Chờ Quản lý duyệt' : 'Awaiting review',
        tone: 'info',
      };
    case 'REMEASUREMENT_REQUESTED':
      return {
        label: locale === 'vi' ? 'Yêu cầu cân lại' : 'Remeasurement requested',
        tone: 'warning',
      };
    case 'RECEIVED_MATCHED':
    case 'RECEIVED_WITHIN_TOLERANCE':
      return {
        label: locale === 'vi' ? 'Khớp dung sai' : 'Within tolerance',
        tone: 'success',
      };
    case 'RECEIVED_SHORTAGE_APPROVED':
      return {
        label: locale === 'vi' ? 'Duyệt lệch cân' : 'Shortage approved',
        tone: 'success',
      };
    case 'BLOCKED_UNRESOLVED':
      return {
        label: locale === 'vi' ? 'Bị chặn lệch cân' : 'Blocked unresolved',
        tone: 'danger',
      };
    default:
      return {
        label: status,
        tone: 'neutral',
      };
  }
}

const facilityLookupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export function parseFacilityLookups(value: unknown): FacilityLookup[] {
  if (value === null || typeof value !== 'object') {
    throw new ApiError('The server returned an unsupported facility response.', 0, 'contract');
  }
  const rawList = Array.isArray(value)
    ? value
    : 'facilities' in value && Array.isArray((value as { facilities: unknown }).facilities)
    ? (value as { facilities: unknown[] }).facilities
    : null;

  if (!rawList) {
    throw new ApiError('Missing facilities array in lookup response.', 0, 'contract');
  }

  const parsed = z.array(facilityLookupSchema).safeParse(rawList);
  if (!parsed.success) {
    throw new ApiError('Invalid facility lookup data returned by server.', 0, 'contract');
  }
  return parsed.data;
}

const decimalString = z.string().refine((val) => {
  try {
    return new Decimal(val).isFinite();
  } catch {
    return false;
  }
}, 'Invalid decimal number');

const taskItemSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().optional(),
    sourceLotCode: z.string().optional(),
    ownerCompanyName: z.string().optional(),
    farmerName: z.string().optional(),
    facilityId: z.string().optional(),
    facilityName: z.string().optional(),
    receivingLocationId: z.string().optional(),
    receivingLocationName: z.string().optional(),
    status: z.string(),
    receivingVersion: z.number().int().optional(),
    receivedAt: z.string().optional(),
    expectedTotalKg: decimalString.optional(),
    originQuantityKg: decimalString.optional(),
    actualTotalKg: decimalString.nullable().optional(),
    arrivalMeasuredKg: decimalString.nullable().optional(),
    originMoisturePercent: z.string().nullable().optional(),
    arrivalMoisturePercent: z.string().nullable().optional(),
    usableStockKg: decimalString.optional(),
    latestMeasurementSetId: z.string().nullable().optional(),
  })
  .passthrough();

export function parseReceivingTaskItem(raw: unknown, defaultFacilityId: string = ''): ReceivingTaskItem {
  const result = taskItemSchema.safeParse(raw);
  if (!result.success) {
    throw new ApiError('The server returned a malformed receiving task item.', 0, 'contract');
  }
  const d = result.data;
  const code = d.code || d.sourceLotCode || `LOT-${d.id.slice(0, 6)}`;
  const ownerCompanyName = d.ownerCompanyName || d.farmerName || '';
  const expectedTotalKg = d.expectedTotalKg || d.originQuantityKg || '0';
  const actualTotalKg = d.actualTotalKg ?? d.arrivalMeasuredKg ?? null;
  const facilityId = d.facilityId || defaultFacilityId;

  return {
    id: d.id,
    code,
    ownerCompanyName,
    facilityId,
    facilityName: d.facilityName,
    receivingLocationId: d.receivingLocationId,
    receivingLocationName: d.receivingLocationName,
    status: d.status,
    receivingVersion: d.receivingVersion ?? 0,
    receivedAt: d.receivedAt,
    expectedTotalKg,
    actualTotalKg,
    originMoisturePercent: d.originMoisturePercent ?? null,
    arrivalMoisturePercent: d.arrivalMoisturePercent ?? null,
    usableStockKg: d.usableStockKg,
    latestMeasurementSetId: d.latestMeasurementSetId ?? null,
  };
}

export function parseReceivingTaskPage(value: unknown, expectedPage?: number, facilityId: string = ''): ReceivingTaskPage {
  if (value === null || typeof value !== 'object') {
    throw new ApiError('The server returned an unsupported receiving tasks response.', 0, 'contract');
  }

  const rawItems = Array.isArray(value)
    ? value
    : 'items' in value && Array.isArray((value as { items: unknown }).items)
    ? (value as { items: unknown[] }).items
    : null;

  if (rawItems === null) {
    throw new ApiError('The server returned an invalid receiving tasks payload.', 0, 'contract');
  }

  // Prevent duplicate IDs
  const seenIds = new Set<string>();
  const items: ReceivingTaskItem[] = [];
  for (const raw of rawItems) {
    const item = parseReceivingTaskItem(raw, facilityId);
    if (seenIds.has(item.id)) {
      throw new ApiError(`Duplicate receiving task ID ${item.id} received.`, 0, 'contract');
    }
    seenIds.add(item.id);
    items.push(item);
  }

  let paging: ReceivingTaskPage['paging'] = null;
  if (!Array.isArray(value) && 'page' in value && 'pageSize' in value && 'totalCount' in value && 'hasMore' in value) {
    const p = value as { page: number; pageSize: number; totalCount: number; hasMore: boolean };
    if (
      typeof p.page === 'number' &&
      typeof p.pageSize === 'number' &&
      typeof p.totalCount === 'number' &&
      typeof p.hasMore === 'boolean' &&
      p.page >= 1 &&
      p.pageSize >= 1 &&
      p.totalCount >= 0
    ) {
      if (expectedPage !== undefined && p.page !== expectedPage) {
        throw new ApiError(`Expected page ${expectedPage} but received page ${p.page}.`, 0, 'contract');
      }
      paging = {
        page: p.page,
        pageSize: p.pageSize,
        totalCount: p.totalCount,
        hasMore: p.hasMore,
      };
    }
  }

  return { items, paging };
}

const itemDetailSchema = z
  .object({
    id: z.string().min(1),
    lineNo: z.number().int().optional(),
    sourceLotId: z.string().optional(),
    lotId: z.string().optional(),
    lotCode: z.string().optional(),
    plotSeasonId: z.string().optional(),
    riceVariety: z.string().optional(),
    expectedValue: z.string().optional(),
    expectedUnit: z.string().optional(),
    expectedKg: decimalString.optional(),
    actualValue: z.string().nullable().optional(),
    actualUnit: z.string().nullable().optional(),
    actualKg: decimalString.nullable().optional(),
  })
  .passthrough();

const measurementSetSchema = z
  .object({
    id: z.string().min(1),
    operationId: z.string().optional(),
    operatorId: z.string().optional(),
    capturedAt: z.string().optional(),
    recordedAt: z.string().optional(),
    observations: z.string().optional(),
    threshold: z
      .object({
        companyId: z.string().optional(),
        percentage: z.string().optional(),
        source: z.string().optional(),
        revision: z.string().optional(),
      })
      .nullable()
      .optional(),
    items: z
      .array(
        z.object({
          procurementItemId: z.string().optional(),
          measuredValue: z.string().optional(),
          measuredUnit: z.string().optional(),
          actualKg: z.string().optional(),
        })
      )
      .optional(),
  })
  .passthrough();

const reviewSchema = z
  .object({
    id: z.string().min(1),
    operationId: z.string().optional(),
    measurementSetId: z.string().optional(),
    action: z.string(),
    reason: z.string(),
    evidenceId: z.string().nullable().optional(),
    managerId: z.string().optional(),
    recordedAt: z.string().optional(),
  })
  .passthrough();

const taskDetailSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().optional(),
    ownerCompanyId: z.string().optional(),
    ownerCompanyName: z.string().optional(),
    facilityId: z.string().min(1),
    facilityName: z.string().optional(),
    receivingLocationId: z.string().optional(),
    receivingLocationName: z.string().optional(),
    status: z.string(),
    receivingVersion: z.number().int().optional(),
    receivedAt: z.string().optional(),
    expectedTotalKg: decimalString.optional(),
    actualTotalKg: decimalString.nullable().optional(),
    originMoisturePercent: z.string().nullable().optional(),
    usableStockKg: decimalString.optional(),
    latestMeasurementSetId: z.string().nullable().optional(),
    effectiveThreshold: z
      .object({
        defaultPercentage: z.string().optional(),
        companyPercentage: z.string().optional(),
        effectivePercentage: z.string().optional(),
      })
      .nullable()
      .optional(),
    items: z.array(itemDetailSchema).optional(),
    measurementSets: z.array(measurementSetSchema).optional(),
    reviews: z.array(reviewSchema).optional(),
  })
  .passthrough();

export function parseReceivingTaskDetail(value: unknown, expectedId: string): ReceivingTaskDetail {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError('The server returned an unsupported receiving task detail response.', 0, 'contract');
  }
  const result = taskDetailSchema.safeParse(value);
  if (!result.success) {
    throw new ApiError('Invalid receiving task detail data structure.', 0, 'contract');
  }
  const d = result.data;
  if (d.id !== expectedId) {
    throw new ApiError(`Response task ID (${d.id}) does not match requested ID (${expectedId}).`, 0, 'contract');
  }

  const items: ReceivingItem[] = (d.items ?? []).map((it, idx) => ({
    id: it.id,
    lineNo: it.lineNo ?? idx + 1,
    sourceLotId: it.sourceLotId,
    lotId: it.lotId,
    lotCode: it.lotCode,
    plotSeasonId: it.plotSeasonId,
    riceVariety: it.riceVariety,
    expectedValue: it.expectedValue,
    expectedUnit: it.expectedUnit,
    expectedKg: it.expectedKg,
    actualValue: it.actualValue ?? null,
    actualUnit: it.actualUnit ?? null,
    actualKg: it.actualKg ?? null,
  }));

  const measurementSets: MeasurementSet[] = (d.measurementSets ?? []).map((ms) => ({
    id: ms.id,
    operationId: ms.operationId,
    operatorId: ms.operatorId,
    capturedAt: ms.capturedAt,
    recordedAt: ms.recordedAt,
    observations: ms.observations,
    threshold: ms.threshold,
    items: ms.items,
  }));

  const reviews: ReviewRecord[] = (d.reviews ?? []).map((rv) => ({
    id: rv.id,
    operationId: rv.operationId,
    measurementSetId: rv.measurementSetId,
    action: rv.action,
    reason: rv.reason,
    evidenceId: rv.evidenceId,
    managerId: rv.managerId,
    recordedAt: rv.recordedAt,
  }));

  return {
    id: d.id,
    code: d.code || `LOT-${d.id.slice(0, 6)}`,
    ownerCompanyId: d.ownerCompanyId,
    ownerCompanyName: d.ownerCompanyName,
    facilityId: d.facilityId,
    facilityName: d.facilityName,
    receivingLocationId: d.receivingLocationId,
    receivingLocationName: d.receivingLocationName,
    status: d.status,
    receivingVersion: d.receivingVersion ?? 0,
    receivedAt: d.receivedAt,
    expectedTotalKg: d.expectedTotalKg ?? '0',
    actualTotalKg: d.actualTotalKg ?? null,
    originMoisturePercent: d.originMoisturePercent,
    usableStockKg: d.usableStockKg,
    latestMeasurementSetId: d.latestMeasurementSetId ?? null,
    effectiveThreshold: d.effectiveThreshold,
    items,
    measurementSets,
    reviews,
  };
}

export interface ReceivingListQuery {
  facilityId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: 'receivedAt' | 'status' | 'owner';
  sortDirection?: 'asc' | 'desc';
}

export function createReceivingService(api: ApiClient) {
  return {
    async getFacilities(signal?: AbortSignal): Promise<FacilityLookup[]> {
      const data = await api.request('/api/ledger/lookups', { signal });
      return parseFacilityLookups(data);
    },

    async listTasks(query: ReceivingListQuery, signal?: AbortSignal): Promise<ReceivingTaskPage> {
      if (!query.facilityId || !query.facilityId.trim()) {
        throw new ApiError('Facility selection is required to load receiving tasks.', 0, 'configuration');
      }

      const params: Record<string, string | number> = {
        facilityId: query.facilityId.trim(),
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 25,
      };

      if (query.search && query.search.trim()) {
        params.search = query.search.trim();
      }
      if (query.status && query.status.trim()) {
        params.status = query.status.trim();
      }
      if (query.sortBy) {
        params.sortBy = query.sortBy;
      }
      if (query.sortDirection) {
        params.sortDirection = query.sortDirection;
      }

      const data = await api.request('/api/ledger/receiving-tasks', {
        query: params,
        signal,
      });

      return parseReceivingTaskPage(data, query.page ?? 1, query.facilityId);
    },

    async getDetail(id: string | null | undefined, signal?: AbortSignal): Promise<ReceivingTaskDetail> {
      if (!id || typeof id !== 'string' || !id.trim()) {
        throw new ApiError('A valid receiving task ID is required.', 0, 'contract');
      }
      const data = await api.request(`/api/ledger/receiving/${encodeURIComponent(id.trim())}`, {
        signal,
      });
      return parseReceivingTaskDetail(data, id.trim());
    },
  };
}
