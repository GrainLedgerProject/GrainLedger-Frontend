// Source: api/compliance.ts LabReportResponse and MrlComplianceCheckPage. Assessments are server evidence, never recalculated here.
import { z } from 'zod';
import type { AuthUser } from '../auth/contracts';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError } from '../../services/api/errors';
import { canViewLabSamples } from './lab-samples-api';
import { validComplianceId } from './sample-commands';

const nullable = z.string().nullable();
const resultSchema = z.object({ id: z.string().min(1), testLabel: z.string(), substanceId: nullable, originalResultText: z.string(),
  resultKind: z.string(), numericValue: nullable, unit: nullable, lod: nullable, loq: nullable, method: nullable, uncertainty: nullable, reference: nullable });
const resultSetSchema = z.object({ id: z.string().min(1), sampleId: nullable, confirmedSampleId: nullable, sourceLotId: nullable,
  laboratorySampleReference: nullable, statedSampleCode: nullable, statedSealCode: nullable, sectionReference: nullable,
  identityStatus: z.string(), results: z.array(resultSchema) });
const reportSchema = z.object({
  id: z.string().min(1), companyId: z.string().min(1), laboratoryName: z.string(), reportNumber: z.string(), issuedOn: z.string(), receivedAt: z.string(),
  reportKind: z.string(), relatedReportId: nullable, relationshipReason: nullable, laboratoryConclusion: nullable, statedStandard: nullable,
  fileName: z.string(), contentType: z.string(), fileSize: z.number().int().nonnegative(), sha256: z.string(), recordedBy: z.string(),
  capturedAt: z.string(), recordedAt: z.string(), status: z.string(), confirmedBy: nullable, confirmedAt: nullable,
  resultSets: z.array(resultSetSchema), relatedReports: z.array(z.object({ id: z.string().min(1), reportKind: z.string(), relationshipReason: nullable })),
  assessmentStatus: z.string(), suggestedMarketCode: z.string(), assessmentReasons: z.array(z.string()),
  residueBindings: z.array(z.object({ resultId: z.string(), sourceId: z.string(), published: z.boolean(), reasons: z.array(z.string()) })).nullish(),
  replacementReportId: z.string().nullish(),
});
export type LabReport = z.infer<typeof reportSchema>;
export type ReportFilter = 'ALL' | 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING';
function invalid(): never { throw new ApiError('Unsupported report data.', 0, 'contract'); }
function unique(ids: string[]) { return new Set(ids).size === ids.length; }
export function parseLabReport(value: unknown, expectedId?: string): LabReport {
  const parsed = reportSchema.safeParse(value);
  if (!parsed.success) return invalid();
  const report = parsed.data;
  if ((expectedId && report.id !== expectedId) || !unique(report.resultSets.map((set) => set.id)) ||
    !unique(report.resultSets.flatMap((set) => set.results.map((result) => result.id)))) return invalid();
  return report;
}
export function parseReportPage(value: unknown, page: number) {
  const parsed = z.object({ items: z.array(z.unknown()), hasMore: z.boolean().optional(), page: z.number().int().positive().optional() })
    .safeParse(Array.isArray(value) ? { items: value } : value);
  if (!parsed.success) return invalid();
  const items = parsed.data.items.map((item) => parseLabReport(item));
  const hasMore = parsed.data.hasMore ?? false;
  if (!unique(items.map((item) => item.id)) || (parsed.data.page !== undefined && parsed.data.page !== page) || (hasMore && !items.length)) return invalid();
  return { items, hasMore };
}
export const isReportConfirmed = (report: LabReport) => report.confirmedAt !== null || report.status === 'CONFIRMED';
export function filterReports(items: LabReport[], search: string, filter: ReportFilter) {
  const term = search.trim().toLowerCase();
  return items.filter((item) => {
    const match = !term || [item.reportNumber, item.laboratoryName, item.statedStandard, item.laboratoryConclusion].some((text) => text?.toLowerCase().includes(term));
    const status = item.assessmentStatus.toUpperCase();
    return match && (filter === 'ALL' || (filter === 'COMPLIANT' ? ['COMPLIANT', 'PASS'].includes(status)
      : filter === 'NON_COMPLIANT' ? ['NON_COMPLIANT', 'FAIL', 'REJECTED'].includes(status)
        : !['COMPLIANT', 'PASS', 'NON_COMPLIANT', 'FAIL'].includes(status)));
  });
}
export function reportStats(items: LabReport[]) {
  return { total: items.length, compliant: items.filter((item) => ['COMPLIANT', 'PASS', 'CONFORMING'].includes(item.assessmentStatus.toUpperCase())).length,
    nonCompliant: items.filter((item) => ['NON_COMPLIANT', 'FAIL', 'REJECTED'].includes(item.assessmentStatus.toUpperCase())).length,
    pending: items.filter((item) => !isReportConfirmed(item) && !['COMPLIANT', 'PASS'].includes(item.assessmentStatus.toUpperCase())).length };
}
export function createLabReportService(api: ApiClient, user: AuthUser, current: () => boolean) {
  function check(signal?: AbortSignal, id?: string) {
    if (!canViewLabSamples(user)) throw new ApiError('Report access denied.', 403, 'http');
    if (!current() || signal?.aborted) throw new ApiError('Cancelled.', 0, 'cancelled');
    if (id !== undefined && !validComplianceId(id)) throw new ApiError('Invalid report ID.', 0, 'contract');
  }
  return {
    async list(page: number, signal: AbortSignal) {
      check(signal);
      if (!Number.isSafeInteger(page) || page < 1) throw new ApiError('Invalid page.', 0, 'configuration');
      const response = await api.request('/api/lab-reports', { query: { page, pageSize: 20 }, signal });
      check(signal); return parseReportPage(response, page);
    },
    async detail(id: string, signal: AbortSignal) {
      check(signal, id);
      const response = await api.request(`/api/lab-reports/${encodeURIComponent(id)}`, { signal });
      check(signal, id); return parseLabReport(response, id);
    },
    async file(id: string, signal: AbortSignal) {
      check(signal, id);
      const response = await api.request(`/api/lab-reports/${encodeURIComponent(id)}/file`, { responseType: 'blob', signal });
      check(signal, id);
      if (!(response instanceof Blob) || response.size === 0) return invalid();
      return response;
    },
  };
}
