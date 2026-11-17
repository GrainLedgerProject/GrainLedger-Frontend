// Web api/compliance.ts + focused backend LabReportEndpoints.cs. Backend v1, immutable replacements and explicit matches supersede web stub payloads.
import { z } from 'zod';
import type { AuthUser } from '../auth/contracts';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError } from '../../services/api/errors';
import { canViewLabSamples } from './lab-samples-api';
import { validComplianceId } from './sample-commands';
import type { LabReport } from './lab-reports-api';
import { isReportConfirmed } from './lab-reports-api';

export interface Attachment { fileName: string; contentType: string; contentBase64: string; size: number }
export const attachmentLimit = 10 * 1024 * 1024; // App memory budget and confirmed backend MaxFileBytes.
export const reportKinds = ['PARTIAL', 'FINAL', 'SUPPLEMENTARY', 'AMENDMENT', 'RETEST'] as const;
export const resultKinds = ['NUMERIC', 'BELOW_LIMIT', 'NOT_DETECTED', 'QUALITATIVE', 'OTHER'] as const;
export const canWriteReports = (user: AuthUser) => canViewLabSamples(user) && user.permissions.includes('lab.write');
export const isReportMutable = (report: LabReport) => !isReportConfirmed(report) && !['DELETED', 'SUPERSEDED'].includes(report.status);
const resultFields = ['testLabel', 'substanceId', 'originalResultText', 'resultKind', 'numericValue', 'unit', 'lod', 'loq', 'method', 'uncertainty', 'reference'] as const;
export type ResultForm = Record<typeof resultFields[number], string>;
export type ResultSetForm = { entityId: string; sampleId: string; laboratorySampleReference: string; statedSampleCode: string; statedSealCode: string;
  sectionReference: string; results: ResultForm[] };
export type ReportForm = { laboratoryName: string; reportNumber: string; issuedOn: string; reportKind: string; relatedReportId: string;
  relationshipReason: string; laboratoryConclusion: string; statedStandard: string; companyOnlyConfirmed: boolean; resultSets: ResultSetForm[] };
export const emptyResult = (): ResultForm => ({ testLabel: '', substanceId: '', originalResultText: '', resultKind: 'NUMERIC', numericValue: '',
  unit: 'mg/kg', lod: '', loq: '', method: '', uncertainty: '', reference: '' });
export const emptyResultSet = (): ResultSetForm => ({ entityId: '', sampleId: '', laboratorySampleReference: '', statedSampleCode: '', statedSealCode: '', sectionReference: '', results: [emptyResult()] });
export function reportForm(report: LabReport | null): ReportForm {
  return report ? { laboratoryName: report.laboratoryName, reportNumber: report.reportNumber, issuedOn: report.issuedOn.slice(0, 10),
    reportKind: report.reportKind, relatedReportId: report.relatedReportId ?? '', relationshipReason: report.relationshipReason ?? '',
    laboratoryConclusion: report.laboratoryConclusion ?? '', statedStandard: report.statedStandard ?? '', companyOnlyConfirmed: false,
    resultSets: report.resultSets.map((set) => ({ entityId: set.id, sampleId: set.sampleId ?? '', laboratorySampleReference: set.laboratorySampleReference ?? '',
      statedSampleCode: set.statedSampleCode ?? '', statedSealCode: set.statedSealCode ?? '', sectionReference: set.sectionReference ?? '',
      results: set.results.map((result) => Object.fromEntries(resultFields.map((field) => [field, result[field] ?? ''])) as ResultForm) })) }
    : { laboratoryName: '', reportNumber: '', issuedOn: new Date().toISOString().slice(0, 10), reportKind: 'FINAL', relatedReportId: '',
      relationshipReason: '', laboratoryConclusion: '', statedStandard: '', companyOnlyConfirmed: false, resultSets: [emptyResultSet()] };
}
export function reportFormErrors(form: ReportForm) {
  const date = form.issuedOn;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  const relatedRequired = ['SUPPLEMENTARY', 'AMENDMENT', 'RETEST'].includes(form.reportKind);
  return { laboratoryName: !form.laboratoryName.trim() || form.laboratoryName.trim().length > 200, reportNumber: !form.reportNumber.trim() || form.reportNumber.trim().length > 200, issuedOn: !validDate,
    reportKind: !reportKinds.some((kind) => kind === form.reportKind), companyOnlyConfirmed: !form.companyOnlyConfirmed,
    relatedReportId: (relatedRequired && !form.relatedReportId.trim()) || (Boolean(form.relatedReportId.trim()) && !z.uuid().safeParse(form.relatedReportId.trim()).success),
    relationshipReason: Boolean(form.relatedReportId.trim()) && !form.relationshipReason.trim(),
    resultSets: form.resultSets.length < 1 || form.resultSets.length > 1000 || form.resultSets.some((set) => !set.results.length || set.results.some((row) => !row.testLabel.trim() || !row.originalResultText.trim() ||
      !resultKinds.some((kind) => kind === row.resultKind) || (['NUMERIC', 'BELOW_LIMIT'].includes(row.resultKind) && !row.numericValue.trim()) ||
      [row.numericValue, row.lod, row.loq].some((value) => Boolean(value.trim()) && !/^\d+(?:\.\d+)?$/.test(value.trim())))) || form.resultSets.reduce((count, set) => count + set.results.length, 0) > 10000 };
}
const n = z.string().nullable();
const resultInput = z.object({ testLabel: n, substanceId: n, originalResultText: n, resultKind: n, numericValue: n, unit: n, lod: n, loq: n, method: n, uncertainty: n, reference: n });
const setInput = z.object({ entityId: z.string().min(1), sampleId: n, laboratorySampleReference: n, statedSampleCode: n, statedSealCode: n, sectionReference: n, results: z.array(resultInput) });
const reportInput = z.object({ entityId: z.string().min(1), laboratoryName: z.string().trim().min(1), reportNumber: z.string().trim().min(1),
  issuedOn: z.string(), receivedAt: z.string(), reportKind: n, relatedReportId: n, relationshipReason: n, fileName: n, contentType: n, contentBase64: n,
  companyOnlyConfirmed: z.boolean(), laboratoryConclusion: n, statedStandard: n, resultSets: z.array(setInput) });
const base = { deviceId: z.literal('grainledger-mobile'), clientOperationId: z.string().min(1), capturedAt: z.iso.datetime() };
const capture = z.object({ ...base, payloadSchemaVersion: z.literal(1), payload: reportInput });
const matchSchema = z.object({ resultSetId: z.string().min(1), sampleId: z.uuid(), identityBasis: z.enum(['SAMPLE_CODE', 'SEAL_CODE', 'LAB_REFERENCE']), evidenceRef: n.optional() });
export type ReportMatch = z.infer<typeof matchSchema>;
const commandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), data: capture }),
  z.object({ kind: z.literal('update'), id: z.string().min(1), data: capture }),
  z.object({ kind: z.literal('delete'), id: z.string().min(1), data: z.object({ ...base, payloadSchemaVersion: z.literal(1) }) }),
  z.object({ kind: z.literal('confirm'), id: z.string().min(1), data: z.object({ ...base, payloadSchemaVersion: z.literal(1), payload: z.object({
    identityChecked: z.literal(true), transcriptionChecked: z.literal(true), matches: z.array(matchSchema).min(1).max(1000), asReceivedConfirmed: z.boolean(),
  }) }) }),
]);
export type ReportCommand = z.infer<typeof commandSchema>;
const text = (value: string) => value.trim() || null;
export function saveReport(form: ReportForm, report: LabReport | null, attachment: Attachment | null, uuid: () => string, now: () => string): ReportCommand {
  if (Object.values(reportFormErrors(form)).some(Boolean)) throw new ApiError('Invalid required report fields.', 0, 'contract');
  if (report && !isReportMutable(report)) throw new ApiError('Confirmed or retired evidence is immutable.', 409, 'http');
  if (!report && !attachment) throw new ApiError('An original certificate is required.', 0, 'contract');
  if (attachment) validateAttachment(attachment);
  const capturedAt = now();
  const payload = { entityId: report?.id ?? uuid(), laboratoryName: form.laboratoryName.trim(), reportNumber: form.reportNumber.trim(), issuedOn: form.issuedOn,
    receivedAt: report?.receivedAt ?? capturedAt, reportKind: text(form.reportKind), relatedReportId: text(form.relatedReportId), relationshipReason: text(form.relationshipReason),
    fileName: attachment?.fileName ?? report?.fileName ?? null, contentType: attachment?.contentType ?? report?.contentType ?? null, contentBase64: attachment?.contentBase64 ?? null,
    companyOnlyConfirmed: form.companyOnlyConfirmed, laboratoryConclusion: text(form.laboratoryConclusion), statedStandard: text(form.statedStandard),
    resultSets: form.resultSets.map((set) => ({ entityId: set.entityId || uuid(), sampleId: text(set.sampleId), laboratorySampleReference: text(set.laboratorySampleReference),
      statedSampleCode: text(set.statedSampleCode), statedSealCode: text(set.statedSealCode), sectionReference: text(set.sectionReference),
      results: set.results.map((result) => Object.fromEntries(resultFields.map((field) => [field, field === 'originalResultText' ? result[field] || null : text(result[field])]))),
    })) };
  return commandSchema.parse({ kind: report ? 'update' : 'create', ...(report ? { id: report.id } : {}),
    data: { ...{ deviceId: 'grainledger-mobile', clientOperationId: uuid(), capturedAt, payloadSchemaVersion: 1 }, payload } });
}
export function confirmReport(report: LabReport, checked: { identity: boolean; transcription: boolean; asReceived: boolean; matches: ReportMatch[] }, uuid: () => string, now: () => string): ReportCommand {
  if (!checked.identity || !checked.transcription || report.confirmedAt !== null || report.status === 'CONFIRMED') throw new ApiError('Check the report before confirmation.', 0, 'contract');
  const matches = checked.matches.map((row) => matchSchema.parse(row));
  if (!isReportMutable(report) || matches.length !== report.resultSets.length || new Set(matches.map((match) => match.resultSetId)).size !== matches.length ||
    report.resultSets.some((set) => !matches.some((match) => match.resultSetId === set.id)) || matches.some((match) => match.identityBasis === 'LAB_REFERENCE' && !match.evidenceRef?.trim())) throw new ApiError('Match every result set exactly once using actual evidence.', 0, 'contract');
  return commandSchema.parse({ kind: 'confirm', id: report.id, data: { deviceId: 'grainledger-mobile', clientOperationId: uuid(), capturedAt: now(), payloadSchemaVersion: 1,
    payload: { identityChecked: true, transcriptionChecked: true, matches, asReceivedConfirmed: checked.asReceived } } });
}
export function deleteReport(id: string, uuid: () => string, now: () => string): ReportCommand {
  return commandSchema.parse({ kind: 'delete', id, data: { deviceId: 'grainledger-mobile', clientOperationId: uuid(), capturedAt: now(), payloadSchemaVersion: 1 } });
}
export function validateAttachment(file: Attachment) {
  if (!file.fileName.trim() || file.fileName.length > 255 || /[/\\\u0000-\u001f\u007f]/.test(file.fileName) || !/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/.test(file.contentType) || !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > attachmentLimit ||
    file.contentBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.contentBase64) || !file.contentBase64) {
    throw new ApiError('Invalid attachment or file exceeds 10 MiB.', 0, 'contract');
  }
  const bytes = file.contentBase64.length / 4 * 3 - (file.contentBase64.endsWith('==') ? 2 : file.contentBase64.endsWith('=') ? 1 : 0);
  if (bytes !== file.size) throw new ApiError('Attachment size mismatch.', 0, 'contract');
}
export function createReportCommands(api: ApiClient, user: AuthUser, current: () => boolean) {
  return async (command: ReportCommand, signal: AbortSignal) => {
    const check = () => {
      if (!canWriteReports(user)) throw new ApiError('Report action denied.', 403, 'http');
      if (!current() || signal.aborted) throw new ApiError('Cancelled.', 0, 'cancelled');
    };
    check();
    const parsed = commandSchema.safeParse(command);
    if (!parsed.success) throw new ApiError('Invalid report command.', 0, 'contract');
    const value = parsed.data;
    if ('id' in value && !validComplianceId(value.id)) throw new ApiError('Invalid report ID.', 0, 'contract');
    const path = value.kind === 'create' ? '/api/lab-reports' : `/api/lab-reports/${encodeURIComponent(value.id)}${value.kind === 'confirm' ? '/confirm' : ''}`;
    // HTTP acceptance and detail parsing are separate: malformed success must not lead to a new mutation on retry.
    const result = await api.request(path, { method: value.kind === 'update' ? 'PUT' : value.kind === 'delete' ? 'DELETE' : 'POST', data: value.data, signal });
    check();
    return result;
  };
}
