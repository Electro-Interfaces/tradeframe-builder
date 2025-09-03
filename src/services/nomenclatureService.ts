import { FuelNomenclature, FuelNomenclatureFormData, FuelNomenclatureFilters, ExternalCodeMapping } from '../types/nomenclature';
import { PersistentStorage } from '@/utils/persistentStorage';
import { getApiBaseUrl, isApiMockMode } from '@/services/apiConfigService';

const API_BASE_URL = getApiBaseUrl();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Начальные данные номенклатуры
const initialNomenclature: FuelNomenclature[] = [
  {
    id: '1',
    networkId: '1',
    networkName: 'Демо сеть АЗС',
    name: 'АИ-92',
    internalCode: 'AI92',
    networkApiCode: 'FUEL_AI92_REGULAR',
    networkApiSettings: {
      enabled: true,
      endpoint: '/api/v1/fuel-types/regular',
      priority: 1,
      lastSync: new Date('2024-01-15T10:00:00'),
      syncStatus: 'success'
    },
    externalCodes: [
      {
        id: '1',
        nomenclatureId: '1',
        systemType: '1C',
        externalCode: 'БНЗ-92',
        description: 'Код в 1С:Предприятие',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: '2',
        nomenclatureId: '1',
        systemType: 'PROCESSING',
        externalCode: 'FUEL_92',
        description: 'Код в процессинге',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      }
    ],
    description: 'Бензин АИ-92 (Regular)',
    status: 'active',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    createdBy: 'admin',
    updatedBy: 'admin'
  },
  {
    id: '2',
    networkId: '1',
    networkName: 'Демо сеть АЗС',
    name: 'АИ-95',
    internalCode: 'AI95',
    networkApiCode: 'FUEL_AI95_PREMIUM',
    networkApiSettings: {
      enabled: true,
      endpoint: '/api/v1/fuel-types/premium',
      priority: 2,
      lastSync: new Date('2024-01-15T10:30:00'),
      syncStatus: 'success'
    },
    externalCodes: [
      {
        id: '3',
        nomenclatureId: '2',
        systemType: '1C',
        externalCode: 'БНЗ-95',
        description: 'Код в 1С:Предприятие',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      }
    ],
    description: 'Бензин АИ-95 (Premium)',
    status: 'active',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-10'),
    createdBy: 'admin',
    updatedBy: 'operator'
  },
  {
    id: '3',
    networkId: '1',
    networkName: 'Демо сеть АЗС',
    name: 'АИ-98',
    internalCode: 'AI98',
    externalCodes: [],
    description: 'Бензин АИ-98 (Super)',
    status: 'active',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    createdBy: 'admin',
    updatedBy: 'admin'
  },
  {
    id: '4',
    networkId: '1',
    networkName: 'Демо сеть АЗС',
    name: 'ДТ',
    internalCode: 'DT',
    externalCodes: [
      {
        id: '4',
        nomenclatureId: '4',
        systemType: '1C',
        externalCode: 'ДТ-Л',
        description: 'Дизельное топливо летнее',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: '5',
        nomenclatureId: '4',
        systemType: 'CRM',
        externalCode: 'DIESEL_FUEL',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      }
    ],
    description: 'Дизельное топливо',
    status: 'active',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    createdBy: 'admin',
    updatedBy: 'admin'
  },
  {
    id: '5',
    networkId: '1',
    networkName: 'Демо сеть АЗС',
    name: 'АИ-100',
    internalCode: 'AI100',
    networkApiCode: 'FUEL_AI100_ULTRA',
    networkApiSettings: {
      enabled: true,
      endpoint: '/api/v1/fuel-types/ultra',
      priority: 5,
      lastSync: new Date('2024-02-15T11:00:00'),
      syncStatus: 'success'
    },
    externalCodes: [
      {
        id: '9',
        nomenclatureId: '5',
        systemType: '1C',
        externalCode: 'БНЗ-100',
        description: 'Код в 1С:Предприятие',
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date('2024-02-15')
      },
      {
        id: '10',
        nomenclatureId: '5',
        systemType: 'PROCESSING',
        externalCode: 'FUEL_100',
        description: 'Код в процессинге',
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date('2024-02-15')
      }
    ],
    description: 'Бензин АИ-100 (Ultra)',
    status: 'active',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
    createdBy: 'admin',
    updatedBy: 'admin'
  },
  {
    id: '7',
    networkId: '2',
    networkName: 'Норд Лайн',
    name: 'АИ-92',
    internalCode: 'AI92',
    externalCodes: [
      {
        id: '11',
        nomenclatureId: '7',
        systemType: '1C',
        externalCode: 'БНЗ-92-НЛ',
        description: 'Код в 1С Норд Лайн',
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01')
      }
    ],
    description: 'Бензин АИ-92',
    status: 'active',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
    createdBy: 'admin',
    updatedBy: 'admin'
  },
  {
    id: '8',
    networkId: '2',
    networkName: 'Норд Лайн',
    name: 'АИ-95',
    internalCode: 'AI95',
    externalCodes: [
      {
        id: '12',
        nomenclatureId: '8',
        systemType: 'CRM',
        externalCode: 'PREMIUM_95',
        description: 'Код в CRM системе',
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01')
      }
    ],
    description: 'Бензин АИ-95',
    status: 'active',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
    createdBy: 'admin',
    updatedBy: 'admin'
  },
  {
    id: '9',
    networkId: '2',
    networkName: 'Норд Лайн',
    name: 'ДТ',
    internalCode: 'DT',
    externalCodes: [
      {
        id: '13',
        nomenclatureId: '9',
        systemType: '1C',
        externalCode: 'ДТ-НЛ',
        description: 'Дизельное топливо Норд Лайн',
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01')
      }
    ],
    description: 'Дизельное топливо',
    status: 'active',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
    createdBy: 'admin',
    updatedBy: 'admin'
  }
];

// Принудительно сбрасываем кэш номенклатуры для обновления данных
console.log('🧹 Очищаем кэш номенклатуры для добавления АИ-100...');
PersistentStorage.remove('nomenclature');

// Загружаем данные из localStorage при инициализации
let mockNomenclature: FuelNomenclature[] = PersistentStorage.load<FuelNomenclature>('nomenclature', initialNomenclature);

// Функция для сохранения изменений
const saveNomenclature = () => {
  PersistentStorage.save('nomenclature', mockNomenclature);
};

export const nomenclatureService = {
  async getNomenclature(filters?: FuelNomenclatureFilters): Promise<FuelNomenclature[]> {
    await delay(500);
    
    let filtered = [...mockNomenclature];
    
    if (filters?.networkId) {
      filtered = filtered.filter(item => item.networkId === filters.networkId);
    }
    
    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }
    
    if (filters?.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(search) ||
        item.internalCode.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.externalCodes.some(code => 
          code.externalCode.toLowerCase().includes(search) ||
          code.description?.toLowerCase().includes(search)
        )
      );
    }
    
    return filtered;
  },

  async getNomenclatureById(id: string): Promise<FuelNomenclature | null> {
    await delay(300);
    return mockNomenclature.find(item => item.id === id) || null;
  },

  async createNomenclature(data: FuelNomenclatureFormData): Promise<FuelNomenclature> {
    await delay(500);
    
    const newItem: FuelNomenclature = {
      id: `nom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      networkName: data.networkId === '1' ? 'Демо сеть АЗС' : 'Норд Лайн',
      // Обрабатываем настройки API торговой сети
      networkApiSettings: data.networkApiEnabled ? {
        enabled: true,
        endpoint: data.networkApiCode ? `/api/v1/fuel-types/${data.networkApiCode.toLowerCase()}` : undefined,
        priority: mockNomenclature.length + 1,
        lastSync: undefined,
        syncStatus: 'pending'
      } : undefined,
      externalCodes: data.externalCodes.map((code, index) => ({
        ...code,
        id: `${Date.now()}_${index}`,
        nomenclatureId: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current_user',
      updatedBy: 'current_user'
    };
    
    mockNomenclature.push(newItem);
    saveNomenclature();
    return newItem;
  },

  async updateNomenclature(id: string, data: FuelNomenclatureFormData): Promise<FuelNomenclature> {
    await delay(500);
    
    const index = mockNomenclature.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error('Номенклатура не найдена');
    }
    
    const existing = mockNomenclature[index];
    const updated: FuelNomenclature = {
      ...existing,
      ...data,
      id: existing.id,
      networkName: data.networkId === '1' ? 'Демо сеть АЗС' : 'Норд Лайн',
      // Обновляем настройки API торговой сети
      networkApiSettings: data.networkApiEnabled ? {
        enabled: true,
        endpoint: data.networkApiCode ? `/api/v1/fuel-types/${data.networkApiCode.toLowerCase()}` : existing.networkApiSettings?.endpoint,
        priority: existing.networkApiSettings?.priority || index + 1,
        lastSync: existing.networkApiSettings?.lastSync,
        syncStatus: (existing.networkApiCode !== data.networkApiCode) ? 'pending' : existing.networkApiSettings?.syncStatus || 'pending'
      } : {
        enabled: false,
        endpoint: undefined,
        priority: undefined,
        lastSync: undefined,
        syncStatus: undefined
      },
      externalCodes: data.externalCodes.map((code, index) => ({
        ...code,
        id: code.id || `${Date.now()}_${index}`,
        nomenclatureId: existing.id,
        createdAt: code.createdAt || new Date(),
        updatedAt: new Date()
      })),
      createdAt: existing.createdAt,
      updatedAt: new Date(),
      updatedBy: 'current_user'
    };
    
    mockNomenclature[index] = updated;
    saveNomenclature();
    return updated;
  },

  async deleteNomenclature(id: string): Promise<void> {
    await delay(500);
    const index = mockNomenclature.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error('Номенклатура не найдена');
    }
    mockNomenclature.splice(index, 1);
    saveNomenclature();
  },

  async archiveNomenclature(id: string): Promise<FuelNomenclature> {
    await delay(500);
    const item = mockNomenclature.find(n => n.id === id);
    if (!item) {
      throw new Error('Номенклатура не найдена');
    }
    item.status = 'archived';
    item.updatedAt = new Date();
    item.updatedBy = 'current_user';
    saveNomenclature();
    return item;
  },

  async activateNomenclature(id: string): Promise<FuelNomenclature> {
    await delay(500);
    const item = mockNomenclature.find(n => n.id === id);
    if (!item) {
      throw new Error('Номенклатура не найдена');
    }
    item.status = 'active';
    item.updatedAt = new Date();
    item.updatedBy = 'current_user';
    saveNomenclature();
    return item;
  },

  async getExternalCodeMappings(nomenclatureId: string): Promise<ExternalCodeMapping[]> {
    await delay(300);
    const item = mockNomenclature.find(n => n.id === nomenclatureId);
    return item?.externalCodes || [];
  },

  async addExternalCode(nomenclatureId: string, code: Omit<ExternalCodeMapping, 'id' | 'nomenclatureId' | 'createdAt' | 'updatedAt'>): Promise<ExternalCodeMapping> {
    await delay(500);
    const item = mockNomenclature.find(n => n.id === nomenclatureId);
    if (!item) {
      throw new Error('Номенклатура не найдена');
    }
    
    const newMapping: ExternalCodeMapping = {
      ...code,
      id: Date.now().toString(),
      nomenclatureId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    item.externalCodes.push(newMapping);
    item.updatedAt = new Date();
    return newMapping;
  },

  async removeExternalCode(nomenclatureId: string, mappingId: string): Promise<void> {
    await delay(500);
    const item = mockNomenclature.find(n => n.id === nomenclatureId);
    if (!item) {
      throw new Error('Номенклатура не найдена');
    }
    
    const index = item.externalCodes.findIndex(code => code.id === mappingId);
    if (index !== -1) {
      item.externalCodes.splice(index, 1);
      item.updatedAt = new Date();
    }
  }
};