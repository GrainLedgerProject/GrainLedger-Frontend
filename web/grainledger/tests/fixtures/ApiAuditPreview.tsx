/** Development-only fixture. All API traffic is intercepted; no backend records are written. */
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@/index.css";
import "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import { AppLayout } from "@/components/AppLayout/AppLayout";
import { FeedbackHost } from "@/components/FeedbackHost/FeedbackHost";
import { MrlVersionsPage } from "@/features/catalogs/pages/MrlVersionsPage";
import { CompanyResiduePoliciesPage } from "@/features/compliance/pages/CompanyResiduePoliciesPage";
import { auditPage, auditProfile, auditVersion } from "./apiAuditData";

const previewUrl = new URL(location.href);
if (previewUrl.searchParams.get("theme") === "dark")
  document.documentElement.classList.add("dark");
useAuthStore.setState({
  user: {
    id: "preview",
    email: "preview@example.com",
    displayName: "Nguyễn Minh An",
    role: "CUSTOMER_MANAGER",
    organizationId: "company",
    organizationName: "Lúa Việt · Tiền Giang",
    isActive: true,
    permissions: [
      "platform.configure",
      "mrl.read",
      "residue.company-policy.manage",
      "residue.policy.manage",
    ],
  },
  accessToken: "mock-preview",
  refreshToken: null,
  isAuthenticated: true,
});
useUiStore.setState({
  isOnline: true,
  isBackendConnected: true,
  hasInitialChecked: true,
});
window.fetch = async (input) => {
  const url = new URL(String(input), location.origin);
  const path = url.pathname;
  const payload =
    path === "/api/markets"
      ? auditPage([{ id: "market-1", code: "JP", name: "Nhật Bản" }])
      : path === "/api/commodities"
        ? auditPage([{ id: "rice-1", code: "RICE", name: "Gạo trắng hạt dài" }])
        : path === "/api/active-substances"
          ? auditPage([
              { id: "sub-1", code: "REAL-1", name: "Hoạt chất đã đối soát" },
            ])
          : path === "/api/mrl-versions"
            ? auditPage([
                auditVersion,
                {
                  ...auditVersion,
                  id: "mrl-published",
                  versionNo: 2,
                  status: "PUBLISHED",
                  sourceRef: "Regulation (EC) No 396/2005",
                  publishedAt: "2026-11-01T00:00:00Z",
                },
              ])
            : path.endsWith("/limits")
              ? auditPage([
                  {
                    id: "limit-1",
                    mrlVersionId: "mrl-1",
                    substanceId: "sub-1",
                    limitValue: 0.125,
                    unit: "mg/kg",
                  },
                ])
              : path.startsWith("/api/mrl-versions/")
                ? path.includes("published")
                  ? { ...auditVersion, status: "PUBLISHED" }
                  : auditVersion
                : path === "/api/residue-rules"
                  ? {
                      items: [
                        auditProfile,
                        {
                          ...auditProfile,
                          id: "profile-2",
                          code: "RICE-FLOW-02",
                          residueDefinition:
                            "Quy tắc khoa học cho gạo thành phẩm",
                        },
                      ],
                    }
                  : path === "/api/residue-policy-settings"
                    ? {
                        items: [
                          {
                            id: "setting-1",
                            companyId: "company",
                            ruleCode: "RICE-FLOW-01",
                            versionNo: 1,
                            mode: "SYSTEM_DEFAULT",
                            effectiveFrom: "2026-11-10T00:00:00Z",
                            effectiveTo: null,
                            supersedesId: null,
                            evidenceRef: "QA/2026/001",
                            applicabilityStatement:
                              "Gạo nguyên liệu từ nguồn đã kiểm định",
                            reviewedBy: "Nguyễn Minh An",
                            reviewAuthority: "Quản lý chất lượng",
                            reviewedAt: "2026-11-01T00:00:00Z",
                          },
                        ],
                      }
                    : path.includes("notifications")
                      ? auditPage([])
                      : { items: [] };
  return Response.json(payload, { headers: { ETag: '"7"' } });
};
const route =
  previewUrl.searchParams.get("page") === "policies"
    ? "/compliance/company-policies"
    : "/compliance/mrl-versions";
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/compliance/mrl-versions"
            element={<MrlVersionsPage />}
          />
          <Route
            path="/compliance/company-policies"
            element={<CompanyResiduePoliciesPage />}
          />
        </Route>
      </Routes>
      <FeedbackHost />
    </MemoryRouter>
  </QueryClientProvider>,
);
