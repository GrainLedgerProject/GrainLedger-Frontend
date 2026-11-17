// Web planning.ts wrappers + focused backend BlendAssessmentPolicies.cs: append-only company policy, NOT source demo constants.
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import type { AuthUser } from '../auth/contracts';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError } from '../../services/api/errors';
import { contract, dateTime, decimalText, idSchema, permission, positiveInt, scopedApi, uniqueBy } from './api-common';

export const assessmentPolicyInput = z.object({ id: idSchema, marketId: idSchema, commodityId: idSchema, versionNo: positiveInt, effectiveFrom: dateTime,
  effectiveTo: dateTime.nullable(), requiredSubstanceIds: z.array(idSchema).min(1).max(200),
  mrlMarginFraction: decimalText.refine((value) => new Decimal(value).gte(0) && new Decimal(value).lt(1) && new Decimal(value).decimalPlaces() <= 12),
  residueBasis: z.string().trim().min(1).max(100), qualityRules: z.array(z.object({ attributeId: idSchema, unit: z.string().trim().min(1).max(50), calculation: z.literal('MASS_WEIGHTED_MEAN') })).max(100),
  evidenceReference: z.string().trim().min(1).max(1000), reviewedBy: z.string().trim().min(1), reviewAuthority: z.string().trim().min(1), reviewedAt: dateTime });
export const assessmentPolicySchema = assessmentPolicyInput.extend({ companyId: idSchema, publishedBy: idSchema, publishedAt: dateTime });
export type AssessmentPolicy = z.infer<typeof assessmentPolicySchema>;
export const mayReadAssessmentPolicy = (user: AuthUser) => Boolean(user.organizationId && ['CUSTOMER_MANAGER', 'CUSTOMER_EXPORT_OFFICER'].includes(user.normalizedRole) && permission(user, 'export-orders.read'));
export const mayPublishAssessmentPolicy = (user: AuthUser) => Boolean(user.organizationId && user.normalizedRole === 'CUSTOMER_MANAGER' && permission(user, 'blend.assessment-policy.manage'));
export function createSafetyPolicyService(api: ApiClient, user: AuthUser, current: () => boolean) {
  const transport = scopedApi(api, user, current);
  return {
    async applicable(marketId: string, commodityId: string, at: string | undefined, signal: AbortSignal) {
      transport.check(signal, mayReadAssessmentPolicy(user));
      const query = { marketId: contract(idSchema, marketId), commodityId: contract(idSchema, commodityId), ...(at ? { at: contract(dateTime, at) } : {}) };
      const policy = contract(assessmentPolicySchema, await transport.request('/api/blend-assessment-policies/applicable', { query, signal }, mayReadAssessmentPolicy(user)));
      if (policy.companyId !== user.organizationId || policy.marketId !== marketId || policy.commodityId !== commodityId) throw new ApiError('Mismatched policy scope.', 0, 'contract');
      return policy;
    },
    async publish(body: unknown, signal: AbortSignal) {
      transport.check(signal, mayPublishAssessmentPolicy(user));
      const data = contract(assessmentPolicyInput, body);
      if (Date.parse(data.reviewedAt) > Date.now() || (data.effectiveTo && Date.parse(data.effectiveTo) <= Date.parse(data.effectiveFrom))) throw new ApiError('Invalid reviewed period.', 0, 'contract');
      uniqueBy(data.requiredSubstanceIds, (id) => id); uniqueBy(data.qualityRules, (row) => row.attributeId);
      await transport.request('/api/blend-assessment-policies', { method: 'POST', data, signal }, mayPublishAssessmentPolicy(user));
    },
  };
}
