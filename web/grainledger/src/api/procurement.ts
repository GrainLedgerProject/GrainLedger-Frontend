import { apiFetch } from "./client";
import { withApiQuery, type ApiPage, type PageQuery } from "./query";

interface ReferenceVersion {
  createdBy: string | null;
  version: number;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CropSeason extends CreateCropSeasonRequest {
  id: string;
  name: string;
}

export interface CropSeasonReference extends CropSeason, ReferenceVersion {}

export interface PlotSeason {
  id: string;
  plotId: string;
  seasonId: string;
  riceVarietyId?: string | null;
  riceVariety: string;
  canAssignRiceVariety?: boolean;
}

export interface PlotSeasonReference extends PlotSeason, ReferenceVersion {
  plotCode: string;
  seasonName: string;
}

export interface SprayDeclarationSummary {
  id: string;
  plotSeasonId: string;
  plotCode: string | null;
  seasonName: string | null;
  appliedOn: string;
  recordedAt: string;
  itemCount: number;
}

export interface SprayDeclarationDetail {
  id: string;
  plotSeasonId: string;
  appliedOn: string;
  informationSource: string;
  evidenceRef: string | null;
  capturedAt: string;
  recordedAt: string;
  items: (SprayItemInput & { id: string })[];
}

export interface PlotListItem extends Omit<PlotResponse, "geometry">, ReferenceVersion {}

interface ReferenceQuery extends PageQuery {
  search?: string;
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
  plotCode?: string | null;
  seasonName?: string | null;
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
  farmerName?: string | null;
  farmerCode?: string | null;
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
  remainingStockKg: string;
  availableStockKg: string;
}

export interface ProcurementListResponse {
  items: ProcurementSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export interface SourceLotDetail {
  id: string;
  lotId: string;
  lotCode: string;
  stage: string;
  procurementId: string;
  procurementCode: string;
  farmerId?: string;
  plotId?: string;
  seasonId?: string;
  plotSeasonId: string;
  riceVariety: string;
  farmerCode?: string | null;
  plotCode: string | null;
  farmerName: string | null;
  seasonName: string | null;
  initialNetMassKg: string;
  moisturePercent: string;
  receivingStatus: string;
  usableStockKg: string;
  currentStock: { currentStockLotId: string; currentStockLotCode: string; locationId: string; onHandKg: string; availableKg: string }[];
  lineage: { lotId: string; lotCode: string; quantityKg: string }[];
  sampleIds: string[];
  confirmedLabReportIds: string[];
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
    return apiFetch<ProcurementReferenceResponse>(
      `/api/procurement-reference-data${qs}`,
    );
  },
  getSourceLot: (id: string) =>
    apiFetch<SourceLotDetail>(`/api/source-lots/${encodeURIComponent(id)}`),

  // Farmers
  getFarmers: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<unknown>(`/api/farmers${qs}`);
  },
  createFarmer: (req: RegisterFarmerRequest) =>
    apiFetch<FarmerResponse>("/api/farmers", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  checkFarmerDuplicate: (req: FarmerDuplicateRequest) =>
    apiFetch<{ items: { id: string; code: string; name: string; reasons: string[] }[]; hasMore: boolean }>("/api/farmers/duplicate-check", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateFarmer: (id: string, req: UpdateFarmerRequest) =>
    apiFetch<unknown>(`/api/farmers/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deleteFarmer: (id: string, req: DeleteReferenceRequest) =>
    apiFetch<unknown>(`/api/farmers/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),
  getFarmer: (id: string) =>
    apiFetch<unknown>(`/api/farmers/${encodeURIComponent(id)}`),

  // Plots
  getPlots: (params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return apiFetch<ApiPage<PlotListItem> | PlotListItem[]>(`/api/plots${qs}`);
  },
  createPlot: (req: RegisterPlotRequest) =>
    apiFetch<PlotResponse>("/api/plots", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  checkPlotDuplicate: (req: PlotDuplicateRequest) =>
    apiFetch<{ items: { id: string; code: string; distanceMeters: number; reasons: string[] }[]; hasMore: boolean }>("/api/plots/duplicate-check", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updatePlot: (id: string, req: UpdatePlotRequest) =>
    apiFetch<unknown>(`/api/plots/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deletePlot: (id: string, req: DeleteReferenceRequest) =>
    apiFetch<unknown>(`/api/plots/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),
  getPlot: (id: string) =>
    apiFetch<PlotResponse & { version: number; canEdit: boolean }>(`/api/plots/${encodeURIComponent(id)}`),

  // Crop Seasons
  getCropSeasons: (params?: ReferenceQuery & { companyId?: string; sortBy?: "name" | "startsOn"; sortDirection?: "asc" | "desc" }) =>
    apiFetch<ApiPage<CropSeasonReference>>(withApiQuery("/api/crop-seasons", params)),
  getCropSeason: (id: string) =>
    apiFetch<CropSeasonReference>(`/api/crop-seasons/${encodeURIComponent(id)}`),
  createCropSeason: (req: CreateCropSeasonRequest) =>
    apiFetch<CropSeason>("/api/crop-seasons", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updateCropSeason: (id: string, req: UpdateCropSeasonRequest) =>
    apiFetch<CropSeasonReference>(`/api/crop-seasons/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deleteCropSeason: (id: string, req: DeleteCropSeasonRequest) =>
    apiFetch<void>(`/api/crop-seasons/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),

  // Plot Seasons
  getPlotSeasons: (params?: ReferenceQuery & { plotId?: string; seasonId?: string }) =>
    apiFetch<ApiPage<PlotSeasonReference>>(withApiQuery("/api/plot-seasons", params)),
  getPlotSeason: (id: string) =>
    apiFetch<PlotSeasonReference>(`/api/plot-seasons/${encodeURIComponent(id)}`),
  createPlotSeason: (req: RegisterPlotSeasonRequest) =>
    apiFetch<PlotSeason>("/api/plot-seasons", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  updatePlotSeason: (id: string, req: UpdatePlotSeasonRequest) =>
    apiFetch<PlotSeasonReference>(`/api/plot-seasons/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
  deletePlotSeason: (id: string, req: DeletePlotSeasonRequest) =>
    apiFetch<void>(`/api/plot-seasons/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: req ? JSON.stringify(req) : undefined,
    }),

  // Spray Declarations
  getSprayDeclarations: (query?: PageQuery & { plotSeasonId?: string }) =>
    apiFetch<Omit<ApiPage<SprayDeclarationSummary>, "totalCount">>(withApiQuery("/api/spray-declarations", query)),
  getSprayDeclaration: (id: string) =>
    apiFetch<SprayDeclarationDetail>(`/api/spray-declarations/${encodeURIComponent(id)}`),
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
    return apiFetch<ProcurementListResponse | ProcurementSummary[]>(
      `/api/procurements${qs}`,
    );
  },
  registerProcurement: (req: RegisterProcurementRequest) =>
    apiFetch<ProcurementResponse>("/api/procurements", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  getProcurement: (id: string) =>
    apiFetch<ProcurementResponse>(
      `/api/procurements/${encodeURIComponent(id)}`,
    ),
};

export interface CreateCropSeasonRequest {
  companyId: string;
  name: null | string;
  startsOn: string;
  endsOn: string;
}

export interface DeleteCropSeasonRequest {
  version: number | string;
}

export interface DeletePlotSeasonRequest {
  version: number | string;
}

export interface DeleteReferenceRequest {
  version: number | string;
}

export interface FarmerDuplicateRequest {
  name: null | string;
  contact: null | string;
  excludeId: null | string;
}

export interface FarmerInput {
  entityId: string;
  code: null | string;
  name: null | string;
  contact: null | string;
}

export interface FarmerResponse {
  id: string;
  code: string;
  name: string;
  contact: string | null;
  createdAt: string;
}

export interface PlotDuplicateRequest {
  geometry: unknown;
  excludeId: null | string;
}

export interface PlotInput {
  entityId: string;
  farmerId: string;
  code: null | string;
  geometry: unknown;
  areaHa: number | string;
}

export type PlotGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "Polygon"; coordinates: [number, number][][] };

export interface PlotResponse {
  id: string;
  farmerId: string;
  code: string;
  geometry: PlotGeometry;
  areaHa: number;
}

export interface PlotSeasonInput {
  entityId: string;
  plotId: string;
  seasonId: string;
  riceVarietyId?: null | string;
  riceVariety: null | string;
}

export interface ProcurementInput {
  entityId: string;
  farmerId: string;
  collectionSiteId: string;
  receivingLocationId: string;
  commodityId: string;
  receivedAt: string;
  items: null | Array<ProcurementLineInput>;
}

export interface ProcurementLineInput {
  itemId: string;
  lineNo: number | string;
  plotSeasonId: string;
  measuredValue: null | string;
  measuredUnit: null | string;
  moisturePercent: null | string;
  lotId: string;
  sourceLotId: string;
}

export interface RecordSprayDeclarationRequest {
  deviceId: null | string;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number | string;
  payload: null | SprayDeclarationInput;
}

export interface RegisterFarmerRequest {
  deviceId: null | string;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number | string;
  payload: null | FarmerInput;
}

export interface RegisterPlotRequest {
  deviceId: null | string;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number | string;
  payload: null | PlotInput;
}

export interface RegisterPlotSeasonRequest {
  deviceId: null | string;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number | string;
  payload: null | PlotSeasonInput;
}

export interface RegisterProcurementRequest {
  deviceId: null | string;
  clientOperationId: string;
  capturedAt: string;
  payloadSchemaVersion: number | string;
  payload: null | ProcurementInput;
}

export interface SprayDeclarationInput {
  entityId: string;
  plotSeasonId: string;
  appliedOn: string;
  informationSource: null | string;
  evidenceRef: null | string;
  items: null | Array<SprayItemInput>;
}

export interface SprayItemInput {
  productName: null | string;
  substanceId: null | string;
}

export interface UpdateCropSeasonRequest {
  companyId: string;
  name: null | string;
  startsOn: string;
  endsOn: string;
  expectedVersion: number | string;
}

export interface UpdateFarmerRequest {
  code: null | string;
  name: null | string;
  contact: null | string;
  expectedVersion: number | string;
}

export interface UpdatePlotRequest {
  farmerId: string;
  code: null | string;
  geometry: unknown;
  areaHa: number | string;
  expectedVersion: number | string;
}

export interface UpdatePlotSeasonRequest {
  plotId: string;
  seasonId: string;
  riceVarietyId?: null | string;
  riceVariety: null | string;
  expectedVersion: number | string;
}
