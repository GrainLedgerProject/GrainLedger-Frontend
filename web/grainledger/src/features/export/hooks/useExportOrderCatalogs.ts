import { useQuery } from "@tanstack/react-query";
import { catalogsEndpoints } from "@/api/catalogs";
import { collectPages } from "@/api/query";

export function useExportOrderCatalogs() {
  return useQuery({
    queryKey: ["export-order-catalogs"],
    queryFn: async () => {
      const [markets, commodities, attributes, units] = await Promise.all([
        collectPages(catalogsEndpoints.getMarkets),
        collectPages(catalogsEndpoints.getCommodities),
        collectPages(catalogsEndpoints.getQualityAttributes),
        collectPages(catalogsEndpoints.getMeasurementUnits),
      ]);
      return { markets, commodities: commodities.filter(item => !item.isArchived), attributes,
        units: units.filter(item => !item.isDeleted && ["KG", "G", "T"].includes(item.code.toUpperCase())),
      };
    },
  });
}
