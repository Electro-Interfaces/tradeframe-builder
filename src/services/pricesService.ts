/**
 * Сервис для работы с ценами топлива
 * Использует Supabase как основную БД с fallback на localStorage
 */

import { PersistentStorage } from '@/utils/persistentStorage';
import { supabaseService } from './supabaseServiceClient';
import { apiConfigService } from './apiConfigService';

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

// Начальные типы топлива демо сети (соответствуют резервуарам)
const initialFuelTypes: FuelType[] = [
  { 
    id: "ai95", 
    name: "АИ-95", 
    code: "AI95", 
    isActive: true,
    created_at: new Date('2024-01-15').toISOString()
  },
  { 
    id: "ai92", 
    name: "АИ-92", 
    code: "AI92", 
    isActive: true,
    created_at: new Date('2024-02-20').toISOString()
  },
  { 
    id: "dt", 
    name: "ДТ", 
    code: "DT", 
    isActive: true,
    created_at: new Date('2024-03-10').toISOString()
  },
  { 
    id: "ai98", 
    name: "АИ-98", 
    code: "AI98", 
    isActive: true, // Активен - есть резервуары на АЗС 003, 004, 005
    created_at: new Date('2024-04-05').toISOString()
  },
  { 
    id: "ai100", 
    name: "АИ-100", 
    code: "AI100", 
    isActive: true, // Активен - есть резервуар на АЗС 004
    created_at: new Date('2024-03-01').toISOString()
  },
  // Деактивированные виды топлива (нет резервуаров)
  { 
    id: "gas", 
    name: "Газ", 
    code: "GAS", 
    isActive: false,
    created_at: new Date('2024-01-01').toISOString()
  }
];

// Цены для всех АЗС демо сети (соответствуют резервуарам)
const initialCurrentPrices: FuelPrice[] = [
  // АЗС №001 - Центральная (3 вида топлива: АИ-95, АИ-92, ДТ)
  {
    id: "price_point1_ai95",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5320, // 53.20 руб
    vatRate: 20,
    priceGross: 6384, // 63.84 руб
    unit: "Л",
    appliedFrom: "2024-12-07T08:00:00Z",
    status: "active",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    packageId: "pkg_point1_1",
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-12-07').toISOString()
  },
  {
    id: "price_point1_ai92",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5045, // 50.45 руб
    vatRate: 20,
    priceGross: 6054, // 60.54 руб
    unit: "Л",
    appliedFrom: "2024-12-07T08:00:00Z",
    status: "active",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    packageId: "pkg_point1_2",
    created_at: new Date('2024-02-20').toISOString(),
    updated_at: new Date('2024-12-07').toISOString()
  },
  {
    id: "price_point1_dt",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5195, // 51.95 руб
    vatRate: 20,
    priceGross: 6234, // 62.34 руб
    unit: "Л",
    appliedFrom: "2024-12-06T14:30:00Z",
    status: "active",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    packageId: "pkg_point1_3",
    created_at: new Date('2024-03-10').toISOString(),
    updated_at: new Date('2024-12-06').toISOString()
  },

  // АЗС №002 - Северная (1 вид топлива: АИ-92)
  {
    id: "price_point2_ai92",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5020, // 50.20 руб (дешевле на периферии)
    vatRate: 20,
    priceGross: 6024, // 60.24 руб
    unit: "Л",
    appliedFrom: "2024-12-07T08:00:00Z",
    status: "active",
    tradingPoint: "АЗС №002 - Северная",
    tradingPointId: "point2",
    networkId: "1",
    packageId: "pkg_point2_1",
    created_at: new Date('2024-05-01').toISOString(),
    updated_at: new Date('2024-12-07').toISOString()
  },

  // АЗС №003 - Южная (4 вида топлива: АИ-95, АИ-92, ДТ, АИ-98)
  {
    id: "price_point3_ai95",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5350, // 53.50 руб
    vatRate: 20,
    priceGross: 6420, // 64.20 руб
    unit: "Л",
    appliedFrom: "2024-12-07T08:00:00Z",
    status: "active",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    packageId: "pkg_point3_1",
    created_at: new Date('2024-03-15').toISOString(),
    updated_at: new Date('2024-12-07').toISOString()
  },
  {
    id: "price_point3_ai92",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5070, // 50.70 руб
    vatRate: 20,
    priceGross: 6084, // 60.84 руб
    unit: "Л",
    appliedFrom: "2024-12-07T08:00:00Z",
    status: "active",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    packageId: "pkg_point3_2",
    created_at: new Date('2024-03-15').toISOString(),
    updated_at: new Date('2024-12-07').toISOString()
  },
  {
    id: "price_point3_dt",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5220, // 52.20 руб
    vatRate: 20,
    priceGross: 6264, // 62.64 руб
    unit: "Л",
    appliedFrom: "2024-12-06T14:30:00Z",
    status: "active",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    packageId: "pkg_point3_3",
    created_at: new Date('2024-04-01').toISOString(),
    updated_at: new Date('2024-12-06').toISOString()
  },
  {
    id: "price_point3_ai98",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5850, // 58.50 руб
    vatRate: 20,
    priceGross: 7020, // 70.20 руб
    unit: "Л",
    appliedFrom: "2024-12-05T16:00:00Z",
    status: "active",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    packageId: "pkg_point3_4",
    created_at: new Date('2024-04-15').toISOString(),
    updated_at: new Date('2024-12-05').toISOString()
  },

  // АЗС №004 - Московское шоссе (5 видов топлива: АИ-92, АИ-95, АИ-98, ДТ, АИ-100)
  {
    id: "price_point4_ai92",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5095, // 50.95 руб (трасса дороже)
    vatRate: 20,
    priceGross: 6114, // 61.14 руб
    unit: "Л",
    appliedFrom: "2024-12-07T08:00:00Z",
    status: "active",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    packageId: "pkg_point4_1",
    created_at: new Date('2024-01-10').toISOString(),
    updated_at: new Date('2024-12-07').toISOString()
  },
  {
    id: "price_point4_ai95",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5380, // 53.80 руб
    vatRate: 20,
    priceGross: 6456, // 64.56 руб
    unit: "Л",
    appliedFrom: "2024-12-07T08:00:00Z",
    status: "active",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    packageId: "pkg_point4_2",
    created_at: new Date('2024-01-10').toISOString(),
    updated_at: new Date('2024-12-07').toISOString()
  },
  {
    id: "price_point4_ai98",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5920, // 59.20 руб
    vatRate: 20,
    priceGross: 7104, // 71.04 руб
    unit: "Л",
    appliedFrom: "2024-12-05T16:00:00Z",
    status: "active",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    packageId: "pkg_point4_3",
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-12-05').toISOString()
  },
  {
    id: "price_point4_dt",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5280, // 52.80 руб
    vatRate: 20,
    priceGross: 6336, // 63.36 руб
    unit: "Л",
    appliedFrom: "2024-12-06T14:30:00Z",
    status: "active",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    packageId: "pkg_point4_4",
    created_at: new Date('2024-02-15').toISOString(),
    updated_at: new Date('2024-12-06').toISOString()
  },
  {
    id: "price_point4_ai100",
    fuelType: "АИ-100",
    fuelCode: "AI100",
    priceNet: 6450, // 64.50 руб (премиум топливо)
    vatRate: 20,
    priceGross: 7740, // 77.40 руб
    unit: "Л",
    appliedFrom: "2024-12-05T16:00:00Z",
    status: "active",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    packageId: "pkg_point4_5",
    created_at: new Date('2024-03-01').toISOString(),
    updated_at: new Date('2024-12-05').toISOString()
  },

  // АЗС №005 - Промзона (4 вида топлива: АИ-92 x2, АИ-95, ДТ, АИ-98)
  {
    id: "price_point5_ai92",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 4995, // 49.95 руб (промзона дешевле)
    vatRate: 20,
    priceGross: 5994, // 59.94 руб
    unit: "Л",
    appliedFrom: "2024-12-07T08:00:00Z",
    status: "active",
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    packageId: "pkg_point5_1",
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date('2024-12-07').toISOString()
  },
  {
    id: "price_point5_ai95",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5280, // 52.80 руб
    vatRate: 20,
    priceGross: 6336, // 63.36 руб
    unit: "Л",
    appliedFrom: "2024-12-07T08:00:00Z",
    status: "active",
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    packageId: "pkg_point5_2",
    created_at: new Date('2024-02-10').toISOString(),
    updated_at: new Date('2024-12-07').toISOString()
  },
  {
    id: "price_point5_dt",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5120, // 51.20 руб (промзона дешевле)
    vatRate: 20,
    priceGross: 6144, // 61.44 руб
    unit: "Л",
    appliedFrom: "2024-12-06T14:30:00Z",
    status: "active",
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    packageId: "pkg_point5_3",
    created_at: new Date('2024-03-01').toISOString(),
    updated_at: new Date('2024-12-06').toISOString()
  },
  {
    id: "price_point5_ai98",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5750, // 57.50 руб (статус maintenance)
    vatRate: 20,
    priceGross: 6900, // 69.00 руб
    unit: "Л",
    appliedFrom: "2024-12-05T16:00:00Z",
    status: "scheduled", // резервуар в maintenance
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    packageId: "pkg_point5_4",
    created_at: new Date('2024-04-10').toISOString(),
    updated_at: new Date('2024-12-05').toISOString()
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

// Начальная история изменений цен (соответствует резервуарам)
const initialPriceJournal: PriceJournalEntry[] = [
  {
    id: "journal_1",
    timestamp: "2024-12-07T08:00:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5320,
    priceGross: 6384,
    vatRate: 20,
    source: "package",
    packageId: "pkg_1",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Изменение оптовых цен - Резервуар №1"
  },
  {
    id: "journal_2",
    timestamp: "2024-12-07T08:00:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5045,
    priceGross: 6054,
    vatRate: 20,
    source: "package",
    packageId: "pkg_2",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Изменение оптовых цен - Резервуар №2"
  },
  {
    id: "journal_3",
    timestamp: "2024-12-06T14:30:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5195,
    priceGross: 6234,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_3",
    status: "applied",
    authorName: "Менеджер АЗС №001",
    authorId: "manager_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Корректировка маржи - Резервуар №3"
  },

  // ИСТОРИЯ ЦЕН ЗА АВГУСТ 2025 ГОДА
  
  // АЗС №001 - Центральная (активная станция, изменения каждые 2-3 дня)
  {
    id: "journal_aug_001_001",
    timestamp: "2025-08-31T06:00:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5320,
    priceGross: 6384,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_001_001",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Снижение цены после стабилизации рынка"
  },
  {
    id: "journal_aug_001_002",
    timestamp: "2025-08-29T07:30:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5360,
    priceGross: 6432,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_001_002",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Коррекция цены в связи с колебаниями оптовых цен"
  },
  {
    id: "journal_aug_001_003",
    timestamp: "2025-08-27T08:15:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5045,
    priceGross: 6054,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_001_003",
    status: "applied",
    authorName: "Менеджер АЗС №001",
    authorId: "manager_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Выравнивание цены с конкурентами в районе"
  },
  {
    id: "journal_aug_001_004",
    timestamp: "2025-08-25T09:00:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5120,
    priceGross: 6144,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_001_004",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Временное повышение цены из-за роста биржевых котировок"
  },
  {
    id: "journal_aug_001_005",
    timestamp: "2025-08-23T10:45:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5195,
    priceGross: 6234,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_001_005",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Стабилизация цены на дизельное топливо"
  },
  {
    id: "journal_aug_001_006",
    timestamp: "2025-08-20T07:20:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5250,
    priceGross: 6300,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_001_006",
    status: "applied",
    authorName: "Менеджер АЗС №001",
    authorId: "manager_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Коррекция цены ДТ в связи с изменением поставщика"
  },
  {
    id: "journal_aug_001_007",
    timestamp: "2025-08-18T06:30:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5290,
    priceGross: 6348,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_001_007",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Плановая коррекция цены АИ-95"
  },
  {
    id: "journal_aug_001_008",
    timestamp: "2025-08-15T08:00:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5080,
    priceGross: 6096,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_001_008",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Снижение цены АИ-92 к середине месяца"
  },
  {
    id: "journal_aug_001_009",
    timestamp: "2025-08-12T07:15:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5280,
    priceGross: 6336,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_001_009",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Изменение цены ДТ по результатам анализа спроса"
  },
  {
    id: "journal_aug_001_010",
    timestamp: "2025-08-10T09:30:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5340,
    priceGross: 6408,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_001_010",
    status: "applied",
    authorName: "Менеджер АЗС №001",
    authorId: "manager_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Корректировка цены в связи с ростом спроса"
  },
  {
    id: "journal_aug_001_011",
    timestamp: "2025-08-07T06:45:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5150,
    priceGross: 6180,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_001_011",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Плановое изменение цены в начале недели"
  },
  {
    id: "journal_aug_001_012",
    timestamp: "2025-08-05T10:00:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5320,
    priceGross: 6384,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_001_012",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Повышение цены ДТ в начале месяца"
  },
  {
    id: "journal_aug_001_013",
    timestamp: "2025-08-02T08:30:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5280,
    priceGross: 6336,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_001_013",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №001 - Центральная",
    tradingPointId: "point1",
    networkId: "1",
    notes: "Стартовая цена на август месяц"
  },

  // АЗС №002 - Северная (периферийная станция, изменения раз в 5-7 дней)
  {
    id: "journal_aug_002_001",
    timestamp: "2025-08-30T11:00:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5020,
    priceGross: 6024,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_002_001",
    status: "applied",
    authorName: "Менеджер АЗС №002",
    authorId: "manager_2",
    tradingPoint: "АЗС №002 - Северная",
    tradingPointId: "point2",
    networkId: "1",
    notes: "Финальная корректировка цены за август"
  },
  {
    id: "journal_aug_002_002",
    timestamp: "2025-08-23T10:30:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5050,
    priceGross: 6060,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_002_002",
    status: "applied",
    authorName: "Менеджер АЗС №002",
    authorId: "manager_2",
    tradingPoint: "АЗС №002 - Северная",
    tradingPointId: "point2",
    networkId: "1",
    notes: "Снижение цены для привлечения клиентов"
  },
  {
    id: "journal_aug_002_003",
    timestamp: "2025-08-16T09:15:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5090,
    priceGross: 6108,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_002_003",
    status: "applied",
    authorName: "Менеджер АЗС №002",
    authorId: "manager_2",
    tradingPoint: "АЗС №002 - Северная",
    tradingPointId: "point2",
    networkId: "1",
    notes: "Корректировка цены в середине месяца"
  },
  {
    id: "journal_aug_002_004",
    timestamp: "2025-08-09T12:00:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5110,
    priceGross: 6132,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_002_004",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №002 - Северная",
    tradingPointId: "point2",
    networkId: "1",
    notes: "Синхронизация с сетевой политикой ценообразования"
  },
  {
    id: "journal_aug_002_005",
    timestamp: "2025-08-02T14:45:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5080,
    priceGross: 6096,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_002_005",
    status: "applied",
    authorName: "Менеджер АЗС №002",
    authorId: "manager_2",
    tradingPoint: "АЗС №002 - Северная",
    tradingPointId: "point2",
    networkId: "1",
    notes: "Стартовая цена на август (периферийная зона)"
  },

  // АЗС №003 - Южная (средняя активность, изменения каждые 3-4 дня)
  {
    id: "journal_aug_003_001",
    timestamp: "2025-08-31T07:00:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5350,
    priceGross: 6420,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_003_001",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    notes: "Финальная цена августа"
  },
  {
    id: "journal_aug_003_002",
    timestamp: "2025-08-28T08:30:00Z",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5850,
    priceGross: 7020,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_003_002",
    status: "applied",
    authorName: "Менеджер АЗС №003",
    authorId: "manager_3",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    notes: "Стабилизация цены на премиум топливо"
  },
  {
    id: "journal_aug_003_003",
    timestamp: "2025-08-25T10:15:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5070,
    priceGross: 6084,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_003_003",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    notes: "Выравнивание цены АИ-92 с рыночными условиями"
  },
  {
    id: "journal_aug_003_004",
    timestamp: "2025-08-22T11:45:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5220,
    priceGross: 6264,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_003_004",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    notes: "Корректировка цены ДТ"
  },
  {
    id: "journal_aug_003_005",
    timestamp: "2025-08-19T09:00:00Z",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5920,
    priceGross: 7104,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_003_005",
    status: "applied",
    authorName: "Менеджер АЗС №003",
    authorId: "manager_3",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    notes: "Повышение цены АИ-98 из-за дефицита"
  },
  {
    id: "journal_aug_003_006",
    timestamp: "2025-08-16T07:30:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5380,
    priceGross: 6456,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_003_006",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    notes: "Плановая корректировка цены АИ-95"
  },
  {
    id: "journal_aug_003_007",
    timestamp: "2025-08-13T12:15:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5120,
    priceGross: 6144,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_003_007",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    notes: "Изменение цены АИ-92 в середине месяца"
  },
  {
    id: "journal_aug_003_008",
    timestamp: "2025-08-10T08:45:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5280,
    priceGross: 6336,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_003_008",
    status: "applied",
    authorName: "Менеджер АЗС №003",
    authorId: "manager_3",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    notes: "Локальная корректировка цены ДТ"
  },
  {
    id: "journal_aug_003_009",
    timestamp: "2025-08-07T10:00:00Z",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5880,
    priceGross: 7056,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_003_009",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    notes: "Сетевая корректировка цены премиум топлива"
  },
  {
    id: "journal_aug_003_010",
    timestamp: "2025-08-04T11:30:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5320,
    priceGross: 6384,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_003_010",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    notes: "Корректировка цены в начале недели"
  },
  {
    id: "journal_aug_003_011",
    timestamp: "2025-08-01T09:15:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5100,
    priceGross: 6120,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_003_011",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №003 - Южная",
    tradingPointId: "point3",
    networkId: "1",
    notes: "Стартовая цена на август"
  },

  // АЗС №004 - Московское шоссе (трассовая станция, частые изменения каждые 2 дня)
  {
    id: "journal_aug_004_001",
    timestamp: "2025-08-31T05:30:00Z",
    fuelType: "АИ-100",
    fuelCode: "AI100",
    priceNet: 6450,
    priceGross: 7740,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_004_001",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Финальная цена августа на премиум топливо"
  },
  {
    id: "journal_aug_004_002",
    timestamp: "2025-08-29T06:15:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5380,
    priceGross: 6456,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_004_002",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Стабилизация цены на трассе"
  },
  {
    id: "journal_aug_004_003",
    timestamp: "2025-08-27T07:45:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5095,
    priceGross: 6114,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_004_003",
    status: "applied",
    authorName: "Менеджер АЗС №004",
    authorId: "manager_4",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Корректировка цены для междугородных перевозчиков"
  },
  {
    id: "journal_aug_004_004",
    timestamp: "2025-08-25T08:00:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5280,
    priceGross: 6336,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_004_004",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Снижение цены ДТ для грузоперевозчиков"
  },
  {
    id: "journal_aug_004_005",
    timestamp: "2025-08-23T09:30:00Z",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5920,
    priceGross: 7104,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_004_005",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Цена премиум топлива на трассе"
  },
  {
    id: "journal_aug_004_006",
    timestamp: "2025-08-21T06:45:00Z",
    fuelType: "АИ-100",
    fuelCode: "AI100",
    priceNet: 6520,
    priceGross: 7824,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_004_006",
    status: "applied",
    authorName: "Менеджер АЗС №004",
    authorId: "manager_4",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Повышение цены элитного топлива"
  },
  {
    id: "journal_aug_004_007",
    timestamp: "2025-08-19T10:15:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5420,
    priceGross: 6504,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_004_007",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Корректировка под рыночные условия"
  },
  {
    id: "journal_aug_004_008",
    timestamp: "2025-08-17T11:00:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5150,
    priceGross: 6180,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_004_008",
    status: "applied",
    authorName: "Менеджер АЗС №004",
    authorId: "manager_4",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Повышение цены в связи с ростом спроса на выходные"
  },
  {
    id: "journal_aug_004_009",
    timestamp: "2025-08-15T07:30:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5350,
    priceGross: 6420,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_004_009",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Повышение цены ДТ в середине месяца"
  },
  {
    id: "journal_aug_004_010",
    timestamp: "2025-08-13T08:45:00Z",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5980,
    priceGross: 7176,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_004_010",
    status: "applied",
    authorName: "Менеджер АЗС №004",
    authorId: "manager_4",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Локальная корректировка цены АИ-98"
  },
  {
    id: "journal_aug_004_011",
    timestamp: "2025-08-11T09:15:00Z",
    fuelType: "АИ-100",
    fuelCode: "AI100",
    priceNet: 6480,
    priceGross: 7776,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_004_011",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Снижение цены элитного топлива"
  },
  {
    id: "journal_aug_004_012",
    timestamp: "2025-08-09T10:30:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5450,
    priceGross: 6540,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_004_012",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Повышение цены на выходные дни"
  },
  {
    id: "journal_aug_004_013",
    timestamp: "2025-08-07T06:00:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5120,
    priceGross: 6144,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_004_013",
    status: "applied",
    authorName: "Менеджер АЗС №004",
    authorId: "manager_4",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Начало недели - корректировка цены"
  },
  {
    id: "journal_aug_004_014",
    timestamp: "2025-08-05T11:45:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5320,
    priceGross: 6384,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_004_014",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Корректировка цены ДТ в начале месяца"
  },
  {
    id: "journal_aug_004_015",
    timestamp: "2025-08-03T08:15:00Z",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5950,
    priceGross: 7140,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_004_015",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Корректировка цены премиум топлива"
  },
  {
    id: "journal_aug_004_016",
    timestamp: "2025-08-01T07:00:00Z",
    fuelType: "АИ-100",
    fuelCode: "AI100",
    priceNet: 6420,
    priceGross: 7704,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_004_016",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №004 - Московское шоссе",
    tradingPointId: "point4",
    networkId: "1",
    notes: "Стартовая цена элитного топлива на август"
  },

  // АЗС №005 - Промзона (промышленная зона, изменения каждые 4-5 дней)
  {
    id: "journal_aug_005_001",
    timestamp: "2025-08-31T12:00:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5120,
    priceGross: 6144,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_005_001",
    status: "applied",
    authorName: "Менеджер АЗС №005",
    authorId: "manager_5",
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    notes: "Финальная цена августа для промышленных клиентов"
  },
  {
    id: "journal_aug_005_002",
    timestamp: "2025-08-27T13:30:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5280,
    priceGross: 6336,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_005_002",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    notes: "Корректировка цены АИ-95 для промзоны"
  },
  {
    id: "journal_aug_005_003",
    timestamp: "2025-08-23T14:15:00Z",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5750,
    priceGross: 6900,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_005_003",
    status: "applied",
    authorName: "Менеджер АЗС №005",
    authorId: "manager_5",
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    notes: "Стабилизация цены премиум топлива"
  },
  {
    id: "journal_aug_005_004",
    timestamp: "2025-08-19T10:45:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 4995,
    priceGross: 5994,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_005_004",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    notes: "Льготная цена для промышленных предприятий"
  },
  {
    id: "journal_aug_005_005",
    timestamp: "2025-08-15T11:30:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5180,
    priceGross: 6216,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_005_005",
    status: "applied",
    authorName: "Менеджер АЗС №005",
    authorId: "manager_5",
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    notes: "Повышение цены ДТ в середине месяца"
  },
  {
    id: "journal_aug_005_006",
    timestamp: "2025-08-11T09:00:00Z",
    fuelType: "АИ-95",
    fuelCode: "AI95",
    priceNet: 5320,
    priceGross: 6384,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_005_006",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    notes: "Корректировка цены под рыночные условия"
  },
  {
    id: "journal_aug_005_007",
    timestamp: "2025-08-07T12:45:00Z",
    fuelType: "АИ-98",
    fuelCode: "AI98",
    priceNet: 5820,
    priceGross: 6984,
    vatRate: 20,
    source: "manual",
    packageId: "pkg_aug_005_007",
    status: "applied",
    authorName: "Менеджер АЗС №005",
    authorId: "manager_5",
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    notes: "Локальная корректировка премиум топлива"
  },
  {
    id: "journal_aug_005_008",
    timestamp: "2025-08-03T13:15:00Z",
    fuelType: "АИ-92",
    fuelCode: "AI92",
    priceNet: 5050,
    priceGross: 6060,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_005_008",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    notes: "Корректировка цены в начале месяца"
  },
  {
    id: "journal_aug_005_009",
    timestamp: "2025-08-01T14:00:00Z",
    fuelType: "ДТ",
    fuelCode: "DT",
    priceNet: 5200,
    priceGross: 6240,
    vatRate: 20,
    source: "package",
    packageId: "pkg_aug_005_009",
    status: "applied",
    authorName: "Администратор сети",
    authorId: "user_1",
    tradingPoint: "АЗС №005 - Промзона",
    tradingPointId: "point5",
    networkId: "1",
    notes: "Стартовая цена ДТ на август для промзоны"
  }
];

class PricesService {
  private client = supabaseService;
  
  private isSupabaseMode(): boolean {
    return !apiConfigService.isMockMode() && import.meta.env.VITE_SUPABASE_URL;
  }
  
  // Трансформация данных из Supabase в UI формат
  private transformSupabasePriceToUI(dbPrice: any): FuelPrice {
    return {
      id: dbPrice.id,
      fuelType: dbPrice.fuel_types?.name || 'Unknown',
      fuelCode: dbPrice.fuel_types?.code || '',
      priceNet: dbPrice.price_net,
      vatRate: dbPrice.vat_rate,
      priceGross: dbPrice.price_gross,
      unit: dbPrice.unit || 'L',
      appliedFrom: dbPrice.valid_from,
      status: dbPrice.is_active ? 'active' : 'expired',
      tradingPoint: dbPrice.trading_points?.name || 'Unknown',
      networkId: dbPrice.trading_point_id,
      tradingPointId: dbPrice.trading_point_id,
      packageId: dbPrice.package_id,
      created_at: dbPrice.created_at,
      updated_at: dbPrice.updated_at
    };
  }
  
  // Создать демо-данные цен для существующих торговых точек
  async createDemoPrices(): Promise<void> {
    if (!this.isSupabaseMode()) return;
    
    try {
      // Получаем существующие торговые точки и типы топлива
      const [tpResult, ftResult] = await Promise.all([
        this.client.from('trading_points').select('id, name').limit(3),
        this.client.from('fuel_types').select('id, name, code').eq('is_active', true).limit(5)
      ]);
      
      if (tpResult.error || ftResult.error) {
        console.error('Ошибка получения данных для демо-цен:', tpResult.error || ftResult.error);
        return;
      }
      
      const tradingPoints = tpResult.data || [];
      const fuelTypes = ftResult.data || [];
      
      if (tradingPoints.length === 0 || fuelTypes.length === 0) {
        return;
      }
      
      // Создаем по несколько цен для каждой торговой точки
      const demoPrices = [];
      
      for (const tp of tradingPoints.slice(0, 2)) { // Первые 2 торговые точки
        for (const ft of fuelTypes.slice(0, 3)) { // Первые 3 вида топлива
          const basePrice = ft.code === 'AI95' ? 5300 : 
                          ft.code === 'AI92' ? 5000 : 
                          ft.code === 'DT_SUMMER' ? 5200 : 5100;
          
          demoPrices.push({
            trading_point_id: tp.id,
            fuel_type_id: ft.id,
            price_net: basePrice,
            vat_rate: 20,
            price_gross: Math.round(basePrice * 1.2),
            source: 'manual',
            valid_from: new Date().toISOString(),
            is_active: true,
            created_by: '550e8400-e29b-41d4-a716-446655440000', // demo user
            reason: `Демо-цена на ${ft.name} для ${tp.name}`,
            metadata: { demo: true }
          });
        }
      }
      
      // Вставляем демо-цены
      const { data, error } = await this.client
        .from('prices')
        .insert(demoPrices);
      
      if (error) {
        console.error('Ошибка создания демо-цен:', error);
      } else {
      }
      
    } catch (error) {
      console.error('Исключение при создании демо-цен:', error);
    }
  }


  private transformSupabaseFuelType(supabaseFuelType: any): FuelType {
    return {
      id: supabaseFuelType.id,
      name: supabaseFuelType.name,
      code: supabaseFuelType.code,
      isActive: supabaseFuelType.is_active,
      created_at: supabaseFuelType.created_at
    };
  }

  // Получить типы топлива
  async getFuelTypes(): Promise<FuelType[]> {
    if (this.isSupabaseMode()) {
      try {
        const { data, error } = await this.client
          .from('fuel_types')
          .select('id, name, code, is_active, created_at')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        
        return (data || []).map(ft => this.transformSupabaseFuelType(ft));
      } catch (error) {
        console.error('Error loading fuel types from Supabase:', error);
        // Fallback к localStorage
      }
    }

    // Fallback или mock режим
    return this.getFuelTypesFromLocalStorage();
  }

  private getFuelTypesFromLocalStorage(): FuelType[] {
    return PersistentStorage.load<FuelType>('fuelTypes', initialFuelTypes)
      .filter(fuel => fuel.isActive);
  }

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
  }

  // Получить текущие цены
  async getCurrentPrices(tradingPointId?: string, networkId?: string): Promise<FuelPrice[]> {
    if (this.isSupabaseMode()) {
      try {
        let query = this.client.from('prices');
        
        // Добавляем связанные данные
        query = query.select(`
          *,
          fuel_types(name, code),
          trading_points(name)
        `);
        
        // Фильтры
        if (tradingPointId) {
          query = query.eq('trading_point_id', tradingPointId);
        }
        
        // Только активные цены
        query = query.eq('is_active', true);
        
        // Только актуальные по времени
        const now = new Date().toISOString();
        query = query.lte('valid_from', now);
        
        // Сортировка по fuel type
        query = query.order('valid_from', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return (data || []).map(price => this.transformSupabasePriceToUI(price));
        
      } catch (error) {
        console.error('Error loading prices from Supabase:', error);
        // Fallback к localStorage
      }
    }
    
    // Fallback или mock режим
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let prices = [...mockCurrentPrices];
    
    if (tradingPointId) {
      prices = prices.filter(price => price.tradingPointId === tradingPointId);
    }
    
    if (networkId) {
      prices = prices.filter(price => price.networkId === networkId);
    }
    
    return prices.sort((a, b) => a.fuelType.localeCompare(b.fuelType));
  }

  // Создать/обновить цену
  async upsertPrice(priceData: {
    tradingPointId: string;
    fuelTypeId: string;
    priceNet: number;
    vatRate?: number;
    source?: 'manual' | 'import' | 'api' | 'package';
    reason?: string;
    createdBy: string;
  }): Promise<FuelPrice | null> {
    if (this.isSupabaseMode()) {
      try {
        const vatRate = priceData.vatRate || 20;
        const priceGross = Math.round(priceData.priceNet * (1 + vatRate / 100));
        
        // Деактивируем старые цены
        await this.client
          .from('prices')
          .update({ is_active: false })
          .eq('trading_point_id', priceData.tradingPointId)
          .eq('fuel_type_id', priceData.fuelTypeId)
          .eq('is_active', true);
        
        // Создаем новую цену
        const { data, error } = await this.client
          .from('prices')
          .insert({
            trading_point_id: priceData.tradingPointId,
            fuel_type_id: priceData.fuelTypeId,
            price_net: priceData.priceNet,
            vat_rate: vatRate,
            price_gross: priceGross,
            source: priceData.source || 'manual',
            valid_from: new Date().toISOString(),
            is_active: true,
            created_by: priceData.createdBy,
            reason: priceData.reason,
            metadata: {}
          })
          .select(`
            *,
            fuel_types(name, code),
            trading_points(name)
          `)
          .single();
        
        if (error) throw error;
        
        return this.transformSupabasePriceToUI(data);
        
      } catch (error) {
        console.error('Error upserting price to Supabase:', error);
        // Fallback к localStorage
      }
    }
    
    // Fallback или mock режим
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const priceGross = calculateGrossPrice(priceData.priceNet, priceData.vatRate || 20);
    
    // Преобразуем в старый формат для совместимости
    const price = {
      fuelCode: 'UNKNOWN', // TODO: получить из fuel_type
      fuelType: 'Unknown',
      priceNet: priceData.priceNet,
      vatRate: priceData.vatRate || 20,
      unit: 'L',
      appliedFrom: new Date().toISOString(),
      status: 'active' as const,
      tradingPoint: 'Unknown',
      networkId: '1',
      tradingPointId: priceData.tradingPointId
    };
    
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
  }

  // Удалить цену
  async deletePrice(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const index = mockCurrentPrices.findIndex(price => price.id === id);
    if (index >= 0) {
      mockCurrentPrices.splice(index, 1);
      saveCurrentPrices();
    }
  }

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
  }

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
  }

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
  }

  // Получить историю изменений цен
  async getPriceJournal(tradingPointId?: string, fuelCode?: string, limit = 50): Promise<PriceJournalEntry[]> {
    if (this.isSupabaseMode()) {
      try {
        let query = this.client.from('price_history');
        
        query = query.select(`
          *,
          fuel_types(name, code),
          trading_points(name)
        `);
        
        if (tradingPointId) {
          query = query.eq('trading_point_id', tradingPointId);
        }
        
        query = query.order('effective_date', { ascending: false });
        
        if (limit) {
          query = query.limit(limit);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Трансформируем в формат UI
        return (data || []).map((entry: any) => ({
          id: entry.id,
          timestamp: entry.effective_date,
          fuelType: entry.fuel_types?.name || 'Unknown',
          fuelCode: entry.fuel_types?.code || '',
          priceNet: entry.new_price_net,
          priceGross: entry.new_price_gross,
          vatRate: entry.vat_rate,
          source: entry.source,
          packageId: entry.package_id,
          status: 'applied', // Все записи в истории уже применены
          authorName: 'User', // TODO: получить из связанных данных
          authorId: entry.changed_by,
          tradingPoint: entry.trading_points?.name || 'Unknown',
          tradingPointId: entry.trading_point_id,
          networkId: '1', // TODO: получить из trading_points
          notes: entry.reason
        }));
        
      } catch (error) {
        console.error('Error loading price history from Supabase:', error);
        // Fallback к localStorage
      }
    }
    
    // Fallback или mock режим
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
}

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

// Функция для сброса и обновления всех данных о ценах (для обновления связанной схемы)
const resetPricesData = () => {
  PersistentStorage.remove('fuelTypes');
  PersistentStorage.remove('currentPrices');
  PersistentStorage.remove('pricePackages');
  PersistentStorage.remove('priceJournal');
  
  mockFuelTypes = [...initialFuelTypes];
  mockCurrentPrices = [...initialCurrentPrices];
  mockPricePackages = [...initialPricePackages];
  mockPriceJournal = [...initialPriceJournal];
  
  saveFuelTypes();
  saveCurrentPrices();
  savePricePackages();
  savePriceJournal();
  
};

// Данные только для fallback режима - в продакшене используется Supabase
if (apiConfigService.isMockMode()) {
  resetPricesData();
}

// Вспомогательные функции
const calculateGrossPrice = (priceNet: number, vatRate: number): number => {
  return Math.round(priceNet * (1 + vatRate / 100));
};

// Экспорт сервиса
export const pricesService = new PricesService();