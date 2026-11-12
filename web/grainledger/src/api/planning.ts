import { requestApi, type ApiRequest } from './openapi';
import type * as Schemas from './generated/schemas';

export const planningEndpoints = {
  getBlendPlans: (id: string) => requestApi('GET /api/export-containers/{id}/blend-plans', { path: { id } }),
  createDraft: (id: string, body: Schemas.CreateBlendPlanDraftRequest) => requestApi('POST /api/export-containers/{id}/blend-plans/drafts', { path: { id }, body }),
  getBlendPlan: (id: string) => requestApi('GET /api/blend-plans/{id}', { path: { id } }),
  getHistory: (id: string) => requestApi('GET /api/blend-plans/{id}/history', { path: { id } }),
  previewResidue: (id: string, body: Schemas.PlanResiduePreviewRequest) => requestApi('POST /api/blend-plans/{id}/residue-preview', { path: { id }, body }),
  previewPlan: (id: string, body: Schemas.PreviewBlendPlanRequest) => requestApi('POST /api/blend-plans/{id}/preview', { path: { id }, body }),
  proposePlan: (id: string, body: Schemas.ProposeBlendPlanRequest) => requestApi('POST /api/blend-plans/{id}/propose', { path: { id }, body }),
  getProposal: (id: string) => requestApi('GET /api/blend-plans/{id}/proposal', { path: { id } }),
  cancelDraft: (id: string, body: Schemas.CancelBlendPlanDraftRequest) => requestApi('POST /api/blend-plans/{id}/cancel', { path: { id }, body }),
  getApplicableAssessmentPolicy: (query: ApiRequest<'GET /api/blend-assessment-policies/applicable'>['query']) => requestApi('GET /api/blend-assessment-policies/applicable', { query }),
  publishAssessmentPolicy: (body: Schemas.PublishBlendAssessmentPolicyRequest) => requestApi('POST /api/blend-assessment-policies', { body }),
  createYieldRule: (body: Schemas.JsonObject) => requestApi('POST /api/ledger/planning-yield-rules', { body }),
  getApplicableYieldRules: (query: ApiRequest<'GET /api/ledger/planning-yield-rules/applicable'>['query']) => requestApi('GET /api/ledger/planning-yield-rules/applicable', { query }),
  createQualityObservation: (body: Schemas.JsonObject) => requestApi('POST /api/ledger/planning-quality-observations', { body }),
  getQualityObservations: (query: ApiRequest<'GET /api/ledger/planning-quality-observations'>['query']) => requestApi('GET /api/ledger/planning-quality-observations', { query }),
};
