import { FuelNomenclature, FuelNomenclatureFormData, FuelNomenclatureFilters, ExternalCodeMapping } from '../types/nomenclature';
import { supabaseService as supabase } from './supabaseServiceClient';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const nomenclatureService = {
  async getNomenclature(filters?: FuelNomenclatureFilters): Promise<FuelNomenclature[]> {
    console.log('🔄 Loading nomenclature from Supabase with filters:', filters);
    await delay(300);
    
    try {
      // Базовый запрос для получения номенклатуры с сетями
      let query = supabase
        .from('nomenclature')
        .select(`
          id,
          network_id,
          name,
          internal_code,
          network_api_code,
          network_api_settings,
          description,
          status,
          external_id,
          created_at,
          updated_at,
          created_by,
          updated_by,
          networks!inner(
            id,
            name
          )
        `)
        .order('name');

      // Применяем фильтры
      if (filters?.networkId) {
        query = query.eq('network_id', filters.networkId);
      }
      
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.searchTerm) {
        const search = filters.searchTerm.toLowerCase();
        query = query.or(`
          name.ilike.%${search}%,
          internal_code.ilike.%${search}%,
          description.ilike.%${search}%
        `);
      }

      const { data: nomenclatureData, error: nomenclatureError } = await query;

      if (nomenclatureError) {
        console.error('Ошибка получения номенклатуры:', nomenclatureError);
        throw nomenclatureError;
      }

      if (!nomenclatureData || nomenclatureData.length === 0) {
        return [];
      }

      // Получаем внешние коды для всех записей номенклатуры
      const nomenclatureIds = nomenclatureData.map(item => item.id);
      const { data: externalCodes, error: codesError } = await supabase
        .from('nomenclature_external_codes')
        .select('*')
        .in('nomenclature_id', nomenclatureIds)
        .order('system_type');

      if (codesError) {
        console.error('Ошибка получения внешних кодов:', codesError);
      }

      // Группируем внешние коды по nomenclature_id
      const codesByNomenclature = (externalCodes || []).reduce((acc, code) => {
        if (!acc[code.nomenclature_id]) {
          acc[code.nomenclature_id] = [];
        }
        acc[code.nomenclature_id].push({
          id: code.id,
          nomenclatureId: code.nomenclature_id,
          systemType: code.system_type,
          externalCode: code.external_code,
          description: code.description,
          createdAt: new Date(code.created_at),
          updatedAt: new Date(code.updated_at)
        });
        return acc;
      }, {} as Record<string, ExternalCodeMapping[]>);

      // Формируем итоговый результат
      const result: FuelNomenclature[] = nomenclatureData.map(item => ({
        id: item.id,
        networkId: item.network_id,
        networkName: item.networks?.name || '',
        name: item.name,
        internalCode: item.internal_code,
        networkApiCode: item.network_api_code || undefined,
        networkApiSettings: item.network_api_settings || undefined,
        externalCodes: codesByNomenclature[item.id] || [],
        description: item.description || undefined,
        status: item.status as 'active' | 'archived',
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        createdBy: item.created_by || undefined,
        updatedBy: item.updated_by || undefined
      }));

      console.log('✅ Loaded nomenclature from Supabase:', result.length, 'items');
      return result;

    } catch (error) {
      console.error('❌ Ошибка в nomenclatureService.getNomenclature:', error);
      throw error;
    }
  },

  async getNomenclatureById(id: string): Promise<FuelNomenclature | null> {
    await delay(200);
    
    try {
      const { data: nomenclatureData, error: nomenclatureError } = await supabase
        .from('nomenclature')
        .select(`
          id,
          network_id,
          name,
          internal_code,
          network_api_code,
          network_api_settings,
          description,
          status,
          external_id,
          created_at,
          updated_at,
          created_by,
          updated_by,
          networks!inner(
            id,
            name
          )
        `)
        .eq('id', id)
        .single();

      if (nomenclatureError || !nomenclatureData) {
        return null;
      }

      // Получаем внешние коды для этой номенклатуры
      const { data: externalCodes, error: codesError } = await supabase
        .from('nomenclature_external_codes')
        .select('*')
        .eq('nomenclature_id', id)
        .order('system_type');

      const mappedCodes: ExternalCodeMapping[] = (externalCodes || []).map(code => ({
        id: code.id,
        nomenclatureId: code.nomenclature_id,
        systemType: code.system_type,
        externalCode: code.external_code,
        description: code.description,
        createdAt: new Date(code.created_at),
        updatedAt: new Date(code.updated_at)
      }));

      return {
        id: nomenclatureData.id,
        networkId: nomenclatureData.network_id,
        networkName: nomenclatureData.networks?.name || '',
        name: nomenclatureData.name,
        internalCode: nomenclatureData.internal_code,
        networkApiCode: nomenclatureData.network_api_code || undefined,
        networkApiSettings: nomenclatureData.network_api_settings || undefined,
        externalCodes: mappedCodes,
        description: nomenclatureData.description || undefined,
        status: nomenclatureData.status as 'active' | 'archived',
        createdAt: new Date(nomenclatureData.created_at),
        updatedAt: new Date(nomenclatureData.updated_at),
        createdBy: nomenclatureData.created_by || undefined,
        updatedBy: nomenclatureData.updated_by || undefined
      };

    } catch (error) {
      console.error('Ошибка в nomenclatureService.getNomenclatureById:', error);
      return null;
    }
  },

  async createNomenclature(data: FuelNomenclatureFormData): Promise<FuelNomenclature> {
    await delay(500);
    
    try {
      // Создаем основную запись номенклатуры
      const nomenclatureRecord = {
        network_id: data.networkId,
        name: data.name,
        internal_code: data.internalCode,
        network_api_code: data.networkApiCode || null,
        network_api_settings: data.networkApiEnabled ? {
          enabled: true,
          endpoint: data.networkApiCode ? `/api/v1/fuel-types/${data.networkApiCode.toLowerCase()}` : undefined,
          priority: 1,
          lastSync: undefined,
          syncStatus: 'pending'
        } : null,
        description: data.description || null,
        status: data.status,
        created_by: 'current_user',
        updated_by: 'current_user'
      };

      const { data: insertedNomenclature, error: nomenclatureError } = await supabase
        .from('nomenclature')
        .insert([nomenclatureRecord])
        .select(`
          id,
          network_id,
          name,
          internal_code,
          network_api_code,
          network_api_settings,
          description,
          status,
          external_id,
          created_at,
          updated_at,
          created_by,
          updated_by,
          networks!inner(
            id,
            name
          )
        `)
        .single();

      if (nomenclatureError) {
        throw nomenclatureError;
      }

      // Добавляем внешние коды, если есть
      let externalCodes: ExternalCodeMapping[] = [];
      if (data.externalCodes && data.externalCodes.length > 0) {
        const externalCodesRecords = data.externalCodes.map(code => ({
          nomenclature_id: insertedNomenclature.id,
          system_type: code.systemType,
          external_code: code.externalCode,
          description: code.description || null
        }));

        const { data: insertedCodes, error: codesError } = await supabase
          .from('nomenclature_external_codes')
          .insert(externalCodesRecords)
          .select('*');

        if (codesError) {
          console.error('Ошибка создания внешних кодов:', codesError);
        } else {
          externalCodes = (insertedCodes || []).map(code => ({
            id: code.id,
            nomenclatureId: code.nomenclature_id,
            systemType: code.system_type,
            externalCode: code.external_code,
            description: code.description,
            createdAt: new Date(code.created_at),
            updatedAt: new Date(code.updated_at)
          }));
        }
      }

      return {
        id: insertedNomenclature.id,
        networkId: insertedNomenclature.network_id,
        networkName: insertedNomenclature.networks?.name || '',
        name: insertedNomenclature.name,
        internalCode: insertedNomenclature.internal_code,
        networkApiCode: insertedNomenclature.network_api_code || undefined,
        networkApiSettings: insertedNomenclature.network_api_settings || undefined,
        externalCodes,
        description: insertedNomenclature.description || undefined,
        status: insertedNomenclature.status as 'active' | 'archived',
        createdAt: new Date(insertedNomenclature.created_at),
        updatedAt: new Date(insertedNomenclature.updated_at),
        createdBy: insertedNomenclature.created_by || undefined,
        updatedBy: insertedNomenclature.updated_by || undefined
      };

    } catch (error) {
      console.error('Ошибка в nomenclatureService.createNomenclature:', error);
      throw error;
    }
  },

  async updateNomenclature(id: string, data: FuelNomenclatureFormData): Promise<FuelNomenclature> {
    await delay(500);
    
    try {
      // Обновляем основную запись номенклатуры
      const updateRecord = {
        network_id: data.networkId,
        name: data.name,
        internal_code: data.internalCode,
        network_api_code: data.networkApiCode || null,
        network_api_settings: data.networkApiEnabled ? {
          enabled: true,
          endpoint: data.networkApiCode ? `/api/v1/fuel-types/${data.networkApiCode.toLowerCase()}` : undefined,
          priority: 1,
          lastSync: undefined,
          syncStatus: 'pending'
        } : null,
        description: data.description || null,
        status: data.status,
        updated_by: 'current_user',
        updated_at: new Date().toISOString()
      };

      const { data: updatedNomenclature, error: nomenclatureError } = await supabase
        .from('nomenclature')
        .update(updateRecord)
        .eq('id', id)
        .select(`
          id,
          network_id,
          name,
          internal_code,
          network_api_code,
          network_api_settings,
          description,
          status,
          external_id,
          created_at,
          updated_at,
          created_by,
          updated_by,
          networks!inner(
            id,
            name
          )
        `)
        .single();

      if (nomenclatureError) {
        throw nomenclatureError;
      }

      // Удаляем все существующие внешние коды
      await supabase
        .from('nomenclature_external_codes')
        .delete()
        .eq('nomenclature_id', id);

      // Добавляем новые внешние коды
      let externalCodes: ExternalCodeMapping[] = [];
      if (data.externalCodes && data.externalCodes.length > 0) {
        const externalCodesRecords = data.externalCodes.map(code => ({
          nomenclature_id: id,
          system_type: code.systemType,
          external_code: code.externalCode,
          description: code.description || null
        }));

        const { data: insertedCodes, error: codesError } = await supabase
          .from('nomenclature_external_codes')
          .insert(externalCodesRecords)
          .select('*');

        if (codesError) {
          console.error('Ошибка обновления внешних кодов:', codesError);
        } else {
          externalCodes = (insertedCodes || []).map(code => ({
            id: code.id,
            nomenclatureId: code.nomenclature_id,
            systemType: code.system_type,
            externalCode: code.external_code,
            description: code.description,
            createdAt: new Date(code.created_at),
            updatedAt: new Date(code.updated_at)
          }));
        }
      }

      return {
        id: updatedNomenclature.id,
        networkId: updatedNomenclature.network_id,
        networkName: updatedNomenclature.networks?.name || '',
        name: updatedNomenclature.name,
        internalCode: updatedNomenclature.internal_code,
        networkApiCode: updatedNomenclature.network_api_code || undefined,
        networkApiSettings: updatedNomenclature.network_api_settings || undefined,
        externalCodes,
        description: updatedNomenclature.description || undefined,
        status: updatedNomenclature.status as 'active' | 'archived',
        createdAt: new Date(updatedNomenclature.created_at),
        updatedAt: new Date(updatedNomenclature.updated_at),
        createdBy: updatedNomenclature.created_by || undefined,
        updatedBy: updatedNomenclature.updated_by || undefined
      };

    } catch (error) {
      console.error('Ошибка в nomenclatureService.updateNomenclature:', error);
      throw error;
    }
  },

  async deleteNomenclature(id: string): Promise<void> {
    await delay(300);
    
    try {
      // Сначала удаляем внешние коды (каскадное удаление должно работать автоматически)
      await supabase
        .from('nomenclature_external_codes')
        .delete()
        .eq('nomenclature_id', id);

      // Затем удаляем основную запись
      const { error } = await supabase
        .from('nomenclature')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

    } catch (error) {
      console.error('Ошибка в nomenclatureService.deleteNomenclature:', error);
      throw error;
    }
  },

  async archiveNomenclature(id: string): Promise<FuelNomenclature> {
    await delay(300);
    
    try {
      const { data: updatedNomenclature, error } = await supabase
        .from('nomenclature')
        .update({ 
          status: 'archived',
          updated_by: 'current_user',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          id,
          network_id,
          name,
          internal_code,
          network_api_code,
          network_api_settings,
          description,
          status,
          external_id,
          created_at,
          updated_at,
          created_by,
          updated_by,
          networks!inner(
            id,
            name
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      // Получаем внешние коды
      const { data: externalCodes } = await supabase
        .from('nomenclature_external_codes')
        .select('*')
        .eq('nomenclature_id', id);

      const mappedCodes: ExternalCodeMapping[] = (externalCodes || []).map(code => ({
        id: code.id,
        nomenclatureId: code.nomenclature_id,
        systemType: code.system_type,
        externalCode: code.external_code,
        description: code.description,
        createdAt: new Date(code.created_at),
        updatedAt: new Date(code.updated_at)
      }));

      return {
        id: updatedNomenclature.id,
        networkId: updatedNomenclature.network_id,
        networkName: updatedNomenclature.networks?.name || '',
        name: updatedNomenclature.name,
        internalCode: updatedNomenclature.internal_code,
        networkApiCode: updatedNomenclature.network_api_code || undefined,
        networkApiSettings: updatedNomenclature.network_api_settings || undefined,
        externalCodes: mappedCodes,
        description: updatedNomenclature.description || undefined,
        status: updatedNomenclature.status as 'active' | 'archived',
        createdAt: new Date(updatedNomenclature.created_at),
        updatedAt: new Date(updatedNomenclature.updated_at),
        createdBy: updatedNomenclature.created_by || undefined,
        updatedBy: updatedNomenclature.updated_by || undefined
      };

    } catch (error) {
      console.error('Ошибка в nomenclatureService.archiveNomenclature:', error);
      throw error;
    }
  },

  async activateNomenclature(id: string): Promise<FuelNomenclature> {
    await delay(300);
    
    try {
      const { data: updatedNomenclature, error } = await supabase
        .from('nomenclature')
        .update({ 
          status: 'active',
          updated_by: 'current_user',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          id,
          network_id,
          name,
          internal_code,
          network_api_code,
          network_api_settings,
          description,
          status,
          external_id,
          created_at,
          updated_at,
          created_by,
          updated_by,
          networks!inner(
            id,
            name
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      // Получаем внешние коды
      const { data: externalCodes } = await supabase
        .from('nomenclature_external_codes')
        .select('*')
        .eq('nomenclature_id', id);

      const mappedCodes: ExternalCodeMapping[] = (externalCodes || []).map(code => ({
        id: code.id,
        nomenclatureId: code.nomenclature_id,
        systemType: code.system_type,
        externalCode: code.external_code,
        description: code.description,
        createdAt: new Date(code.created_at),
        updatedAt: new Date(code.updated_at)
      }));

      return {
        id: updatedNomenclature.id,
        networkId: updatedNomenclature.network_id,
        networkName: updatedNomenclature.networks?.name || '',
        name: updatedNomenclature.name,
        internalCode: updatedNomenclature.internal_code,
        networkApiCode: updatedNomenclature.network_api_code || undefined,
        networkApiSettings: updatedNomenclature.network_api_settings || undefined,
        externalCodes: mappedCodes,
        description: updatedNomenclature.description || undefined,
        status: updatedNomenclature.status as 'active' | 'archived',
        createdAt: new Date(updatedNomenclature.created_at),
        updatedAt: new Date(updatedNomenclature.updated_at),
        createdBy: updatedNomenclature.created_by || undefined,
        updatedBy: updatedNomenclature.updated_by || undefined
      };

    } catch (error) {
      console.error('Ошибка в nomenclatureService.activateNomenclature:', error);
      throw error;
    }
  },

  async getExternalCodeMappings(nomenclatureId: string): Promise<ExternalCodeMapping[]> {
    await delay(200);
    
    try {
      const { data: externalCodes, error } = await supabase
        .from('nomenclature_external_codes')
        .select('*')
        .eq('nomenclature_id', nomenclatureId)
        .order('system_type');

      if (error) {
        throw error;
      }

      return (externalCodes || []).map(code => ({
        id: code.id,
        nomenclatureId: code.nomenclature_id,
        systemType: code.system_type,
        externalCode: code.external_code,
        description: code.description,
        createdAt: new Date(code.created_at),
        updatedAt: new Date(code.updated_at)
      }));

    } catch (error) {
      console.error('Ошибка в nomenclatureService.getExternalCodeMappings:', error);
      return [];
    }
  },

  async addExternalCode(nomenclatureId: string, code: Omit<ExternalCodeMapping, 'id' | 'nomenclatureId' | 'createdAt' | 'updatedAt'>): Promise<ExternalCodeMapping> {
    await delay(300);
    
    try {
      const { data: insertedCode, error } = await supabase
        .from('nomenclature_external_codes')
        .insert([{
          nomenclature_id: nomenclatureId,
          system_type: code.systemType,
          external_code: code.externalCode,
          description: code.description || null
        }])
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      // Обновляем updated_at основной записи номенклатуры
      await supabase
        .from('nomenclature')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', nomenclatureId);

      return {
        id: insertedCode.id,
        nomenclatureId: insertedCode.nomenclature_id,
        systemType: insertedCode.system_type,
        externalCode: insertedCode.external_code,
        description: insertedCode.description,
        createdAt: new Date(insertedCode.created_at),
        updatedAt: new Date(insertedCode.updated_at)
      };

    } catch (error) {
      console.error('Ошибка в nomenclatureService.addExternalCode:', error);
      throw error;
    }
  },

  async removeExternalCode(nomenclatureId: string, mappingId: string): Promise<void> {
    await delay(300);
    
    try {
      const { error } = await supabase
        .from('nomenclature_external_codes')
        .delete()
        .eq('id', mappingId)
        .eq('nomenclature_id', nomenclatureId);

      if (error) {
        throw error;
      }

      // Обновляем updated_at основной записи номенклатуры
      await supabase
        .from('nomenclature')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', nomenclatureId);

    } catch (error) {
      console.error('Ошибка в nomenclatureService.removeExternalCode:', error);
      throw error;
    }
  }
};