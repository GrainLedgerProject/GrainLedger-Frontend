// Web api/residue.ts; missing UI action contracts checked against focused backend ResidueRules/PolicySettings/ResidueReportReview endpoints.
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import type { AuthUser } from '../auth/contracts';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError } from '../../services/api/errors';
import { contract, dateTime, decimalText, endpointId, idSchema, nullableText as n, permission, positiveInt, scopedApi, uniqueBy } from './api-common';

export const reviewFields = { id: idSchema, effectiveFrom: dateTime, effectiveTo: dateTime.nullable(), supersedesId: idSchema.nullable(),
  evidenceRef: z.string().trim().min(1).max(4000), applicabilityStatement: z.string().trim().min(1).max(4000), reviewedBy: z.string().trim().min(1).max(4000),
  reviewAuthority: z.string().trim().min(1).max(4000), reviewedAt: dateTime };
const publication = { publishedBy: idSchema.nullish(), publishedAt: dateTime.nullish() };
export const laboratorySchema = z.object({ analyticalMethod: z.string().min(1), numericInterpretationKind: n, relativeUncertaintyPercent: n,
  relativeUncertaintyAtZero: z.boolean(), belowLimit: z.boolean(), ndThresholdKind: n });
export const stepSchema = z.object({ id: idSchema, process: z.string().min(1), inputStage: z.string().min(1), outputStage: z.string().min(1),
  outputFraction: z.string().min(1), conditions: z.string().min(1), factorLower: decimalText, factorUpper: decimalText, factorSemantics: z.string(),
  anchorStage: n, homogeneousMixing: z.boolean() });
const retirement = z.object({ profileId: idSchema, code: z.string(), companyId: idSchema.nullable(), reason: z.string(), retiredBy: idSchema, retiredAt: dateTime });
export const ruleInputSchema = z.object({ ...reviewFields, code: z.string().trim().min(1).max(100), versionNo: positiveInt, kind: z.literal('FLOW'), schemaVersion: z.literal(2),
  substanceId: idSchema, commodityId: idSchema, residueDefinition: z.string().trim().min(1), unit: z.literal('mg/kg'), decimalPlaces: z.number().int().min(0).max(18),
  laboratory: z.array(laboratorySchema), steps: z.array(stepSchema), asReceivedConfirmed: z.literal(true), companyId: idSchema.nullable() });
// Read legacy values without claiming they meet current publication requirements.
export const ruleSchema = z.object({ ...reviewFields, ...publication, code: z.string(), versionNo: z.union([z.string(), z.number()]), kind: z.string(),
  schemaVersion: z.union([z.string(), z.number()]), substanceId: idSchema, commodityId: idSchema.nullable(), residueDefinition: z.string(), unit: z.string(),
  decimalPlaces: z.union([z.string(), z.number()]), laboratory: z.array(laboratorySchema), steps: z.array(stepSchema), asReceivedConfirmed: z.boolean(),
  companyId: idSchema.nullish(), retirement: retirement.nullish() });
export type ResidueRule = z.infer<typeof ruleSchema>;
export const settingInputSchema = z.object({ ...reviewFields, companyId: idSchema, ruleCode: z.string().trim().min(1).max(100), versionNo: positiveInt,
  mode: z.enum(['SYSTEM_DEFAULT', 'COMPANY_OVERRIDE']) });
export const settingSchema = settingInputSchema.extend(publication);
export const selectionInputSchema = z.object({ ...reviewFields, companyId: idSchema, sourceId: idSchema, substanceId: idSchema, selectedResultId: idSchema,
  supersededResultIds: z.array(idSchema).max(1000), residueDefinition: z.string().trim().min(1), absoluteUncertainty: decimalText.nullable(),
  reportingThreshold: decimalText.nullable(), schemaVersion: z.literal(2), asReceivedConfirmed: z.literal(true), profileCode: z.string().trim().min(1),
  laboratoryMethod: z.string().trim().min(1), bindingReportId: idSchema.nullish(), profileRuleId: idSchema.nullish(), profileSettingId: idSchema.nullish(),
  bindingRequest: n.optional(), bindingFingerprint: n.optional(), bindingNote: n.optional() });
export const selectionSchema = selectionInputSchema.extend(publication);
export const groupInputSchema = z.object({ ...reviewFields, companyId: idSchema, code: z.string().trim().min(1).max(100), versionNo: positiveInt, substanceId: idSchema,
  sourceIds: z.array(idSchema).min(1).max(1000), productStage: z.literal('RAW_PADDY'), productIdentity: z.literal('RAW_PADDY'), residueDefinition: z.string().min(1),
  lower: decimalText, upper: decimalText, unit: z.literal('mg/kg'), precedence: z.enum(['DIRECT_FIRST', 'GROUP_FIRST', 'UNTESTED_ONLY']), supportingResultIds: z.array(idSchema).max(1000),
  decimalPlaces: z.number().int().min(0).max(18), schemaVersion: z.literal(2), asReceivedConfirmed: z.literal(true), profileCode: z.string().trim().min(1) });
export const groupSchema = groupInputSchema.extend({ ...publication, profileBindings: z.array(z.object({ sourceId: idSchema, profileRuleId: idSchema, profileSettingId: idSchema })).nullish() });
export const reviewRowSchema = z.object({ id: idSchema, resultId: idSchema, sourceId: idSchema, absoluteUncertainty: decimalText.nullish(),
  reportingThreshold: decimalText.nullish(), supersededResultIds: z.array(idSchema).optional(), supersedesId: idSchema.nullish(), note: n.optional(), previewFingerprint: n.optional() });
export const reportReviewSchema = z.object({ companyId: idSchema, effectiveFrom: dateTime.nullable(), rows: z.array(reviewRowSchema).max(10000), asReceivedConfirmed: z.boolean() });
const reviewResponseSchema = z.object({ reportId: idSchema, effectiveFrom: dateTime, rows: z.array(z.object({ input: reviewRowSchema, label: z.string(),
  rawUncertainty: n, profile: ruleSchema.nullable(), setting: settingSchema.nullable(), assessment: z.unknown(), reasons: z.array(z.string()),
  conflictingResults: z.array(z.unknown()), existingSelections: z.array(z.unknown()), published: z.boolean() })) });
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export type ResidueCollection = 'rules' | 'settings' | 'selections' | 'groups';
const paths = { rules: '/api/residue-rules', settings: '/api/residue-policy-settings', selections: '/api/residue-report-selections', groups: '/api/residue-source-groups' };
export type ResidueCommand = { kind: ResidueCollection; data: unknown } | { kind: 'retire'; rule: ResidueRule; data: { reason: string } }
  | { kind: 'settingsBatch'; data: unknown } | { kind: 'reviewConfirm'; reportId: string; data: unknown };
export function mayManageRule(user: AuthUser, companyId: string | null | undefined) {
  return companyId == null ? permission(user, 'residue.policy.manage') : user.organizationId === companyId && permission(user, 'residue.company-policy.manage');
}
export function mayRetireRule(user: AuthUser, rule: ResidueRule) { return !rule.retirement && mayManageRule(user, rule.companyId); }
function validateReview(data: Record<string, unknown>) {
  if (typeof data.effectiveFrom === 'string' && typeof data.effectiveTo === 'string' && Date.parse(data.effectiveTo) <= Date.parse(data.effectiveFrom)) throw new ApiError('End must follow start.', 0, 'contract');
  if (typeof data.reviewedAt === 'string' && Date.parse(data.reviewedAt) > Date.now()) throw new ApiError('Review must be completed.', 0, 'contract');
}
function validateRule(data: z.infer<typeof ruleInputSchema>) {
  validateReview(data);
  if (!data.laboratory.length && !data.steps.length) throw new ApiError('At least one method or processing step is required.', 0, 'contract');
  uniqueBy(data.laboratory, (lab) => lab.analyticalMethod); uniqueBy(data.steps, (step) => step.id);
  for (const step of data.steps) if (new Decimal(step.factorLower).lt(0) || new Decimal(step.factorLower).gt(step.factorUpper)) throw new ApiError('Invalid factor interval.', 0, 'contract');
}
export function prepareReviewConfirmation(response: ReviewResponse, asReceived: boolean) {
  if (!asReceived || !response.rows.length || response.rows.some((row) => row.reasons.length || !row.input.previewFingerprint)) throw new ApiError('Resolve preview reasons before confirmation.', 0, 'contract');
  uniqueBy(response.rows, (row) => row.input.id);
  return { effectiveFrom: response.effectiveFrom, rows: response.rows.map((row) => row.input), asReceivedConfirmed: true };
}
export function createResidueService(api: ApiClient, user: AuthUser, current: () => boolean) {
  const transport = scopedApi(api, user, current);
  const sameCompany = (company: string) => Boolean(user.organizationId && company === user.organizationId);
  async function list(kind: ResidueCollection, signal: AbortSignal): Promise<unknown[]> {
    const schema = kind === 'rules' ? ruleSchema : kind === 'settings' ? settingSchema : kind === 'selections' ? selectionSchema : groupSchema;
    const response = await transport.request(paths[kind], { signal });
    const rows = contract(z.object({ items: z.array(z.unknown()) }), response).items.map((item) => contract(schema as z.ZodType, item)) as { id: string }[];
    return uniqueBy(rows, (row) => row.id);
  }
  return {
    list,
    async rules(signal: AbortSignal) { return await list('rules', signal) as ResidueRule[]; },
    async detail(kind: ResidueCollection, id: string, signal: AbortSignal) {
      const schema = kind === 'rules' ? ruleSchema : kind === 'settings' ? settingSchema : kind === 'selections' ? selectionSchema : groupSchema;
      const value = contract(schema as z.ZodType<{ id: string }>, await transport.request(`${paths[kind]}/${endpointId(id)}`, { signal }));
      if (value.id !== id) throw new ApiError('Mismatched residue record.', 0, 'contract'); return value;
    },
    async rule(id: string, signal: AbortSignal) {
      const value = contract(ruleSchema, await transport.request(`${paths.rules}/${endpointId(id)}`, { signal }));
      if (value.id !== id) throw new ApiError('Mismatched profile.', 0, 'contract'); return value;
    },
    async previewSelection(data: unknown, signal: AbortSignal) {
      const request = contract(selectionInputSchema, data); validateReview(request);
      const result = await transport.request(`${paths.selections}/preview`, { method: 'POST', data: request, signal }, sameCompany(request.companyId) && permission(user, 'residue.evidence.manage'));
      return contract(z.object({ reasons: z.array(z.string()) }).passthrough(), result);
    },
    async previewReview(reportId: string, data: unknown, signal: AbortSignal) {
      const request = contract(reportReviewSchema, data);
      const result = contract(reviewResponseSchema, await transport.request(`/api/lab-reports/${endpointId(reportId)}/residue-review/preview`,
        { method: 'POST', data: request, signal }, sameCompany(request.companyId) && permission(user, 'residue.evidence.manage')));
      if (result.reportId !== reportId) throw new ApiError('Mismatched review.', 0, 'contract'); return result;
    },
    async execute(command: ResidueCommand, signal: AbortSignal) {
      transport.check(signal);
      if (command.kind === 'retire') {
        const data = contract(z.object({ reason: z.string().trim().min(1) }), command.data);
        await transport.request(`${paths.rules}/${endpointId(command.rule.id)}/retire`, { method: 'POST', data, signal }, mayRetireRule(user, command.rule)); return;
      }
      if (command.kind === 'reviewConfirm') {
        const data = contract(reportReviewSchema, command.data);
        if (!data.asReceivedConfirmed || !data.effectiveFrom || !data.rows.length || data.rows.some((row) => !row.previewFingerprint)) throw new ApiError('Preview is required.', 0, 'contract');
        await transport.request(`/api/lab-reports/${endpointId(command.reportId)}/residue-review/confirm`, { method: 'POST', data, signal }, sameCompany(data.companyId) && permission(user, 'residue.evidence.manage')); return;
      }
      if (command.kind === 'settingsBatch') {
        const data = contract(z.object({ items: z.array(settingInputSchema).min(1).max(100) }), command.data);
        uniqueBy(data.items, (item) => item.id); uniqueBy(data.items, (item) => item.ruleCode); data.items.forEach(validateReview);
        await transport.request(`${paths.settings}/batch`, { method: 'POST', data, signal }, permission(user, 'residue.company-policy.manage') && data.items.every((item) => sameCompany(item.companyId))); return;
      }
      const schema = command.kind === 'rules' ? ruleInputSchema : command.kind === 'settings' ? settingInputSchema : command.kind === 'selections' ? selectionInputSchema : groupInputSchema;
      const data = contract(schema as z.ZodType<Record<string, unknown>>, command.data); validateReview(data);
      if (command.kind === 'rules') validateRule(data as z.infer<typeof ruleInputSchema>);
      const allowed = command.kind === 'rules' ? mayManageRule(user, data.companyId as string | null)
        : sameCompany(data.companyId as string) && permission(user, command.kind === 'settings' ? 'residue.company-policy.manage' : 'residue.evidence.manage');
      await transport.request(paths[command.kind], { method: 'POST', data, signal }, allowed);
    },
  };
}
