import { apiFetch } from "./client";

/** Endpoints for reviewed residue rules, policy settings and evidence selection. */
export const residueEndpoints = {
  getSourceGroups: () =>
    apiFetch<{ items: ResidueSourceGroupVersion[] }>(
      "/api/residue-source-groups",
    ),
  createSourceGroup: (body: ResidueSourceGroupVersion) =>
    apiFetch<ResidueSourceGroupVersion>("/api/residue-source-groups", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getSourceGroup: (id: string) =>
    apiFetch<ResidueSourceGroupVersion>(
      `/api/residue-source-groups/${encodeURIComponent(id)}`,
    ),
  getRules: () =>
    apiFetch<{ items: ResidueProfileVersion[] }>("/api/residue-rules"),
  createRule: (body: ResidueProfileVersion) =>
    apiFetch<ResidueProfileVersion>("/api/residue-rules", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getRule: (id: string) =>
    apiFetch<ResidueProfileVersion>(
      `/api/residue-rules/${encodeURIComponent(id)}`,
    ),
  retireRule: (id: string, body: RetireResidueProfileRequest) =>
    apiFetch<ResidueProfileRetirement>(
      `/api/residue-rules/${encodeURIComponent(id)}/retire`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  getPolicySettings: () =>
    apiFetch<{ items: ResiduePolicySettingVersion[] }>(
      "/api/residue-policy-settings",
    ),
  createPolicySetting: (request: ResiduePolicySettingVersion) =>
    apiFetch<ResiduePolicySettingVersion>("/api/residue-policy-settings", {
      method: "POST",
      body: JSON.stringify(request),
    }),
  getPolicySetting: (id: string) =>
    apiFetch<ResiduePolicySettingVersion>(
      `/api/residue-policy-settings/${encodeURIComponent(id)}`,
    ),
  batchPolicySettings: (request: ResiduePolicySettingBatch) =>
    apiFetch<{ items: ResiduePolicySettingVersion[] }>(
      "/api/residue-policy-settings/batch",
      {
        method: "POST",
        body: JSON.stringify(request),
      },
    ),
  getReportSelections: () =>
    apiFetch<{ items: ResidueReportSelection[] }>(
      "/api/residue-report-selections",
    ),
  createReportSelection: (request: ResidueReportSelection) =>
    apiFetch<ResidueReportSelection>("/api/residue-report-selections", {
      method: "POST",
      body: JSON.stringify(request),
    }),
  getReportSelection: (id: string) =>
    apiFetch<ResidueReportSelection>(
      `/api/residue-report-selections/${encodeURIComponent(id)}`,
    ),
  previewReportSelection: (request: ResidueReportSelection) =>
    apiFetch<unknown>("/api/residue-report-selections/preview", {
      method: "POST",
      body: JSON.stringify(request),
    }),
  previewLabReportReview: (
    reportId: string,
    request: ResidueReportReviewRequest,
  ) =>
    apiFetch<unknown>(
      `/api/lab-reports/${encodeURIComponent(reportId)}/residue-review/preview`,
      { method: "POST", body: JSON.stringify(request) },
    ),
  confirmLabReportReview: (
    reportId: string,
    request: ResidueReportReviewRequest,
  ) =>
    apiFetch<unknown>(
      `/api/lab-reports/${encodeURIComponent(reportId)}/residue-review/confirm`,
      { method: "POST", body: JSON.stringify(request) },
    ),
};

export interface ResidueLaboratorySettings {
  analyticalMethod: string;
  numericInterpretationKind: null | string;
  relativeUncertaintyPercent: null | string;
  relativeUncertaintyAtZero: boolean;
  belowLimit: boolean;
  ndThresholdKind: null | string;
}

export interface ResiduePolicySettingBatch {
  items: Array<ResiduePolicySettingVersion>;
}

export interface ResiduePolicySettingVersion {
  id: string;
  companyId: string;
  ruleCode: string;
  versionNo: number;
  mode: "SYSTEM_DEFAULT" | "COMPANY_OVERRIDE";
  effectiveFrom: string;
  effectiveTo: null | string;
  supersedesId: null | string;
  evidenceRef: string;
  applicabilityStatement: string;
  reviewedBy: string;
  reviewAuthority: string;
  reviewedAt: string;
  publishedBy?: null | string;
  publishedAt?: null | string;
}

export interface ResidueProcessStep {
  id: string;
  process: string;
  inputStage: string;
  outputStage: string;
  outputFraction: string;
  conditions: string;
  factorLower: string;
  factorUpper: string;
  factorSemantics: string;
  anchorStage: null | string;
  homogeneousMixing: boolean;
}

export interface ResidueProfileBinding {
  sourceId: string;
  profileRuleId: string;
  profileSettingId: string;
}

export interface ResidueProfileRetirement {
  profileId: string;
  code: string;
  companyId: null | string;
  reason: string;
  retiredBy: string;
  retiredAt: string;
}

export interface ResidueProfileVersion {
  id: string;
  code: string;
  versionNo: number | string;
  kind: string;
  schemaVersion: number | string;
  substanceId: string;
  commodityId: null | string;
  residueDefinition: string;
  unit: string;
  decimalPlaces: number | string;
  laboratory: Array<ResidueLaboratorySettings>;
  steps: Array<ResidueProcessStep>;
  asReceivedConfirmed: boolean;
  effectiveFrom: string;
  effectiveTo: null | string;
  supersedesId: null | string;
  evidenceRef: string;
  applicabilityStatement: string;
  reviewedBy: string;
  reviewAuthority: string;
  reviewedAt: string;
  publishedBy?: null | string;
  publishedAt?: null | string;
  companyId?: null | string;
  retirement?: null | ResidueProfileRetirement;
}

export interface ResidueReportReviewRequest {
  companyId: string;
  effectiveFrom: null | string;
  rows: Array<ResidueReportReviewRow>;
  asReceivedConfirmed: boolean;
}

export interface ResidueReportReviewRow {
  id: string;
  resultId: string;
  sourceId: string;
  absoluteUncertainty?: null | string;
  reportingThreshold?: null | string;
  supersededResultIds?: null | Array<string>;
  supersedesId?: null | string;
  note?: null | string;
  previewFingerprint?: null | string;
}

export interface ResidueReportSelection {
  id: string;
  companyId: string;
  sourceId: string;
  substanceId: string;
  selectedResultId: string;
  supersededResultIds: Array<string>;
  residueDefinition: string;
  absoluteUncertainty: null | string;
  reportingThreshold: null | string;
  effectiveFrom: string;
  effectiveTo: null | string;
  supersedesId: null | string;
  evidenceRef: string;
  applicabilityStatement: string;
  reviewedBy: string;
  reviewAuthority: string;
  reviewedAt: string;
  publishedBy?: null | string;
  publishedAt?: null | string;
  bindingReportId?: null | string;
  profileRuleId?: null | string;
  profileSettingId?: null | string;
  bindingRequest?: null | string;
  bindingFingerprint?: null | string;
  bindingNote?: null | string;
  schemaVersion?: number | string;
  asReceivedConfirmed?: boolean;
  profileCode?: null | string;
  laboratoryMethod?: null | string;
}

export interface ResidueSourceGroupVersion {
  id: string;
  companyId: string;
  code: string;
  versionNo: number | string;
  substanceId: string;
  sourceIds: Array<string>;
  productStage: string;
  productIdentity: string;
  residueDefinition: string;
  lower: string;
  upper: string;
  unit: string;
  precedence: string;
  supportingResultIds: Array<string>;
  effectiveFrom: string;
  effectiveTo: null | string;
  supersedesId: null | string;
  evidenceRef: string;
  applicabilityStatement: string;
  reviewedBy: string;
  reviewAuthority: string;
  reviewedAt: string;
  publishedBy?: null | string;
  publishedAt?: null | string;
  decimalPlaces?: number | string;
  schemaVersion?: number | string;
  asReceivedConfirmed?: boolean;
  profileCode?: null | string;
  profileBindings?: null | Array<ResidueProfileBinding>;
}

export interface RetireResidueProfileRequest {
  reason: string;
}
