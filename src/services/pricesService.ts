/**
 * Сервис для работы с ценами топлива
 * Включает персистентное хранение в localStorage
 */

import { PersistentStorage } from '@/utils/persistentStorage';

// Типы данных
export interface FuelPrice {
  id: string;
  fuelType: string;
  fuelCode: string;
  priceNet: number; // без НДС в копейках
  vatRate: number; // процент НДС
  priceGross: number; // с НДС в копейках (рассчитывается)
  unit: string; // Л/Кг
  appliedFrom: string; // дата-время применения
  status: 'active' | 'scheduled' | 'expired';
  tradingPoint: string;
  networkId: string;
  tradingPointId: string;
  packageId?: string;
  created_at: string;
  updated_at: string;
}

export interface PricePackage {
  id: string;
  tradingPointId: string;
  tradingPointName: string;
  applyAt: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  status: 'draft' | 'scheduled' | 'active' | 'cancelled';
  lines: PricePackageLine[];
  notes?: string;
}

export interface PricePackageLine {
  id: string;
  fuelId: string;
  fuelType: string;
  fuelCode: string;
  priceNet: number;
  vatRate: number;
  priceGross: number;
  unit: string;
  status: 'active' | 'scheduled' | 'cancelled';
}

export interface PriceJournalEntry {
  id: string;
  timestamp: string;
  fuelType: string;
  fuelCode: string;
  priceNet: number;
  priceGross: number;
  vatRate: number;
  source: 'manual' | 'import' | 'api' | 'package';
  packageId?: string;
  status: 'applied' | 'scheduled' | 'cancelled';
  authorName: string;
  authorId: string;
  tradingPoint: string;
  tradingPointId: string;
  networkId: string;
  notes?: string;
}

export interface FuelType {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  created_at: string;
}

// Начальные типы топлива
const initialFuelTypes: FuelType[] = [
  { 
    id: "ai95", 
    name: "АИ-95", 
    code: "AI95", 
    isActive: true,
    created_at: new Date('2024-01-01').toISOString()
  },
  { 
    id: "ai92", 
    name: "АИ-92", 
    code: "AI92", 
    isActive: true,
    created_at: new Date('2024-01-01').toISOString()
  },
  { 
    id: "ai98", 
    name: "АИ-98", 
    code: "AI98", 
    isActive: true,
    created_at: new Date('2024-01-01').toISOString()
  },
  { 
    id: "dt", 
    name: "ДТ", 
    code: "DT", 
    isActive: true,
    created_at: new Date('2024-01-01').toISOString()
  },
  { 
    id: "gas", 
    name: "Газ", 
    code: "GAS", 
    isActive: false,
    created_at: new Date('2024-01-01').toISOString()
  }
];

// Начальные текущие цены
const initialCurrentPrices: FuelPrice[] = [
  {
    id: "price_1",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5000, // 50.00 руб
    vatRate: 20,
    priceGross: 6000, // 60.00 руб
    unit: "Л",
    appliedFrom: "2024-12-15T08:00:00Z",
    status: "active",
    tradingPoint: "АЗС-1 на Московской",
    tradingPointId: "1",
    networkId: "1",
    packageId: "pkg_1",
    created_at: new Date('2024-12-15').toISOString(),
    updated_at: new Date('2024-12-15').toISOString()
  },
  {
    id: "price_2",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 4750,
    vatRate: 20,
    priceGross: 5700,
    unit: "Л",
    appliedFrom: "2024-12-16T12:00:00Z",
    status: "scheduled",
    tradingPoint: "АЗС-1 на Московской",
    tradingPointId: "1",
    networkId: "1",
    packageId: "pkg_2",
    created_at: new Date('2024-12-16').toISOString(),
    updated_at: new Date('2024-12-16').toISOString()
  },
  {
    id: "price_3",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5200,
    vatRate: 20,
    priceGross: 6240,
    unit: "Л",
    appliedFrom: "2024-12-14T06:00:00Z",
    status: "expired",
    tradingPoint: "АЗС-1 на Московской",
    tradingPointId: "1",
    networkId: "1",
    packageId: "pkg_3",
    created_at: new Date('2024-12-14').toISOString(),
    updated_at: new Date('2024-12-14').toISOString()
  },
  {
    id: "price_4",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5500,
    vatRate: 20,
    priceGross: 6600,
    unit: "Л",
    appliedFrom: "2024-12-15T10:00:00Z",
    status: "active",
    tradingPoint: "АЗС-1 на Московской",
    tradingPointId: "1",
    networkId: "1",
    created_at: new Date('2024-12-15').toISOString(),
    updated_at: new Date('2024-12-15').toISOString()
  }
];

// Начальные пакеты цен
const initialPricePackages: PricePackage[] = [
  {
    id: "pkg_1",
    tradingPointId: "1",
    tradingPointName: "АЗС-1 на Московской",
    applyAt: "2024-12-15T08:00:00Z",
    authorName: "Менеджер Иванов И.И.",
    authorId: "user_1",
    createdAt: "2024-12-14T15:30:00Z",
    status: "active",
    notes: "Утренний пакет цен",
    lines: [
      {
        id: "line_1",
        fuelId: "ai95",
        fuelType: "АИ-95",
        fuelCode: "AI95",
        priceNet: 5000,
        vatRate: 20,
        priceGross: 6000,
        unit: "Л",
        status: "active"
      }
    ]
  },
  {
    id: "pkg_2",
    tradingPointId: "1",
    tradingPointName: "АЗС-1 на Московской",
    applyAt: "2024-12-16T12:00:00Z",
    authorName: "Менеджер Петров П.П.",
    authorId: "user_2",
    createdAt: "2024-12-15T18:45:00Z",
    status: "scheduled",
    notes: "Корректировка цен на выходные",
    lines: [
      {
        id: "line_2",
        fuelId: "ai92",
        fuelType: "АИ-92",
        fuelCode: "AI92",
        priceNet: 4750,
        vatRate: 20,
        priceGross: 5700,
        unit: "Л",
        status: "scheduled"
      }
    ]
  }
];

// Начальная история изменений цен
const initialPriceJournal: PriceJournalEntry[] = [
  {
    id: "journal_1",
    timestamp: "2024-12-15T08:00:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5000,
    priceGross: 6000,
    vatRate: 20,
    source: "package",
    packageId: "pkg_1",
    status: "applied",
    authorName: "Менеджер Иванов И.И.",
    authorId: "user_1",
    tradingPoint: "АЗС-1 на Московской",
    tradingPointId: "1",
    networkId: "1",
    notes: "Применен утренний пакет цен"
  },
  {
    id: "journal_2",
    timestamp: "2024-12-14T16:30:00Z",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5500,
    priceGross: 6600,
    vatRate: 20,
    source: "manual",
    status: "applied",
    authorName: "Администратор Сидоров С.С.",
    authorId: "admin_1",
    tradingPoint: "АЗС-1 на Московской",
    tradingPointId: "1",
    networkId: "1",
    notes: "Ручная корректировка по запросу"
  },
  {
    id: "journal_3",
    timestamp: "2024-12-14T06:00:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5200,
    priceGross: 6240,
    vatRate: 20,
    source: "import",
    status: "applied",
    authorName: "Система импорта",
    authorId: "system",
    tradingPoint: "АЗС-1 на Московской",
    tradingPointId: "1",
    networkId: "1",
    notes: "Импорт из внешней системы"
  }
];

// Загружаем данные из localStorage
let mockFuelTypes: FuelType[] = PersistentStorage.load<FuelType>('fuelTypes', initialFuelTypes);
let mockCurrentPrices: FuelPrice[] = PersistentStorage.load<FuelPrice>('currentPrices', initialCurrentPrices);
let mockPricePackages: PricePackage[] = PersistentStorage.load<PricePackage>('pricePackages', initialPricePackages);
let mockPriceJournal: PriceJournalEntry[] = PersistentStorage.load<PriceJournalEntry>('priceJournal', initialPriceJournal);

// Функции для сохранения изменений
const saveFuelTypes = () => PersistentStorage.save('fuelTypes', mockFuelTypes);
const saveCurrentPrices = () => PersistentStorage.save('currentPrices', mockCurrentPrices);
const savePricePackages = () => PersistentStorage.save('pricePackages', mockPricePackages);
const savePriceJournal = () => PersistentStorage.save('priceJournal', mockPriceJournal);

// Вспомогательные функции
const calculateGrossPrice = (priceNet: number, vatRate: number): number => {
  return Math.round(priceNet * (1 + vatRate / 100));
};

// API сервис с персистентным хранением
export const pricesService = {
  // Получить типы топлива
  async getFuelTypes(): Promise<FuelType[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return mockFuelTypes.filter(fuel => fuel.isActive);
  },

  // Создать новый тип топлива
  async createFuelType(fuelType: Omit<FuelType, 'id' | 'created_at'>): Promise<FuelType> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newFuelType: FuelType = {
      ...fuelType,
      id: `fuel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };

    mockFuelTypes.push(newFuelType);
    saveFuelTypes();
    
    return newFuelType;
  },

  // Получить текущие цены
  async getCurrentPrices(tradingPointId?: string, networkId?: string): Promise<FuelPrice[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let prices = [...mockCurrentPrices];
    
    if (tradingPointId) {
      prices = prices.filter(price => price.tradingPointId === tradingPointId);
    }
    
    if (networkId) {
      prices = prices.filter(price => price.networkId === networkId);
    }
    
    return prices.sort((a, b) => a.fuelType.localeCompare(b.fuelType));
  },

  // Создать/обновить цену
  async upsertPrice(price: Omit<FuelPrice, 'id' | 'priceGross' | 'created_at' | 'updated_at'>): Promise<FuelPrice> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Рассчитываем цену с НДС
    const priceGross = calculateGrossPrice(price.priceNet, price.vatRate);
    
    // Ищем существующую цену
    const existingIndex = mockCurrentPrices.findIndex(p => 
      p.fuelCode === price.fuelCode && 
      p.tradingPointId === price.tradingPointId
    );
    
    const now = new Date().toISOString();
    
    if (existingIndex >= 0) {
      // Обновляем существующую
      const updated: FuelPrice = {
        ...mockCurrentPrices[existingIndex],
        ...price,
        priceGross,
        updated_at: now
      };
      
      mockCurrentPrices[existingIndex] = updated;
      saveCurrentPrices();
      
      return updated;
    } else {
      // Создаем новую
      const newPrice: FuelPrice = {
        ...price,
        id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        priceGross,
        created_at: now,
        updated_at: now
      };
      
      mockCurrentPrices.push(newPrice);
      saveCurrentPrices();
      
      return newPrice;
    }
  },

  // Удалить цену
  async deletePrice(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const index = mockCurrentPrices.findIndex(price => price.id === id);
    if (index >= 0) {
      mockCurrentPrices.splice(index, 1);
      saveCurrentPrices();
    }
  },

  // Получить пакеты цен
  async getPricePackages(tradingPointId?: string, status?: string): Promise<PricePackage[]> {
    await new Promise(resolve => setTimeout(resolve, 180));
    
    let packages = [...mockPricePackages];
    
    if (tradingPointId) {
      packages = packages.filter(pkg => pkg.tradingPointId === tradingPointId);
    }
    
    if (status) {
      packages = packages.filter(pkg => pkg.status === status);
    }
    
    return packages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  // Создать пакет цен
  async createPricePackage(packageData: Omit<PricePackage, 'id' | 'createdAt'>): Promise<PricePackage> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Рассчитываем priceGross для всех строк
    const lines = packageData.lines.map(line => ({
      ...line,
      id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priceGross: calculateGrossPrice(line.priceNet, line.vatRate)
    }));
    
    const newPackage: PricePackage = {
      ...packageData,
      id: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lines,
      createdAt: new Date().toISOString()
    };

    mockPricePackages.push(newPackage);
    savePricePackages();
    
    return newPackage;
  },

  // Применить пакет цен
  async applyPricePackage(packageId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const packageIndex = mockPricePackages.findIndex(pkg => pkg.id === packageId);
    if (packageIndex === -1) {
      throw new Error(`Пакет цен с ID ${packageId} не найден`);
    }

    const pricePackage = mockPricePackages[packageIndex];
    
    // Обновляем статус пакета
    mockPricePackages[packageIndex] = {
      ...pricePackage,
      status: 'active'
    };

    // Применяем цены из пакета
    for (const line of pricePackage.lines) {
      const existingIndex = mockCurrentPrices.findIndex(p => 
        p.fuelCode === line.fuelCode && 
        p.tradingPointId === pricePackage.tradingPointId
      );

      const now = new Date().toISOString();
      const newPrice: FuelPrice = {
        id: existingIndex >= 0 ? mockCurrentPrices[existingIndex].id : `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fuelType: line.fuelType,
        fuelCode: line.fuelCode,
        priceNet: line.priceNet,
        vatRate: line.vatRate,
        priceGross: line.priceGross,
        unit: line.unit,
        appliedFrom: pricePackage.applyAt,
        status: 'active',
        tradingPoint: pricePackage.tradingPointName,
        tradingPointId: pricePackage.tradingPointId,
        networkId: "1", // TODO: получать из контекста
        packageId: packageId,
        created_at: existingIndex >= 0 ? mockCurrentPrices[existingIndex].created_at : now,
        updated_at: now
      };

      if (existingIndex >= 0) {
        mockCurrentPrices[existingIndex] = newPrice;
      } else {
        mockCurrentPrices.push(newPrice);
      }

      // Добавляем запись в журнал
      const journalEntry: PriceJournalEntry = {
        id: `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: now,
        fuelType: line.fuelType,
        fuelCode: line.fuelCode,
        priceNet: line.priceNet,
        priceGross: line.priceGross,
        vatRate: line.vatRate,
        source: 'package',
        packageId: packageId,
        status: 'applied',
        authorName: pricePackage.authorName,
        authorId: pricePackage.authorId,
        tradingPoint: pricePackage.tradingPointName,
        tradingPointId: pricePackage.tradingPointId,
        networkId: "1",
        notes: `Применен пакет цен: ${packageId}`
      };

      mockPriceJournal.push(journalEntry);
    }

    savePricePackages();
    saveCurrentPrices();
    savePriceJournal();
  },

  // Получить историю изменений цен
  async getPriceJournal(tradingPointId?: string, fuelCode?: string, limit = 50): Promise<PriceJournalEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let journal = [...mockPriceJournal];
    
    if (tradingPointId) {
      journal = journal.filter(entry => entry.tradingPointId === tradingPointId);
    }
    
    if (fuelCode) {
      journal = journal.filter(entry => entry.fuelCode === fuelCode);
    }
    
    return journal
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
};