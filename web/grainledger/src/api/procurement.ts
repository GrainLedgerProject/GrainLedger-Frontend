import { apiFetch } from "./client";

export interface FarmerInput {
  code: string;
  name: string;
  contact: string;
}

export interface RegisterFarmerRequest {
  deviceId?: string | null;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number;
  payload: {
    entityId: string;
    code: string;
    name: string;
    contact: string;
  };
}

export interface RegisterPlotRequest {
  deviceId?: string | null;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number;
  payload: {
    entityId: string;
    farmerId: string;
    code: string;
    geometry: unknown;
    areaHa: number;
  };
}

/**
 * Line item schema for procurement receipt
 * Corresponds to ProcurementLineInput in backend specification
 */
export interface ProcurementLineInput {
  itemId: string; // uuid
  lineNo: number; // int32 >= 1
  plotSeasonId: string; // uuid
  measuredValue: string | null; // decimal string e.g. "5000.000"
  measuredUnit: string | null; // "KG" | "G" | "T"
  moisturePercent: string | null; // decimal string e.g. "24.5"
  lotId: string; // uuid
  sourceLotId: string; // uuid
}

/**
 * Main procurement payload schema
 * Corresponds to ProcurementInput in backend specification
 */
export interface ProcurementInput {
  entityId: string; // uuid
  farmerId: string; // uuid
  collectionSiteId: string; // uuid
  receivingLocationId: string; // uuid
  commodityId: string; // uuid
  receivedAt: string; // date-time ISO string
  items: ProcurementLineInput[] | null;
}

/**
 * Request body for POST /api/procurements
 * Corresponds to RegisterProcurementRequest in OpenAPI specification
 */
export interface RegisterProcurementRequest {
  deviceId: string | null;
  clientOperationId: string; // uuid
  capturedAt: string; // date-time ISO string
  payloadSchemaVersion: number; // int32 e.g. 1
  payload: ProcurementInput | null;
}

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

export interface RecordSprayDeclarationRequest {
  deviceId?: string | null;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number;
  payload: {
    entityId: string;
    plotSeasonId: string;
    appliedOn: string;
    informationSource?: string | null;
    evidenceRef?: string | null;
    items: Array<{
      productName?: string | null;
      substanceId: string;
      rate: number;
      rateUnit?: string | null;
    }>;
  };
}

export interface FarmerDuplicateRequest {
  name: string;
  contact: string;
  excludeId?: string | null;
}

export interface PlotDuplicateRequest {
  geometry: unknown;
  excludeId?: string | null;
}

export interface CreateCropSeasonRequest {
  companyId: string;
  name: string;
  startsOn: string;
  endsOn: string;
}

export interface UpdateCropSeasonRequest {
  companyId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  expectedVersion: number;
}

export interface DeleteCropSeasonRequest {
  version: number;
}

export interface RegisterPlotSeasonRequest {
  deviceId?: string | null;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number;
  payload: {
    entityId: string;
    plotId: string;
    seasonId: string;
    riceVariety: string;
  } | null;
}

export interface UpdatePlotSeasonRequest {
  plotId: string;
  seasonId: string;
  riceVariety: string;
  expectedVersion: number;
}

export interface DeletePlotSeasonRequest {
  version: number;
}

export interface FarmerList {}

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
  getSourceLot: (id: string) => apiFetch<unknown>(`/api/source-lots/${id}`),

  // Farmers
  getFarmers: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<unknown>(`/api/farmers${qs}`);
  },
  createFarmer: (req: RegisterFarmerRequest) =>
    apiFetch<unknown>("/api/farmers", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  checkFarmerDuplicate: (req: FarmerDuplicateRequest) =>
    apiFetch<unknown>("/api/farmers/duplicate-check", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateFarmer: (id: string, req: unknown) =>
    apiFetch<unknown>(`/api/farmers/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deleteFarmer: (id: string, req?: unknown) =>
    apiFetch<unknown>(`/api/farmers/${id}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),
  getFarmer: (id: string) => apiFetch<unknown>(`/api/farmers/${id}`),

  // Plots
  getPlots: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<unknown>(`/api/plots${qs}`);
  },
  createPlot: (req: RegisterPlotRequest) =>
    apiFetch<unknown>("/api/plots", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  checkPlotDuplicate: (req: PlotDuplicateRequest) =>
    apiFetch<unknown>("/api/plots/duplicate-check", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updatePlot: (id: string, req: unknown) =>
    apiFetch<unknown>(`/api/plots/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deletePlot: (id: string, req?: unknown) =>
    apiFetch<unknown>(`/api/plots/${id}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),
  getPlot: (id: string) => apiFetch<unknown>(`/api/plots/${id}`),

  // Crop Seasons
  getCropSeasons: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<unknown>(`/api/crop-seasons${qs}`);
  },
  getCropSeason: (id: string) => apiFetch<unknown>(`/api/crop-seasons/${id}`),
  createCropSeason: (req: CreateCropSeasonRequest | unknown) =>
    apiFetch<unknown>("/api/crop-seasons", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateCropSeason: (id: string, req: UpdateCropSeasonRequest | unknown) =>
    apiFetch<unknown>(`/api/crop-seasons/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deleteCropSeason: (id: string, req?: DeleteCropSeasonRequest | unknown) =>
    apiFetch<unknown>(`/api/crop-seasons/${id}`, {
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
  getPlotSeason: (id: string) => apiFetch<unknown>(`/api/plot-seasons/${id}`),
  createPlotSeason: (req: RegisterPlotSeasonRequest | unknown) =>
    apiFetch<unknown>("/api/plot-seasons", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updatePlotSeason: (id: string, req: UpdatePlotSeasonRequest | unknown) =>
    apiFetch<unknown>(`/api/plot-seasons/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deletePlotSeason: (id: string, req?: DeletePlotSeasonRequest | unknown) =>
    apiFetch<unknown>(`/api/plot-seasons/${id}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),

  // Spray Declarations
  getSprayDeclarations: () => apiFetch<unknown>("/api/spray-declarations"),
  getSprayDeclaration: (id: string) =>
    apiFetch<unknown>(`/api/spray-declarations/${id}`),
  recordSprayDeclaration: (req: RecordSprayDeclarationRequest) =>
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
  registerProcurement: (req: RegisterProcurementRequest) =>
    apiFetch<ProcurementResponse>("/api/procurements", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  getProcurement: (id: string) => apiFetch<ProcurementResponse>(`/api/procurements/${id}`),
};
