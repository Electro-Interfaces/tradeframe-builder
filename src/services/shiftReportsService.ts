/**
 * Сервис для работы со сменными отчетами
 * Включает персистентное хранение в localStorage и поддержку частичной миграции
 */

import { PersistentStorage } from '@/utils/persistentStorage';
import { getApiBaseUrl } from '@/services/apiConfigService';

export type ShiftStatus = 'draft' | 'closed' | 'synchronized' | 'archived';
export type DocumentType = 'z-report' | 'acceptance-act' | 'transfer-act' | 'correction' | 'invoice';
export type DocumentStatus = 'draft' | 'ready' | 'error';

export interface FuelPosition {
  id: string;
  fuelType: string;
  fuelCode: string;
  tankNumber: string;
  
  // Остатки в литрах
  startBalance: number;        // остаток на начало
  received: number;           // поступило за смену
  dispensed: number;          // отпуск по ТРК
  calculatedBalance: number;  // расчётный остаток
  actualBalance: number;      // фактический остаток
  difference: number;         // разница (факт - расчёт)
  
  // Показания ТРК
  meterStart: number;         // показания ТРК на начало
  meterEnd: number;          // показания ТРК на конец
  
  // Замеры резервуара
  levelMm: number;           // уровень в мм
  waterMm: number;           // вода в мм
  temperature: number;       // температура
  
  // Допустимая погрешность ТРК
  allowedErrorPercent: number;
  hasExcessError: boolean;    // превышение допустимой погрешности
  
  // Кассовые итоги по виду топлива
  revenue: number;           // выручка в копейках
  receiptCount: number;      // количество чеков
}

export interface ShiftDocument {
  id: string;
  type: DocumentType;
  name: string;
  createdAt: string;
  fileSize?: number;
  status: DocumentStatus;
  filePath?: string;
  description?: string;
}

export interface ShiftReport {
  id: string;
  shiftNumber: number;
  openedAt: string;
  closedAt?: string;
  operator: string;
  operatorId: string;
  tradingPointId: string;
  tradingPointName: string;
  status: ShiftStatus;
  
  // Итоги смены
  totalRevenue: number; // общая выручка в копейках
  totalVolume: number; // общий отпуск в литрах
  receiptCount: number; // количество чеков
  
  // Способы оплаты
  payments: {
    cash: number;      // наличные
    cards: number;     // банковские карты
    sbp: number;       // СБП
    fuelCards: number; // топливные карты
    other: number;     // прочие способы
  };
  
  // Позиции по видам топлива
  fuelPositions: FuelPosition[];
  
  // Документы смены
  documents: ShiftDocument[];
  
  // Метаданные
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShiftReportInput {
  shiftNumber?: number;
  operator: string;
  operatorId: string;
  tradingPointId: string;
  tradingPointName: string;
  totalRevenue?: number;
  totalVolume?: number;
  receiptCount?: number;
  payments?: Partial<ShiftReport['payments']>;
  fuelPositions?: Omit<FuelPosition, 'id'>[];
  documents?: Omit<ShiftDocument, 'id'>[];
  metadata?: Record<string, any>;
}

export interface ShiftStatistics {
  totalShifts: number;
  shiftsByStatus: Record<ShiftStatus, number>;
  shiftsByOperator: Record<string, number>;
  shiftsByTradingPoint: Record<string, number>;
  totalRevenue: number;
  totalVolume: number;
  averageShiftRevenue: number;
  averageShiftVolume: number;
  lastShiftDate?: string;
}

// Начальные данные сменных отчетов
const initialShiftReports: ShiftReport[] = [
  {
    id: "SHIFT-001",
    shiftNumber: 1,
    openedAt: "2024-08-30T08:00:00Z",
    closedAt: "2024-08-30T20:00:00Z",
    operator: "Иван Петров",
    operatorId: "4",
    tradingPointId: "point1",
    tradingPointName: "АЗС №001 - Центральная",
    status: "closed",
    totalRevenue: 125687500, // 1,256,875.00 руб в копейках
    totalVolume: 2145.8,
    receiptCount: 67,
    payments: {
      cash: 25687500,    // 256,875.00
      cards: 87500000,   // 875,000.00
      sbp: 12500000,     // 125,000.00
      fuelCards: 0,
      other: 0
    },
    fuelPositions: [
      {
        id: "FP-001",
        fuelType: "АИ-95",
        fuelCode: "AI95",
        tankNumber: "1",
        startBalance: 15000,
        received: 0,
        dispensed: 1245.8,
        calculatedBalance: 13754.2,
        actualBalance: 13750.0,
        difference: -4.2,
        meterStart: 125640,
        meterEnd: 126885.8,
        levelMm: 1250,
        waterMm: 0,
        temperature: 15.5,
        allowedErrorPercent: 0.25,
        hasExcessError: false,
        revenue: 75000000,
        receiptCount: 32
      },
      {
        id: "FP-002",
        fuelType: "АИ-92",
        fuelCode: "AI92",
        tankNumber: "2",
        startBalance: 18000,
        received: 0,
        dispensed: 900.0,
        calculatedBalance: 17100.0,
        actualBalance: 17095.5,
        difference: -4.5,
        meterStart: 98750,
        meterEnd: 99650,
        levelMm: 1580,
        waterMm: 0,
        temperature: 16.2,
        allowedErrorPercent: 0.25,
        hasExcessError: false,
        revenue: 50687500,
        receiptCount: 35
      }
    ],
    documents: [
      {
        id: "DOC-001",
        type: "z-report",
        name: "Z-отчет смена 1",
        createdAt: "2024-08-30T20:00:00Z",
        fileSize: 15420,
        status: "ready",
        description: "Отчет о закрытии кассовой смены"
      },
      {
        id: "DOC-002",
        type: "acceptance-act",
        name: "Акт приема-передачи смены",
        createdAt: "2024-08-30T20:05:00Z",
        fileSize: 8750,
        status: "ready",
        description: "Акт передачи смены следующему оператору"
      }
    ],
    createdAt: new Date('2024-08-30T08:00:00Z'),
    updatedAt: new Date('2024-08-30T20:00:00Z')
  },
  {
    id: "SHIFT-002",
    shiftNumber: 2,
    openedAt: "2024-08-30T20:00:00Z",
    closedAt: "2024-08-31T08:00:00Z",
    operator: "Мария Сидорова",
    operatorId: "6",
    tradingPointId: "point1",
    tradingPointName: "АЗС №001 - Центральная",
    status: "synchronized",
    totalRevenue: 89432100,
    totalVolume: 1567.2,
    receiptCount: 45,
    payments: {
      cash: 15432100,
      cards: 62000000,
      sbp: 12000000,
      fuelCards: 0,
      other: 0
    },
    fuelPositions: [
      {
        id: "FP-003",
        fuelType: "АИ-95",
        fuelCode: "AI95",
        tankNumber: "1",
        startBalance: 13750.0,
        received: 0,
        dispensed: 867.2,
        calculatedBalance: 12882.8,
        actualBalance: 12880.0,
        difference: -2.8,
        meterStart: 126885.8,
        meterEnd: 127753.0,
        levelMm: 1180,
        waterMm: 0,
        temperature: 14.8,
        allowedErrorPercent: 0.25,
        hasExcessError: false,
        revenue: 52200000,
        receiptCount: 22
      },
      {
        id: "FP-004",
        fuelType: "АИ-92",
        fuelCode: "AI92",
        tankNumber: "2",
        startBalance: 17095.5,
        received: 0,
        dispensed: 700.0,
        calculatedBalance: 16395.5,
        actualBalance: 16392.0,
        difference: -3.5,
        meterStart: 99650,
        meterEnd: 100350,
        levelMm: 1520,
        waterMm: 0,
        temperature: 15.9,
        allowedErrorPercent: 0.25,
        hasExcessError: false,
        revenue: 37232100,
        receiptCount: 23
      }
    ],
    documents: [
      {
        id: "DOC-003",
        type: "z-report",
        name: "Z-отчет смена 2",
        createdAt: "2024-08-31T08:00:00Z",
        fileSize: 14890,
        status: "ready"
      }
    ],
    createdAt: new Date('2024-08-30T20:00:00Z'),
    updatedAt: new Date('2024-08-31T08:00:00Z')
  },
  {
    id: "SHIFT-003",
    shiftNumber: 3,
    openedAt: "2024-08-31T08:00:00Z",
    operator: "Алексей Козлов",
    operatorId: "5",
    tradingPointId: "point2",
    tradingPointName: "АЗС №002 - Северная",
    status: "draft",
    totalRevenue: 34567800,
    totalVolume: 642.5,
    receiptCount: 18,
    payments: {
      cash: 8567800,
      cards: 26000000,
      sbp: 0,
      fuelCards: 0,
      other: 0
    },
    fuelPositions: [
      {
        id: "FP-005",
        fuelType: "ДТ",
        fuelCode: "DT",
        tankNumber: "3",
        startBalance: 20000,
        received: 0,
        dispensed: 642.5,
        calculatedBalance: 19357.5,
        actualBalance: 19355.0,
        difference: -2.5,
        meterStart: 87450,
        meterEnd: 88092.5,
        levelMm: 1750,
        waterMm: 2,
        temperature: 18.2,
        allowedErrorPercent: 0.25,
        hasExcessError: false,
        revenue: 34567800,
        receiptCount: 18
      }
    ],
    documents: [],
    createdAt: new Date('2024-08-31T08:00:00Z'),
    updatedAt: new Date('2024-08-31T15:30:00Z')
  }
];

// Загружаем данные из localStorage
let shiftReportsData: ShiftReport[] = PersistentStorage.load<ShiftReport>('shiftReports', initialShiftReports);
let nextShiftId = Math.max(...shiftReportsData.map(sr => parseInt(sr.id.replace('SHIFT-', '')) || 0)) + 1;
let nextDocumentId = 1;
let nextFuelPositionId = 1;

// API Base URL для централизованного управления
const getApiUrl = () => getApiBaseUrl();

// Функция для сохранения изменений
const saveShiftReports = () => {
  PersistentStorage.save('shiftReports', shiftReportsData);
};

// API сервис сменных отчетов с персистентным хранением
export const shiftReportsService = {
  // Получить все сменные отчеты
  async getAllShiftReports(): Promise<ShiftReport[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...shiftReportsData].sort((a, b) => b.shiftNumber - a.shiftNumber);
  },

  // Получить сменный отчет по ID
  async getShiftReportById(id: string): Promise<ShiftReport | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return shiftReportsData.find(sr => sr.id === id) || null;
  },

  // Получить отчеты по торговой точке
  async getShiftReportsByTradingPoint(tradingPointId: string): Promise<ShiftReport[]> {
    await new Promise(resolve => setTimeout(resolve, 120));
    return shiftReportsData
      .filter(sr => sr.tradingPointId === tradingPointId)
      .sort((a, b) => b.shiftNumber - a.shiftNumber);
  },

  // Получить отчеты по оператору
  async getShiftReportsByOperator(operatorId: string): Promise<ShiftReport[]> {
    await new Promise(resolve => setTimeout(resolve, 120));
    return shiftReportsData
      .filter(sr => sr.operatorId === operatorId)
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  },

  // Получить отчеты по статусу
  async getShiftReportsByStatus(status: ShiftStatus): Promise<ShiftReport[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return shiftReportsData
      .filter(sr => sr.status === status)
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  },

  // Создать новый сменный отчет
  async createShiftReport(input: ShiftReportInput): Promise<ShiftReport> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Генерируем номер смены
    const maxShiftNumber = Math.max(...shiftReportsData.map(sr => sr.shiftNumber || 0));
    const shiftNumber = input.shiftNumber || maxShiftNumber + 1;
    
    // Генерируем ID для позиций топлива
    const fuelPositions: FuelPosition[] = (input.fuelPositions || []).map(fp => ({
      ...fp,
      id: `FP-${String(nextFuelPositionId++).padStart(3, '0')}`
    }));
    
    // Генерируем ID для документов
    const documents: ShiftDocument[] = (input.documents || []).map(doc => ({
      ...doc,
      id: `DOC-${String(nextDocumentId++).padStart(3, '0')}`
    }));
    
    const newShiftReport: ShiftReport = {
      id: `SHIFT-${String(nextShiftId++).padStart(3, '0')}`,
      shiftNumber,
      openedAt: new Date().toISOString(),
      operator: input.operator,
      operatorId: input.operatorId,
      tradingPointId: input.tradingPointId,
      tradingPointName: input.tradingPointName,
      status: 'draft',
      totalRevenue: input.totalRevenue || 0,
      totalVolume: input.totalVolume || 0,
      receiptCount: input.receiptCount || 0,
      payments: {
        cash: input.payments?.cash || 0,
        cards: input.payments?.cards || 0,
        sbp: input.payments?.sbp || 0,
        fuelCards: input.payments?.fuelCards || 0,
        other: input.payments?.other || 0
      },
      fuelPositions,
      documents,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    shiftReportsData.push(newShiftReport);
    saveShiftReports();
    
    return newShiftReport;
  },

  // Обновить сменный отчет
  async updateShiftReport(id: string, updates: Partial<ShiftReportInput>): Promise<ShiftReport | null> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const index = shiftReportsData.findIndex(sr => sr.id === id);
    if (index === -1) return null;
    
    const currentReport = shiftReportsData[index];
    
    // Обновляем позиции топлива
    let fuelPositions = currentReport.fuelPositions;
    if (updates.fuelPositions) {
      fuelPositions = updates.fuelPositions.map((fp, idx) => ({
        ...fp,
        id: currentReport.fuelPositions[idx]?.id || `FP-${String(nextFuelPositionId++).padStart(3, '0')}`
      }));
    }
    
    // Обновляем документы
    let documents = currentReport.documents;
    if (updates.documents) {
      documents = updates.documents.map((doc, idx) => ({
        ...doc,
        id: currentReport.documents[idx]?.id || `DOC-${String(nextDocumentId++).padStart(3, '0')}`
      }));
    }
    
    const updatedReport: ShiftReport = {
      ...currentReport,
      shiftNumber: updates.shiftNumber ?? currentReport.shiftNumber,
      operator: updates.operator ?? currentReport.operator,
      operatorId: updates.operatorId ?? currentReport.operatorId,
      tradingPointId: updates.tradingPointId ?? currentReport.tradingPointId,
      tradingPointName: updates.tradingPointName ?? currentReport.tradingPointName,
      totalRevenue: updates.totalRevenue ?? currentReport.totalRevenue,
      totalVolume: updates.totalVolume ?? currentReport.totalVolume,
      receiptCount: updates.receiptCount ?? currentReport.receiptCount,
      payments: {
        cash: updates.payments?.cash ?? currentReport.payments.cash,
        cards: updates.payments?.cards ?? currentReport.payments.cards,
        sbp: updates.payments?.sbp ?? currentReport.payments.sbp,
        fuelCards: updates.payments?.fuelCards ?? currentReport.payments.fuelCards,
        other: updates.payments?.other ?? currentReport.payments.other
      },
      fuelPositions,
      documents,
      metadata: updates.metadata ? { ...currentReport.metadata, ...updates.metadata } : currentReport.metadata,
      updatedAt: new Date()
    };

    shiftReportsData[index] = updatedReport;
    saveShiftReports();
    
    return updatedReport;
  },

  // Закрыть смену
  async closeShift(id: string): Promise<ShiftReport | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const shiftReport = shiftReportsData.find(sr => sr.id === id);
    if (!shiftReport) return null;
    
    if (shiftReport.status !== 'draft') {
      throw new Error('Можно закрыть только смену в статусе "Черновик"');
    }
    
    shiftReport.status = 'closed';
    shiftReport.closedAt = new Date().toISOString();
    shiftReport.updatedAt = new Date();
    
    saveShiftReports();
    
    return shiftReport;
  },

  // Синхронизировать смену с ФНС
  async synchronizeShift(id: string): Promise<ShiftReport | null> {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Имитация синхронизации
    
    const shiftReport = shiftReportsData.find(sr => sr.id === id);
    if (!shiftReport) return null;
    
    if (shiftReport.status !== 'closed') {
      throw new Error('Можно синхронизировать только закрытую смену');
    }
    
    // Симуляция успешной синхронизации
    const success = Math.random() > 0.1; // 90% успеха
    
    if (success) {
      shiftReport.status = 'synchronized';
      shiftReport.updatedAt = new Date();
      saveShiftReports();
      return shiftReport;
    } else {
      throw new Error('Ошибка синхронизации с ФНС');
    }
  },

  // Архивировать смену
  async archiveShift(id: string): Promise<ShiftReport | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const shiftReport = shiftReportsData.find(sr => sr.id === id);
    if (!shiftReport) return null;
    
    if (shiftReport.status !== 'synchronized') {
      throw new Error('Можно архивировать только синхронизированную смену');
    }
    
    shiftReport.status = 'archived';
    shiftReport.updatedAt = new Date();
    
    saveShiftReports();
    
    return shiftReport;
  },

  // Удалить сменный отчет
  async deleteShiftReport(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 180));
    
    const index = shiftReportsData.findIndex(sr => sr.id === id);
    if (index === -1) return false;
    
    const shiftReport = shiftReportsData[index];
    
    // Можно удалить только черновик
    if (shiftReport.status !== 'draft') {
      throw new Error('Можно удалить только смену в статусе "Черновик"');
    }
    
    shiftReportsData.splice(index, 1);
    saveShiftReports();
    
    return true;
  },

  // Добавить документ к смене
  async addDocument(shiftId: string, document: Omit<ShiftDocument, 'id'>): Promise<ShiftDocument | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const shiftReport = shiftReportsData.find(sr => sr.id === shiftId);
    if (!shiftReport) return null;
    
    const newDocument: ShiftDocument = {
      ...document,
      id: `DOC-${String(nextDocumentId++).padStart(3, '0')}`
    };
    
    shiftReport.documents.push(newDocument);
    shiftReport.updatedAt = new Date();
    
    saveShiftReports();
    
    return newDocument;
  },

  // Поиск сменных отчетов
  async searchShiftReports(query: string, filters?: {
    status?: ShiftStatus;
    operatorId?: string;
    tradingPointId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ShiftReport[]> {
    await new Promise(resolve => setTimeout(resolve, 180));
    
    let filteredReports = shiftReportsData;
    
    // Применяем фильтры
    if (filters) {
      if (filters.status) {
        filteredReports = filteredReports.filter(sr => sr.status === filters.status);
      }
      if (filters.operatorId) {
        filteredReports = filteredReports.filter(sr => sr.operatorId === filters.operatorId);
      }
      if (filters.tradingPointId) {
        filteredReports = filteredReports.filter(sr => sr.tradingPointId === filters.tradingPointId);
      }
      if (filters.dateFrom) {
        filteredReports = filteredReports.filter(sr => sr.openedAt >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filteredReports = filteredReports.filter(sr => sr.openedAt <= filters.dateTo!);
      }
    }
    
    // Поиск по запросу
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      filteredReports = filteredReports.filter(sr => 
        sr.id.toLowerCase().includes(searchLower) ||
        sr.operator.toLowerCase().includes(searchLower) ||
        sr.tradingPointName.toLowerCase().includes(searchLower) ||
        sr.shiftNumber.toString().includes(searchLower)
      );
    }
    
    return filteredReports.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  },

  // Получить статистику по сменным отчетам
  async getStatistics(period?: { from: string; to: string }): Promise<ShiftStatistics> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    let reports = shiftReportsData;
    
    // Фильтр по периоду
    if (period) {
      reports = reports.filter(sr => 
        sr.openedAt >= period.from && sr.openedAt <= period.to
      );
    }
    
    const totalShifts = reports.length;
    
    // Статистика по статусам
    const shiftsByStatus = reports.reduce((acc, sr) => {
      acc[sr.status] = (acc[sr.status] || 0) + 1;
      return acc;
    }, {} as Record<ShiftStatus, number>);
    
    // Статистика по операторам
    const shiftsByOperator = reports.reduce((acc, sr) => {
      acc[sr.operator] = (acc[sr.operator] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Статистика по торговым точкам
    const shiftsByTradingPoint = reports.reduce((acc, sr) => {
      acc[sr.tradingPointName] = (acc[sr.tradingPointName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Финансовая статистика
    const totalRevenue = reports.reduce((sum, sr) => sum + sr.totalRevenue, 0);
    const totalVolume = reports.reduce((sum, sr) => sum + sr.totalVolume, 0);
    const averageShiftRevenue = totalShifts > 0 ? totalRevenue / totalShifts : 0;
    const averageShiftVolume = totalShifts > 0 ? totalVolume / totalShifts : 0;
    
    // Дата последней смены
    const lastShiftDate = reports.length > 0 
      ? reports.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())[0].openedAt
      : undefined;
    
    return {
      totalShifts,
      shiftsByStatus,
      shiftsByOperator,
      shiftsByTradingPoint,
      totalRevenue,
      totalVolume,
      averageShiftRevenue,
      averageShiftVolume,
      lastShiftDate
    };
  }
};

// Экспорт store для обратной совместимости
export const shiftReportsStore = {
  getAllShiftReports: (): ShiftReport[] => [...shiftReportsData],
  
  getShiftReportById: (id: string): ShiftReport | undefined => 
    shiftReportsData.find(sr => sr.id === id),
    
  getShiftReportsByStatus: (status: ShiftStatus): ShiftReport[] =>
    shiftReportsData.filter(sr => sr.status === status),
    
  updateShiftReport: (id: string, updates: Partial<ShiftReport>): ShiftReport | null => {
    const index = shiftReportsData.findIndex(sr => sr.id === id);
    if (index === -1) return null;
    
    shiftReportsData[index] = {
      ...shiftReportsData[index],
      ...updates,
      updatedAt: new Date()
    };
    
    saveShiftReports();
    return shiftReportsData[index];
  }
};