import { createAdminEndpoints } from "./endpoints/admin";
import { createAuthEndpoints } from "./endpoints/auth";
import { createCatalogsEndpoints } from "./endpoints/catalogs";
import { createComplianceEndpoints } from "./endpoints/compliance";
import { createLedgerEndpoints } from "./endpoints/ledger";
import { createProcurementEndpoints } from "./endpoints/procurement";
import { createProfileEndpoints } from "./endpoints/profile";
import { createResidueEndpoints } from "./endpoints/residue";
import { Platform } from 'react-native';
import { storage } from './storage';
import { LabSample, SampleHandover, LabReport } from '../types/compliance';
import { HoldRecord } from '../types/risk';

const API_BASE_URL_KEY = 'grainledger_api_base_url';
// On Android emulator, 10.0.2.2 points to host loopback; on iOS/web it is localhost
const DEFAULT_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5080' : 'http://localhost:5080';

export class ApiService {
  private static instance: ApiService;
  private baseUrl: string = DEFAULT_API_BASE_URL;
  private token: string | null = null;

  private constructor() {
    this.init();
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  public normalizeUrl(url: string): string {
    let clean = url.trim();
    if (!clean) return DEFAULT_API_BASE_URL;
    if (!/^https?:\/\//i.test(clean)) {
      clean = `http://${clean}`;
    }
    return clean.replace(/\/+$/, '');
  }

  private async init() {
    const saved = await storage.get<string>(API_BASE_URL_KEY);
    if (saved) {
      this.baseUrl = this.normalizeUrl(saved);
    }
    const token = await storage.get<string>('grainledger_token');
    if (token) {
      this.token = token;
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async setBaseUrl(url: string): Promise<void> {
    this.baseUrl = this.normalizeUrl(url);
    await storage.set(API_BASE_URL_KEY, this.baseUrl);
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      storage.set('grainledger_token', token);
    } else {
      storage.remove('grainledger_token');
    }
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: string | null; isMock: boolean }> {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${normalizedEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          data: null,
          error: `HTTP ${response.status}: ${errorText || response.statusText}`,
          isMock: false,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      let data: T | null = null;
      if (contentType.includes('application/json')) {
        data = (await response.json()) as T;
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text) as T;
        } catch {
          data = text as unknown as T;
        }
      }

      return { data, error: null, isMock: false };
    } catch (err: unknown) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Network request failed (offline / host unreachable)',
        isMock: true,
      };
    }
  }

  public admin = createAdminEndpoints(this.request.bind(this)).adminEndpoints;
  public auth = createAuthEndpoints(this.request.bind(this)).authEndpoints;
  public profile = createProfileEndpoints(this.request.bind(this)).profileEndpoints;

  // ==========================================
  // COMPLIANCE & LAB ENDPOINTS (from Web)
  // ==========================================
  public compliance = {
    ...createComplianceEndpoints(this.request.bind(this)).complianceEndpoints,
    getSamples: (params?: Record<string, string | number>) => {
      const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request<{ items: LabSample[] }>(`/api/samples${qs}`);
    },
    getSample: (id: string) => this.request<LabSample>(`/api/samples/${id}`),
    createSample: (req: any) =>
      this.request<any>('/api/samples', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    getSampleHandovers: (id: string) =>
      this.request<{ items: SampleHandover[] }>(`/api/samples/${id}/handovers`),
    recordSampleHandover: (id: string, req: any) =>
      this.request<any>(`/api/samples/${id}/handovers`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    getLabReports: (params?: Record<string, string | number>) => {
      const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return this.request<{ items: LabReport[] }>(`/api/lab-reports${qs}`);
    },
    getLabReport: (id: string) => this.request<LabReport>(`/api/lab-reports/${id}`),
    createLabReport: (req: any) =>
      this.request<any>('/api/lab-reports', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    confirmLabReport: (id: string, req: any) =>
      this.request<any>(`/api/lab-reports/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
  };

  // ==========================================
  // LEDGER & MILL ENDPOINTS (from Web)
  // ==========================================
  public ledger = {
    ...createLedgerEndpoints(this.request.bind(this)).ledgerEndpoints,
    getSetup: () => this.request<any>('/api/ledger/setup'),
    getLots: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request<{ items: any[] }>(`/api/ledger/lots${qs}`);
    },
    getLot: (id: string) => this.request<any>(`/api/ledger/lots/${id}`),
    getOperations: () => this.request<{ items: any[] }>('/api/ledger/operations'),
    recordOperation: (req: any) =>
      this.request<any>('/api/ledger/operations', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    confirmOperation: (id: string, req: any) =>
      this.request<any>(`/api/ledger/operations/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    commitOperation: (id: string, req: any) =>
      this.request<any>(`/api/ledger/operations/${id}/commit`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    getHolds: () => this.request<{ items: HoldRecord[] }>('/api/ledger/holds'),
    issueHold: (req: any) =>
      this.request<any>('/api/ledger/holds', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    respondHold: (id: string, req: any) =>
      this.request<any>(`/api/ledger/holds/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    getCorrections: () => this.request<{ items: any[] }>('/api/ledger/corrections'),
    createCorrection: (req: any) =>
      this.request<any>('/api/ledger/corrections', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    reconcileCorrection: (id: string, req: any) =>
      this.request<any>(`/api/ledger/corrections/${id}/reconcile`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    getReceivingTasks: () => this.request<{ items: any[] }>('/api/ledger/receiving-tasks'),
    recordReceivingMeasurement: (id: string, req: any) =>
      this.request<any>(`/api/ledger/receiving/${id}/measurements`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    reviewReceiving: (id: string, req: any) =>
      this.request<any>(`/api/ledger/receiving/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    traceLot: (req: { lotId: string; direction?: string; view?: string }) =>
      this.request<any>('/api/ledger/trace', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    getResiduePreview: (lotId: string) =>
      this.request<any>(`/api/ledger/lots/${lotId}/residue-preview`),
  };

  // ==========================================
  // RESIDUE EVALUATION ENDPOINTS (from Web)
  // ==========================================
  public residue = {
    ...createResidueEndpoints(this.request.bind(this)).residueEndpoints,
    getRules: () => this.request<{ items: any[] }>('/api/residue-rules'),
    createRule: (req: any) =>
      this.request<any>('/api/residue-rules', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    getPolicySettings: () => this.request<any>('/api/residue-policy-settings'),
    previewLabReportReview: (reportId: string, req: any) =>
      this.request<any>(`/api/lab-reports/${reportId}/residue-review/preview`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    confirmLabReportReview: (reportId: string, req: any) =>
      this.request<any>(`/api/lab-reports/${reportId}/residue-review/confirm`, {
        method: 'POST',
        body: JSON.stringify(req),
      }),
  };

  // ==========================================
  // CATALOGS & MASTER DATA ENDPOINTS (from Web)
  // ==========================================
  public catalogs = {
    ...createCatalogsEndpoints(this.request.bind(this)).catalogEndpoints,
    getMasterData: () => this.request<any>('/api/master-data'),
    getMrlVersions: () => this.request<{ items: any[] }>('/api/mrl-versions'),
  };

  // ==========================================
  // FIELD & PROCUREMENT ENDPOINTS (from Web)
  // ==========================================
  public procurement = {
    ...createProcurementEndpoints(this.request.bind(this)).procurementEndpoints,
    getFarmers: () => this.request<{ items: any[] }>('/api/farmers'),
    createFarmer: (req: any) =>
      this.request<any>('/api/farmers', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    getPlots: () => this.request<{ items: any[] }>('/api/plots'),
    createPlot: (req: any) =>
      this.request<any>('/api/plots', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    getProcurements: () => this.request<{ items: any[] }>('/api/procurements'),
    createProcurement: (req: any) =>
      this.request<any>('/api/procurements', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    getSprayDeclarations: () => this.request<any[]>('/api/spray-declarations'),
    createSprayDeclaration: (req: any) =>
      this.request<any>('/api/spray-declarations', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
  };
}

export const api = ApiService.getInstance();
