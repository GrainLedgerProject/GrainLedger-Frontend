export const compliancePaths = {
  samples: "/compliance/lab-samples",
  newSample: "/compliance/lab-samples/new",
  results: "/compliance/lab-results",
  result: "/compliance/lab-results/:id",
  safetyMargin: "/compliance/safety-margin",
  byproductMixing: "/compliance/byproduct-mixing",
  profiles: "/compliance/residue-profiles",
  residueRisk: "/compliance/residue-risk",
  residueEvidence: "/compliance/residue-evidence",
  companyPolicies: "/compliance/company-policies",
} as const;

export function labResultPath(id: string) {
  return compliancePaths.result.replace(":id", encodeURIComponent(id));
}
