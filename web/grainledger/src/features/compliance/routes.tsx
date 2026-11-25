import { createElement, lazy } from "react";
import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { compliancePaths } from "./paths";

const labSampleRegistrationPage = lazy(() =>
  import("./pages/LabSampleRegistrationPage").then(module => ({ default: module.LabSampleRegistrationPage })),
);
const mrlComplianceCheckPage = lazyScreen(() =>
  import("./pages/MrlComplianceCheckPage").then(module => ({ default: module.MrlComplianceCheckPage })),
);
const safetyMarginPolicyPage = lazyScreen(() =>
  import("./pages/SafetyMarginPolicyPage").then(module => ({ default: module.SafetyMarginPolicyPage })),
);
const residueProfilesPage = lazyScreen(() =>
  import("./pages/ResidueProfilesPage").then(module => ({ default: module.ResidueProfilesPage })),
);
const companyResiduePoliciesPage = lazyScreen(() =>
  import("./pages/CompanyResiduePoliciesPage").then(module => ({ default: module.CompanyResiduePoliciesPage })),
);

export const complianceRoutes = [
  screenRoute(compliancePaths.samples, createElement(labSampleRegistrationPage, { defaultTab: "LIST" }), { roles: ["CUSTOMER_MANAGER"] }),
  screenRoute(compliancePaths.newSample, createElement(labSampleRegistrationPage, { defaultTab: "CREATE" }), { roles: ["CUSTOMER_MANAGER"] }),
  screenRoute(compliancePaths.results, mrlComplianceCheckPage, { roles: ["CUSTOMER_MANAGER"] }),
  screenRoute(compliancePaths.result, mrlComplianceCheckPage, { roles: ["CUSTOMER_MANAGER"] }),
  screenRoute(compliancePaths.safetyMargin, safetyMarginPolicyPage, { roles: ["CUSTOMER_MANAGER"] }),
  screenRoute(compliancePaths.profiles, residueProfilesPage, {
    roles: ["MILL_ADMIN", "CUSTOMER_MANAGER", "CUSTOMER_EXPORT_OFFICER", "MILL_MANAGER", "MILL_OPERATOR"],
    anyPermissions: [
      "residue.policy.manage",
      "residue.company-policy.manage",
      "residue.evaluate",
      "residue.evidence.manage",
    ],
  }),
  screenRoute(compliancePaths.residueEvidence, lazyScreen(() => import("./pages/ResidueEvidencePage").then(module => ({ default: module.ResidueEvidencePage }))), { roles: ["CUSTOMER_MANAGER"], permission: "residue.evidence.manage" }),
  screenRoute(compliancePaths.companyPolicies, companyResiduePoliciesPage, {
    roles: ["CUSTOMER_MANAGER"],
    permission: "residue.company-policy.manage",
  }),
];
