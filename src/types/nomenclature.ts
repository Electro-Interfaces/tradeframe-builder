export interface ExternalCodeMapping {
  id: string;
  nomenclatureId: string;
  systemType: 'CRM' | '1C' | 'PROCESSING' | 'OTHER';
  externalCode: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FuelNomenclature {
  id: string;
  networkId: string;
  networkName?: string;
  name: string;
  internalCode: string;
  externalCodes: ExternalCodeMapping[];
  // Поле для взаимодействия с API торговой сети
  networkApiCode?: string;
  networkApiSettings?: {
    enabled: boolean;
    endpoint?: string;
    priority?: number;
    lastSync?: Date;
    syncStatus?: 'success' | 'error' | 'pending';
  };
  description?: string;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface FuelNomenclatureFormData {
  networkId: string;
  name: string;
  internalCode: string;
  networkApiCode?: string;
  networkApiEnabled?: boolean;
  description?: string;
  status: 'active' | 'archived';
  externalCodes: Omit<ExternalCodeMapping, 'id' | 'nomenclatureId' | 'createdAt' | 'updatedAt'>[];
}

export interface FuelNomenclatureFilters {
  networkId?: string;
  status?: 'active' | 'archived' | 'all';
  searchTerm?: string;
}