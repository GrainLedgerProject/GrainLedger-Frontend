// Generated from openapi/v1.json by npm run api:generate. Do not edit.
import type * as Schemas from './schemas';

export interface ApiOperations {
  "GET /health": {
    request: object;
    response: unknown;
    errors: Record<string, never>;
  };
  "GET /api/procurement-reference-data": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/source-lots/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/residue-matrix/publish": {
    request: {
    body: Schemas.ResidueMatrixPublication;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-availability": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-containers/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PATCH /api/export-containers/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.UpdateExportContainerRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-containers/{id}/planning-context": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-containers/{id}/stock-preview": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-containers/{id}/inventory-scope": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-containers/{id}/candidates": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-containers/{id}/candidates/{lotId}/lineage": {
    request: {
    path: { "id": string; "lotId": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-containers/{id}/candidates/{lotId}/residue-preview": {
    request: {
    path: { "id": string; "lotId": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/auth/register": {
    request: {
    body: Schemas.RegisterRequest;
    };
    response: Schemas.RegistrationPendingDto;
    errors: { "409": Schemas.ProblemDetails; "503": Schemas.ProblemDetails };
  };
  "POST /api/auth/verify-email": {
    request: {
    body: Schemas.VerifyEmailRequest;
    };
    response: Schemas.SessionUserDto;
    errors: { "400": Schemas.ProblemDetails; "503": Schemas.ProblemDetails };
  };
  "POST /api/auth/resend-verification": {
    request: {
    body: Schemas.ResendVerificationRequest;
    };
    response: Schemas.RegistrationPendingDto;
    errors: { "429": Schemas.ProblemDetails };
  };
  "POST /api/auth/login": {
    request: {
    body: Schemas.LoginRequest;
    };
    response: Schemas.IssuedTokens;
    errors: { "401": Schemas.ProblemDetails };
  };
  "POST /api/auth/web-login": {
    request: {
    body: Schemas.LoginRequest;
    };
    response: Schemas.SessionUserDto;
    errors: { "400": Schemas.ProblemDetails; "401": Schemas.ProblemDetails };
  };
  "POST /api/auth/refresh": {
    request: {
    body: Schemas.RefreshRequest;
    };
    response: Schemas.IssuedTokens;
    errors: { "401": Schemas.ProblemDetails };
  };
  "POST /api/auth/forgot-password": {
    request: {
    body: Schemas.ForgotPasswordRequest;
    };
    response: unknown;
    errors: Record<string, never>;
  };
  "POST /api/auth/reset-password": {
    request: {
    body: Schemas.ResetPasswordRequest;
    };
    response: void;
    errors: Record<string, never>;
  };
  "GET /api/auth/csrf": {
    request: object;
    response: unknown;
    errors: Record<string, never>;
  };
  "GET /api/auth/google": {
    request: {
    query?: { "returnUrl"?: string };
    };
    response: unknown;
    errors: { "503": Schemas.ProblemDetails };
  };
  "GET /api/auth/google/complete": {
    request: {
    query?: { "returnUrl"?: string };
    };
    response: unknown;
    errors: Record<string, never>;
  };
  "GET /api/auth/session": {
    request: object;
    response: Schemas.SessionUserDto;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/auth/logout": {
    request: object;
    response: void;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/auth/logout-all": {
    request: object;
    response: void;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/profile": {
    request: object;
    response: Schemas.SessionUserDto;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/profile": {
    request: {
    body: Schemas.UpdateProfileRequest;
    };
    response: Schemas.SessionUserDto;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/admin/roles": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/admin/organizations": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/admin/organizations": {
    request: {
    body: Schemas.CreateOrganizationRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/admin/users": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/admin/users/{id}/access": {
    request: {
    path: { "id": string };
    headers: { "If-Match": string };
    body: Schemas.UpdateAccessRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/trace/starts": {
    request: {
    query?: { "Mode"?: string; "Search"?: string; "FacilityId"?: string; "LocationId"?: string; "Page"?: number | string; "PageSize"?: number | string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/trace": {
    request: {
    body: Schemas.LotTraceRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/trace/from-lab": {
    request: {
    body: Schemas.LabTraceRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/setup": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/lookups": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/lots": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/operations": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/operations": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/holds": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/holds": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/corrections": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/corrections": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/notifications": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/history": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/receiving-tasks": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/lots/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/operations/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/ledger/operations/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/ledger/operations/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/receiving/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/receiving/{id}/measurements": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/receiving/{id}/reviews": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/facilities": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/locations": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/equipment": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/assignments": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/policies": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/compatibilities": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/mixed-bulk-policies": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/locations/{id}/clearance": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/operations/{id}/confirm": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/operations/{id}/commit": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/transfers": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/holds/{id}/respond": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/corrections/{id}/reconcile": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/corrections/{id}/cancel": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/corrections/{id}/commit": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/notifications/{id}/read": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/evidence": {
    request: {
    body: Schemas.EvidenceRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/evidence/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/planning-yield-rules": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/planning-quality-observations": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/planning-quality-observations": {
    request: {
    query: { "ownerId": string; "facilityId": string; "lotIds": Array<string>; "at"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/planning-yield-rules/applicable": {
    request: {
    query: { "ownerId": string; "facilityId": string; "compatibilityPolicyId": string; "at"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/ledger/facilities/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/ledger/facilities/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/ledger/locations/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/ledger/locations/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/ledger/equipment/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/ledger/equipment/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/equipment/{id}/retire": {
    request: {
    path: { "id": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/ledger/assignments/{userId}/{facilityId}": {
    request: {
    path: { "userId": string; "facilityId": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/ledger/assignments/{userId}/{facilityId}": {
    request: {
    path: { "userId": string; "facilityId": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/receiving-thresholds": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/receiving-thresholds/companies": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/receiving-thresholds/history": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/receiving-thresholds/own-company": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/ledger/receiving-thresholds/default": {
    request: {
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/receiving-thresholds/companies/{companyId}": {
    request: {
    path: { "companyId": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/ledger/receiving-thresholds/companies/{companyId}": {
    request: {
    path: { "companyId": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/ledger/receiving-thresholds/companies/{companyId}": {
    request: {
    path: { "companyId": string };
    body: Schemas.JsonObject;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/lots/{lotId}/residue-preview": {
    request: {
    path: { "lotId": string };
    query?: { "substanceIds"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/ledger/lots/{lotId}/residue-evaluations": {
    request: {
    path: { "lotId": string };
    body: Schemas.ResidueEvaluationRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/lots/{lotId}/residue-evaluations": {
    request: {
    path: { "lotId": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/ledger/lots/{lotId}/residue-evaluations/{evaluationId}": {
    request: {
    path: { "lotId": string; "evaluationId": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/residue-report-selections/preview": {
    request: {
    body: Schemas.ResidueReportSelection;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/lab-reports/{reportId}/residue-review/preview": {
    request: {
    path: { "reportId": string };
    body: Schemas.ResidueReportReviewRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/lab-reports/{reportId}/residue-review/confirm": {
    request: {
    path: { "reportId": string };
    body: Schemas.ResidueReportReviewRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/samples": {
    request: {
    body: Schemas.CaptureSampleRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/samples": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/samples/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/samples/{id}/handovers": {
    request: {
    path: { "id": string };
    body: Schemas.RecordSampleHandoverRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/samples/{id}/handovers": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/lab-reports": {
    request: {
    body: Schemas.CaptureLabReportRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/lab-reports": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/lab-reports/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.CaptureLabReportRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/lab-reports/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.DeleteLabReportRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/lab-reports/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/lab-reports/{id}/file": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/lab-reports/{id}/confirm": {
    request: {
    path: { "id": string };
    body: Schemas.ConfirmLabReportRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/residue-source-groups": {
    request: {
    body: Schemas.ResidueSourceGroupVersion;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/residue-source-groups": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/residue-source-groups/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/residue-report-selections": {
    request: {
    body: Schemas.ResidueReportSelection;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/residue-report-selections": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/residue-report-selections/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/farmers": {
    request: {
    body: Schemas.RegisterFarmerRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/farmers": {
    request: {
    query?: { "search"?: string; "q"?: string; "page"?: number | string; "pageSize"?: number | string; "sortBy"?: string; "sortDirection"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/farmers/duplicate-check": {
    request: {
    body: Schemas.FarmerDuplicateRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/farmers/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/farmers/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.UpdateFarmerRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/farmers/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.DeleteReferenceRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/plots": {
    request: {
    body: Schemas.RegisterPlotRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/plots": {
    request: {
    query?: { "farmerId"?: string; "search"?: string; "q"?: string; "page"?: number | string; "pageSize"?: number | string; "sortBy"?: string; "sortDirection"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/plots/duplicate-check": {
    request: {
    body: Schemas.PlotDuplicateRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/plots/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/plots/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.UpdatePlotRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/plots/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.DeleteReferenceRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/crop-seasons": {
    request: {
    body: Schemas.CreateCropSeasonRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/crop-seasons": {
    request: {
    query?: { "companyId"?: string; "search"?: string; "q"?: string; "page"?: number | string; "pageSize"?: number | string; "sortBy"?: string; "sortDirection"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/crop-seasons/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/crop-seasons/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.UpdateCropSeasonRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/crop-seasons/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.DeleteCropSeasonRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/plot-seasons": {
    request: {
    body: Schemas.RegisterPlotSeasonRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/plot-seasons": {
    request: {
    query?: { "plotId"?: string; "seasonId"?: string; "search"?: string; "q"?: string; "page"?: number | string; "pageSize"?: number | string; "sortBy"?: string; "sortDirection"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/plot-seasons/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/plot-seasons/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.UpdatePlotSeasonRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/plot-seasons/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.DeletePlotSeasonRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/spray-declarations": {
    request: {
    body: Schemas.RecordSprayDeclarationRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/spray-declarations": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/spray-declarations/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/procurements": {
    request: {
    body: Schemas.RegisterProcurementRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/procurements": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/procurements/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/active-substances": {
    request: {
    body: Schemas.CreateActiveSubstanceRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/active-substances": {
    request: {
    query?: { "q"?: string; "page"?: string; "pageSize"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/active-substances/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PATCH /api/active-substances/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.UpdateActiveSubstanceRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/active-substances/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/markets": {
    request: {
    body: Schemas.CreateMarketRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/markets": {
    request: {
    query?: { "q"?: string; "page"?: string; "pageSize"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/markets/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PATCH /api/markets/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.UpdateMarketRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/commodities": {
    request: {
    body: Schemas.CreateCommodityRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/commodities": {
    request: {
    query?: { "q"?: string; "page"?: string; "pageSize"?: string; "sortBy"?: string; "sortDirection"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/commodities/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PATCH /api/commodities/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.UpdateCommodityRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/commodities/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/quality-attributes": {
    request: {
    body: Schemas.CreateQualityAttributeRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/quality-attributes": {
    request: {
    query?: { "q"?: string; "page"?: string; "pageSize"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/quality-attributes/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PATCH /api/quality-attributes/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.UpdateQualityAttributeRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/rice-varieties": {
    request: {
    body: Schemas.CreateRiceVarietyRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/rice-varieties": {
    request: {
    query?: { "q"?: string; "page"?: string; "pageSize"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/rice-varieties/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PATCH /api/rice-varieties/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.UpdateRiceVarietyRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/measurement-units": {
    request: {
    body: Schemas.CreateMeasurementUnitRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/measurement-units": {
    request: {
    query?: { "q"?: string; "page"?: string; "pageSize"?: string; "sortBy"?: string; "sortDirection"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/measurement-units/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PATCH /api/measurement-units/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.UpdateMeasurementUnitRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/measurement-units/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/mrl-versions": {
    request: {
    body: Schemas.CreateMrlVersionRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/mrl-versions": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/mrl-versions/import": {
    request: {
    body: Schemas.ImportMrlVersionRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/mrl-versions/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PATCH /api/mrl-versions/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.JsonElement;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/mrl-versions/{id}/limits": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PUT /api/mrl-versions/{id}/limits/{substanceId}": {
    request: {
    path: { "id": string; "substanceId": string };
    body: Schemas.UpsertMrlLimitRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "DELETE /api/mrl-versions/{id}/limits/{substanceId}": {
    request: {
    path: { "id": string; "substanceId": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/mrl-versions/{id}/publish": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/mrl-versions/resolve": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/residue-rules": {
    request: {
    body: Schemas.ResidueRuleVersion;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/residue-rules": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/residue-rules/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/residue-policy-settings": {
    request: {
    body: Schemas.ResiduePolicySettingVersion;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/residue-policy-settings": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/residue-policy-settings/batch": {
    request: {
    body: Schemas.ResiduePolicySettingBatch;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/residue-policy-settings/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/blend-assessment-policies/applicable": {
    request: {
    query: { "marketId": string; "commodityId": string; "at"?: string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/blend-assessment-policies": {
    request: {
    body: Schemas.PublishBlendAssessmentPolicyRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-orders": {
    request: object;
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/export-orders": {
    request: {
    body: Schemas.CreateExportOrderRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-orders/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "PATCH /api/export-orders/{id}": {
    request: {
    path: { "id": string };
    body: Schemas.UpdateExportOrderRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-orders/{id}/specifications": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/export-orders/{id}/specifications": {
    request: {
    path: { "id": string };
    body: Schemas.AddExportSpecificationRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-orders/{id}/containers": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/export-orders/{id}/containers": {
    request: {
    path: { "id": string };
    body: Schemas.AddExportContainersRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-orders/{id}/history": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/export-containers/{id}/blend-plans": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/export-containers/{id}/blend-plans/drafts": {
    request: {
    path: { "id": string };
    body: Schemas.CreateBlendPlanDraftRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/blend-plans/{id}": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/blend-plans/{id}/history": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/blend-plans/{id}/residue-preview": {
    request: {
    path: { "id": string };
    body: Schemas.PlanResiduePreviewRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/blend-plans/{id}/preview": {
    request: {
    path: { "id": string };
    body: Schemas.PreviewBlendPlanRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/blend-plans/{id}/propose": {
    request: {
    path: { "id": string };
    body: Schemas.ProposeBlendPlanRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "GET /api/blend-plans/{id}/proposal": {
    request: {
    path: { "id": string };
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
  "POST /api/blend-plans/{id}/cancel": {
    request: {
    path: { "id": string };
    body: Schemas.CancelBlendPlanDraftRequest;
    };
    response: unknown;
    errors: { "401": unknown; "403": unknown };
  };
}

export type ApiOperation = keyof ApiOperations;
