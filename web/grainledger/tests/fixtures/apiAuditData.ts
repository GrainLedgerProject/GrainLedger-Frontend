import type { MrlVersionDto } from "@/api/catalogs";
import type { ResidueProfileVersion } from "@/api/residue";

export const auditVersion: MrlVersionDto = {
  id: "mrl-1",
  marketId: "market-1",
  commodityId: "rice-1",
  versionNo: 3,
  status: "DRAFT",
  effectiveFrom: "2026-11-18T00:00:00Z",
  effectiveTo: null,
  publishedBy: null,
  publishedAt: null,
  sourceRef: "Regulation 2026 · Verified source",
};
export const auditProfile: ResidueProfileVersion = {
  id: "profile-1",
  code: "RICE-FLOW-01",
  versionNo: 2,
  kind: "FLOW",
  schemaVersion: 2,
  companyId: null,
  substanceId: "sub-1",
  commodityId: "rice-1",
  residueDefinition: "Reviewed rice residue definition",
  unit: "mg/kg",
  decimalPlaces: 6,
  laboratory: [
    {
      analyticalMethod: "LC-MS/MS",
      numericInterpretationKind: "MEASURED",
      relativeUncertaintyPercent: null,
      relativeUncertaintyAtZero: false,
      belowLimit: false,
      ndThresholdKind: null,
    },
  ],
  steps: [],
  asReceivedConfirmed: true,
  effectiveFrom: "2026-11-01T00:00:00Z",
  effectiveTo: null,
  supersedesId: null,
  evidenceRef: "LAB/REVIEW/2026/001",
  applicabilityStatement: "Rice from reviewed sources",
  reviewedBy: "Scientific reviewer",
  reviewAuthority: "Accredited laboratory",
  reviewedAt: "2026-11-01T00:00:00Z",
};
export function auditPage<T>(items: T[]) {
  return {
    items,
    page: 1,
    pageSize: 100,
    hasMore: false,
    totalCount: items.length,
  };
}
