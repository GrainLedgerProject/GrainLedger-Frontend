import { createCatalogsEndpoints } from './endpoints/catalogs';
import type { ApiTransport } from './endpoints/transport';
import { catalogPayload, isCatalogItem, parseManagementList, requireResult, type CatalogKind } from './management';

export function createCatalogManager(transport: ApiTransport) {
  const api = createCatalogsEndpoints(transport).catalogEndpoints;
  return {
    async list(kind: CatalogKind, query: string) {
      const params = { q: query.trim() || undefined };
      const result = await ({
        commodities: () => api.getCommodities(params), units: () => api.getMeasurementUnits(params),
        substances: () => api.getActiveSubstances(params), markets: () => api.getMarkets(params),
        varieties: () => api.getRiceVarieties(params), attributes: () => api.getQualityAttributes(params),
      })[kind]();
      return parseManagementList(requireResult(result), isCatalogItem);
    },
    async save(kind: CatalogKind, id: string | null, code: string, name: string, extra: string) {
      const payload = catalogPayload(kind, id === null, code, name, extra);
      const base = { code: code.trim(), name: name.trim() };
      const result = id === null ? await ({
        commodities: () => api.createCommodity(base), units: () => api.createMeasurementUnit({ ...base, quantityKind: payload.quantityKind || 'MASS' }),
        substances: () => api.createActiveSubstance(base), markets: () => api.createMarket(base),
        varieties: () => api.createRiceVariety(base), attributes: () => api.createQualityAttribute({ ...base, unit: payload.unit || '%' }),
      })[kind]() : await ({
        commodities: () => api.updateCommodity(id, payload), units: () => api.updateMeasurementUnit(id, payload),
        substances: () => api.updateActiveSubstance(id, payload), markets: () => api.updateMarket(id, payload),
        varieties: () => api.updateRiceVariety(id, payload), attributes: () => api.updateQualityAttribute(id, payload),
      })[kind]();
      requireResult(result);
    },
    async remove(kind: CatalogKind, id: string) {
      if (kind !== 'commodities' && kind !== 'units' && kind !== 'substances') {
        throw new Error('Nhóm danh mục này không hỗ trợ xóa trong luồng quản trị hiện tại.');
      }
      const result = await ({ commodities: () => api.deleteCommodity(id), units: () => api.deleteMeasurementUnit(id), substances: () => api.deleteActiveSubstance(id) })[kind]();
      requireResult(result);
    },
  };
}
