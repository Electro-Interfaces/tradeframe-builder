/**
 * Сервис номенклатуры.
 * Все запросы через backend API `/api/nomenclature`.
 */

import {
  ExternalCodeMapping,
  FuelNomenclature,
  FuelNomenclatureFilters,
  FuelNomenclatureFormData
} from '@/types/nomenclature';

import { nomenclatureApiRequest } from './nomenclatureApiClient';

function mapExternalCode(code: any): ExternalCodeMapping {
  return {
    id: String(code.id),
    nomenclatureId: String(code.nomenclatureId || code.nomenclature_id),
    systemType: code.systemType || code.system_type,
    externalCode: code.externalCode || code.external_code,
    description: code.description || undefined,
    createdAt: new Date(code.createdAt || code.created_at),
    updatedAt: new Date(code.updatedAt || code.updated_at || code.createdAt || code.created_at),
  };
}

function mapNetworkApiSettings(value: any): FuelNomenclature['networkApiSettings'] | undefined {
  if (!value) {
    return undefined;
  }

  let settings = value;
  if (typeof value === 'string') {
    try {
      settings = JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  if (!settings || typeof settings !== 'object') {
    return undefined;
  }

  return {
    ...settings,
    lastSync: settings.lastSync ? new Date(settings.lastSync) : undefined,
  };
}

function mapNomenclature(item: any): FuelNomenclature {
  return {
    id: String(item.id),
    networkId: String(item.networkId || item.network_id),
    networkName: item.networkName || item.network_name || item.networks?.name || '',
    name: item.name,
    internalCode: item.internalCode || item.internal_code,
    networkApiCode: item.networkApiCode || item.network_api_code || undefined,
    networkApiSettings: mapNetworkApiSettings(item.networkApiSettings || item.network_api_settings),
    externalCodes: Array.isArray(item.externalCodes)
      ? item.externalCodes.map(mapExternalCode)
      : [],
    description: item.description || undefined,
    status: item.status,
    createdAt: new Date(item.createdAt || item.created_at),
    updatedAt: new Date(item.updatedAt || item.updated_at || item.createdAt || item.created_at),
    createdBy: item.createdBy || item.created_by || undefined,
    updatedBy: item.updatedBy || item.updated_by || undefined,
  };
}

function buildSearchParams(filters?: FuelNomenclatureFilters): string {
  const params = new URLSearchParams();
  if (filters?.networkId) params.set('networkId', filters.networkId);
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters?.searchTerm) params.set('searchTerm', filters.searchTerm);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const nomenclatureService = {
  async getNomenclature(filters?: FuelNomenclatureFilters): Promise<FuelNomenclature[]> {
    const response = await nomenclatureApiRequest(buildSearchParams(filters));
    return (response || []).map(mapNomenclature);
  },

  async getNomenclatureById(id: string): Promise<FuelNomenclature | null> {
    try {
      return mapNomenclature(await nomenclatureApiRequest(`/${encodeURIComponent(id)}`));
    } catch (error) {
      if (error instanceof Error && error.message.includes('не найдена')) {
        return null;
      }
      throw error;
    }
  },

  async createNomenclature(data: FuelNomenclatureFormData): Promise<FuelNomenclature> {
    return mapNomenclature(await nomenclatureApiRequest('', {
      method: 'POST',
      body: JSON.stringify(data),
    }));
  },

  async updateNomenclature(id: string, data: FuelNomenclatureFormData): Promise<FuelNomenclature> {
    return mapNomenclature(await nomenclatureApiRequest(`/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }));
  },

  async deleteNomenclature(id: string): Promise<void> {
    await nomenclatureApiRequest(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async archiveNomenclature(id: string): Promise<FuelNomenclature> {
    return mapNomenclature(await nomenclatureApiRequest(`/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
    }));
  },

  async activateNomenclature(id: string): Promise<FuelNomenclature> {
    return mapNomenclature(await nomenclatureApiRequest(`/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
    }));
  },

  async getExternalCodeMappings(nomenclatureId: string): Promise<ExternalCodeMapping[]> {
    const response = await nomenclatureApiRequest(`/${encodeURIComponent(nomenclatureId)}/external-codes`);
    return (response || []).map(mapExternalCode);
  },

  async addExternalCode(
    nomenclatureId: string,
    code: Omit<ExternalCodeMapping, 'id' | 'nomenclatureId' | 'createdAt' | 'updatedAt'>
  ): Promise<ExternalCodeMapping> {
    return mapExternalCode(await nomenclatureApiRequest(`/${encodeURIComponent(nomenclatureId)}/external-codes`, {
      method: 'POST',
      body: JSON.stringify(code),
    }));
  },

  async removeExternalCode(nomenclatureId: string, mappingId: string): Promise<void> {
    await nomenclatureApiRequest(`/${encodeURIComponent(nomenclatureId)}/external-codes/${encodeURIComponent(mappingId)}`, {
      method: 'DELETE',
    });
  }
};
