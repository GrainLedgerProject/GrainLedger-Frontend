/**
 * Catalogs & Master Data Types (matching Web specifications)
 */

export interface Commodity {
  id: string;
  code: string;
  name: string;
  defaultMoistureStandard: number;
  gradeDescription?: string;
}

export interface Facility {
  id: string;
  code: string;
  name: string;
  address?: string;
  capacityTon?: number;
}

export interface StorageLocation {
  id: string;
  facilityId: string;
  code: string;
  name: string;
  kind: 'SILO' | 'WAREHOUSE' | 'ISOLATION';
  capacityKg: number;
  currentMassKg: number;
}

