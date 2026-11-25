import { apiFetch } from "./client";
import { withApiQuery, type ApiPage, type PageQuery } from "./query";

export interface PreparationSummary {
  id: string;
  code: string;
  facilityId: string;
  targetKg: string;
  status: string;
}

export interface PreparationLine {
  lotId: string;
  locationId: string;
  quantityKg: string;
  poolRevision?: string | number | null;
}

export interface ContainerPreparation extends PreparationSummary {
  preparationVersion?: number;
  version: string;
  orderId: string | null;
  containerNumber: string | null;
  sealNumber: string | null;
  committedLoadedKg: string;
  remainingKg: string;
  drafts: { id: string; loadedAt: string; totalKg: string; lines: PreparationLine[] }[];
}

interface PreparationMetadata {
  orderId?: string | null;
  containerNumber?: string | null;
  sealNumber?: string | null;
}

interface PreparationRevision {
  requestId: string;
  version: string;
}

export interface PreparationCheck {
  ready: boolean;
  complete: boolean;
  scope: "LOADING_DRAFT" | "CLOSURE";
  findings: { code: string; message: string }[];
}

function post<T>(path: string, body: object) {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export const containerPreparationEndpoints = {
  list: (query?: PageQuery & { search?: string }) =>
    apiFetch<ApiPage<PreparationSummary>>(withApiQuery("/api/ledger/containers", query)),
  create: (body: PreparationMetadata & { id: string; requestId: string; code: string; facilityId: string; targetKg: string }) =>
    post<ContainerPreparation>("/api/ledger/containers", body),
  detail: (id: string) =>
    apiFetch<ContainerPreparation>(`/api/ledger/containers/${encodeURIComponent(id)}`),
  history: (id: string, query?: Pick<PageQuery, "page" | "pageSize">) =>
    apiFetch<ApiPage<{ id: string; kind: string; actorId: string; recorded_at: string }>>(
      withApiQuery(`/api/ledger/containers/${encodeURIComponent(id)}/history`, query),
    ),
  updateMetadata: (id: string, body: PreparationRevision & PreparationMetadata) =>
    post<ContainerPreparation>(`/api/ledger/containers/${encodeURIComponent(id)}/metadata`, body),
  saveDraft: (id: string, body: PreparationRevision & { draftId: string; loadedAt: string; lines: PreparationLine[] }) =>
    post<ContainerPreparation>(`/api/ledger/containers/${encodeURIComponent(id)}/loading-draft`, body),
  checkLoading: (id: string, draftId: string) =>
    post<PreparationCheck>(`/api/ledger/containers/${encodeURIComponent(id)}/loading-check`, { draftId }),
  checkClosure: (id: string) =>
    post<PreparationCheck>(`/api/ledger/containers/${encodeURIComponent(id)}/close-check`, {}),
  // The preparation API currently rejects these transitions with 409.
  // Actual inventory postings use the approved Export execution API.
  commitLoading: (id: string, body: PreparationRevision & { draftId: string }) =>
    post<PreparationCheck>(`/api/ledger/containers/${encodeURIComponent(id)}/commit-loading`, body),
  close: (id: string, body: PreparationRevision) =>
    post<PreparationCheck>(`/api/ledger/containers/${encodeURIComponent(id)}/close`, body),
};
