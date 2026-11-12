import type * as ApiSchemas from './generated/schemas';
export type { FarmerInput, RegisterFarmerRequest, RegisterPlotRequest, ProcurementLineInput, ProcurementInput, RegisterProcurementRequest, RecordSprayDeclarationRequest, FarmerDuplicateRequest, PlotDuplicateRequest, CreateCropSeasonRequest, UpdateCropSeasonRequest, DeleteCropSeasonRequest, RegisterPlotSeasonRequest, UpdatePlotSeasonRequest, DeletePlotSeasonRequest } from './generated/schemas';
import { apiFetch } from "./client";

/**
 * Initial stock recorded for line item
 */
export interface ProcurementInitialStock {
  locationId: string;
  receivedKg: string;
}

/**
 * Line response from backend
 */
export interface ProcurementLineResponse {
  id: string;
  lineNo: number;
  plotSeasonId: string;
  plotId: string;
  seasonId: string;
  riceVariety: string;
  measuredValue: string;
  measuredUnit: string;
  netMassKg: string;
  moisturePercent: string;
  sourceLotId: string;
  lotId: string;
  lotCode: string;
  stage: string;
  initialStock?: ProcurementInitialStock;
}

/**
 * Full response from POST /api/procurements and GET /api/procurements/{id}
 */
export interface ProcurementResponse {
  id: string;
  code: string;
  farmerId: string;
  collectionSiteId: string;
  receivingLocationId: string;
  commodityId: string;
  status: string;
  receivedBy: string;
  receivedAt: string;
  capturedAt: string;
  recordedAt: string;
  eventId: string;
  totalNetMassKg: string;
  items: ProcurementLineResponse[];
  receivingVersion?: number;
}

/**
 * Summary item for procurement list response
 */
export interface ProcurementSummary {
  id: string;
  code: string;
  farmerId: string;
  farmerName: string;
  receivedAt: string;
  status: string;
  itemCount: number;
  totalNetMassKg: string;
}

export interface ProcurementListResponse {
  items: ProcurementSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

/**
 * Reference data types returned by GET /api/procurement-reference-data
 */
export interface ProcurementReceivingOption {
  collectionSiteId: string;
  collectionSiteCode: string;
  collectionSiteName: string;
  receivingLocationId: string;
  receivingLocationCode: string;
}

export interface ProcurementCommodity {
  id: string;
  code: string;
  name: string;
}

export interface ProcurementMassUnit {
  code: string;
  name: string;
  kgFactor: string;
}

export interface ProcurementReferenceResponse {
  receivingOptions: ProcurementReceivingOption[];
  commodity: ProcurementCommodity;
  massUnits: ProcurementMassUnit[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
  hasMore?: boolean;
  maxLinesPerReceipt?: number;
}

export const procurementEndpoints = {
  getReferenceData: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<ProcurementReferenceResponse>(`/api/procurement-reference-data${qs}`);
  },
  getProcurementReferenceData: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<ProcurementReferenceResponse>(`/api/procurement-reference-data${qs}`);
  },
  getSourceLot: (id: string) => apiFetch<unknown>(`/api/source-lots/${encodeURIComponent(id)}`),

  // Farmers
  getFarmers: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<unknown>(`/api/farmers${qs}`);
  },
  createFarmer: (req: ApiSchemas.RegisterFarmerRequest) =>
    apiFetch<unknown>("/api/farmers", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  checkFarmerDuplicate: (req: ApiSchemas.FarmerDuplicateRequest) =>
    apiFetch<unknown>("/api/farmers/duplicate-check", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateFarmer: (id: string, req: ApiSchemas.UpdateFarmerRequest) =>
    apiFetch<unknown>(`/api/farmers/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deleteFarmer: (id: string, req: ApiSchemas.DeleteReferenceRequest) =>
    apiFetch<unknown>(`/api/farmers/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),
  getFarmer: (id: string) => apiFetch<unknown>(`/api/farmers/${encodeURIComponent(id)}`),

  // Plots
  getPlots: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<unknown>(`/api/plots${qs}`);
  },
  createPlot: (req: ApiSchemas.RegisterPlotRequest) =>
    apiFetch<unknown>("/api/plots", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  checkPlotDuplicate: (req: ApiSchemas.PlotDuplicateRequest) =>
    apiFetch<unknown>("/api/plots/duplicate-check", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updatePlot: (id: string, req: ApiSchemas.UpdatePlotRequest) =>
    apiFetch<unknown>(`/api/plots/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deletePlot: (id: string, req: ApiSchemas.DeleteReferenceRequest) =>
    apiFetch<unknown>(`/api/plots/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),
  getPlot: (id: string) => apiFetch<unknown>(`/api/plots/${encodeURIComponent(id)}`),

  // Crop Seasons
  getCropSeasons: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<unknown>(`/api/crop-seasons${qs}`);
  },
  getCropSeason: (id: string) => apiFetch<unknown>(`/api/crop-seasons/${encodeURIComponent(id)}`),
  createCropSeason: (req: ApiSchemas.CreateCropSeasonRequest) =>
    apiFetch<unknown>("/api/crop-seasons", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateCropSeason: (id: string, req: ApiSchemas.UpdateCropSeasonRequest) =>
    apiFetch<unknown>(`/api/crop-seasons/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deleteCropSeason: (id: string, req: ApiSchemas.DeleteCropSeasonRequest) =>
    apiFetch<unknown>(`/api/crop-seasons/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),

  // Plot Seasons
  getPlotSeasons: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<unknown>(`/api/plot-seasons${qs}`);
  },
  getPlotSeason: (id: string) => apiFetch<unknown>(`/api/plot-seasons/${encodeURIComponent(id)}`),
  createPlotSeason: (req: ApiSchemas.RegisterPlotSeasonRequest) =>
    apiFetch<unknown>("/api/plot-seasons", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updatePlotSeason: (id: string, req: ApiSchemas.UpdatePlotSeasonRequest) =>
    apiFetch<unknown>(`/api/plot-seasons/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deletePlotSeason: (id: string, req: ApiSchemas.DeletePlotSeasonRequest) =>
    apiFetch<unknown>(`/api/plot-seasons/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),

  // Spray Declarations
  getSprayDeclarations: () => apiFetch<unknown>("/api/spray-declarations"),
  getSprayDeclaration: (id: string) =>
    apiFetch<unknown>(`/api/spray-declarations/${encodeURIComponent(id)}`),
  recordSprayDeclaration: (req: ApiSchemas.RecordSprayDeclarationRequest) =>
    apiFetch<unknown>("/api/spray-declarations", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  // Procurements (POST /api/procurements, GET /api/procurements)
  getProcurements: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<ProcurementListResponse | ProcurementSummary[]>(`/api/procurements${qs}`);
  },
  registerProcurement: (req: ApiSchemas.RegisterProcurementRequest) =>
    apiFetch<ProcurementResponse>("/api/procurements", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  getProcurement: (id: string) => apiFetch<ProcurementResponse>(`/api/procurements/${encodeURIComponent(id)}`),
};
