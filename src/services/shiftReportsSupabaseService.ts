/**
 * Supabase сервис для работы со сменными отчетами
 * Использует динамическую конфигурацию
 */

import { supabaseClientBrowser as supabase } from './supabaseClientBrowser';

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

// Интерфейс для таблицы shift_reports в Supabase
interface ShiftReportRow {
  id: string;
  shift_number: number;
  opened_at: string;
  closed_at?: string;
  operator: string;
  operator_id: string;
  trading_point_id: string;
  trading_point_name: string;
  status: ShiftStatus;
  total_revenue: number;
  total_volume: number;
  receipt_count: number;
  payments: {
    cash: number;
    cards: number;
    sbp: number;
    fuel_cards: number;
    other: number;
  };
  fuel_positions: FuelPosition[];
  documents: ShiftDocument[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// Функция преобразования из формата БД в объект приложения
const mapFromDbRow = (row: ShiftReportRow): ShiftReport => ({
  id: row.id,
  shiftNumber: row.shift_number,
  openedAt: row.opened_at,
  closedAt: row.closed_at,
  operator: row.operator,
  operatorId: row.operator_id,
  tradingPointId: row.trading_point_id,
  tradingPointName: row.trading_point_name,
  status: row.status,
  totalRevenue: row.total_revenue,
  totalVolume: row.total_volume,
  receiptCount: row.receipt_count,
  payments: {
    cash: row.payments.cash,
    cards: row.payments.cards,
    sbp: row.payments.sbp,
    fuelCards: row.payments.fuel_cards,
    other: row.payments.other
  },
  fuelPositions: row.fuel_positions,
  documents: row.documents,
  metadata: row.metadata,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at)
});

// Функция преобразования из объекта приложения в формат БД
const mapToDbRow = (report: ShiftReport): Omit<ShiftReportRow, 'created_at' | 'updated_at'> => ({
  id: report.id,
  shift_number: report.shiftNumber,
  opened_at: report.openedAt,
  closed_at: report.closedAt,
  operator: report.operator,
  operator_id: report.operatorId,
  trading_point_id: report.tradingPointId,
  trading_point_name: report.tradingPointName,
  status: report.status,
  total_revenue: report.totalRevenue,
  total_volume: report.totalVolume,
  receipt_count: report.receiptCount,
  payments: {
    cash: report.payments.cash,
    cards: report.payments.cards,
    sbp: report.payments.sbp,
    fuel_cards: report.payments.fuelCards,
    other: report.payments.other
  },
  fuel_positions: report.fuelPositions,
  documents: report.documents,
  metadata: report.metadata,
  is_active: true
});

// Сервис сменных отчетов с прямым подключением к Supabase
export const shiftReportsSupabaseService = {
  // Получить все сменные отчеты
  async getAllShiftReports(): Promise<ShiftReport[]> {
    const { data, error } = await supabase
      .from('shift_reports')
      .select('*')
      .eq('is_active', true)
      .order('shift_number', { ascending: false });

    if (error) {
      console.error('Error fetching shift reports:', error);
      throw new Error(`Ошибка получения сменных отчетов: ${error.message}`);
    }

    return (data as ShiftReportRow[]).map(mapFromDbRow);
  },

  // Получить сменный отчет по ID
  async getShiftReportById(id: string): Promise<ShiftReport | null> {
    const { data, error } = await supabase
      .from('shift_reports')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Record not found
      }
      console.error('Error fetching shift report by id:', error);
      throw new Error(`Ошибка получения сменного отчета: ${error.message}`);
    }

    return mapFromDbRow(data as ShiftReportRow);
  },

  // Получить отчеты по торговой точке
  async getShiftReportsByTradingPoint(tradingPointId: string): Promise<ShiftReport[]> {
    const { data, error } = await supabase
      .from('shift_reports')
      .select('*')
      .eq('trading_point_id', tradingPointId)
      .eq('is_active', true)
      .order('shift_number', { ascending: false });

    if (error) {
      console.error('Error fetching shift reports by trading point:', error);
      throw new Error(`Ошибка получения отчетов торговой точки: ${error.message}`);
    }

    return (data as ShiftReportRow[]).map(mapFromDbRow);
  },

  // Получить отчеты по оператору
  async getShiftReportsByOperator(operatorId: string): Promise<ShiftReport[]> {
    const { data, error } = await supabase
      .from('shift_reports')
      .select('*')
      .eq('operator_id', operatorId)
      .eq('is_active', true)
      .order('opened_at', { ascending: false });

    if (error) {
      console.error('Error fetching shift reports by operator:', error);
      throw new Error(`Ошибка получения отчетов оператора: ${error.message}`);
    }

    return (data as ShiftReportRow[]).map(mapFromDbRow);
  },

  // Получить отчеты по статусу
  async getShiftReportsByStatus(status: ShiftStatus): Promise<ShiftReport[]> {
    const { data, error } = await supabase
      .from('shift_reports')
      .select('*')
      .eq('status', status)
      .eq('is_active', true)
      .order('opened_at', { ascending: false });

    if (error) {
      console.error('Error fetching shift reports by status:', error);
      throw new Error(`Ошибка получения отчетов по статусу: ${error.message}`);
    }

    return (data as ShiftReportRow[]).map(mapFromDbRow);
  },

  // Создать новый сменный отчет
  async createShiftReport(input: ShiftReportInput): Promise<ShiftReport> {
    // Получаем максимальный номер смены для автоинкремента
    const { data: maxData } = await supabase
      .from('shift_reports')
      .select('shift_number')
      .eq('is_active', true)
      .order('shift_number', { ascending: false })
      .limit(1);

    const maxShiftNumber = maxData && maxData.length > 0 ? maxData[0].shift_number : 0;
    const shiftNumber = input.shiftNumber || maxShiftNumber + 1;
    
    // Генерируем ID для позиций топлива и документов
    const fuelPositions: FuelPosition[] = (input.fuelPositions || []).map((fp, index) => ({
      ...fp,
      id: `${Date.now()}-${index}`
    }));
    
    const documents: ShiftDocument[] = (input.documents || []).map((doc, index) => ({
      ...doc,
      id: `${Date.now()}-${index}`
    }));
    
    const newShiftReport: ShiftReport = {
      id: crypto.randomUUID(),
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

    const dbRow = mapToDbRow(newShiftReport);
    
    const { data, error } = await supabase
      .from('shift_reports')
      .insert([dbRow])
      .select()
      .single();

    if (error) {
      console.error('Error creating shift report:', error);
      throw new Error(`Ошибка создания сменного отчета: ${error.message}`);
    }

    return mapFromDbRow(data as ShiftReportRow);
  },

  // Обновить сменный отчет
  async updateShiftReport(id: string, updates: Partial<ShiftReportInput>): Promise<ShiftReport | null> {
    // Сначала получаем существующий отчет
    const existing = await shiftReportsSupabaseService.getShiftReportById(id);
    if (!existing) {
      return null;
    }

    // Обновляем позиции топлива если они переданы
    let fuelPositions = existing.fuelPositions;
    if (updates.fuelPositions) {
      fuelPositions = updates.fuelPositions.map((fp, index) => ({
        ...fp,
        id: existing.fuelPositions[index]?.id || `${Date.now()}-${index}`
      }));
    }

    // Обновляем документы если они переданы
    let documents = existing.documents;
    if (updates.documents) {
      documents = updates.documents.map((doc, index) => ({
        ...doc,
        id: existing.documents[index]?.id || `${Date.now()}-${index}`
      }));
    }

    const updatedReport: ShiftReport = {
      ...existing,
      shiftNumber: updates.shiftNumber ?? existing.shiftNumber,
      operator: updates.operator ?? existing.operator,
      operatorId: updates.operatorId ?? existing.operatorId,
      tradingPointId: updates.tradingPointId ?? existing.tradingPointId,
      tradingPointName: updates.tradingPointName ?? existing.tradingPointName,
      totalRevenue: updates.totalRevenue ?? existing.totalRevenue,
      totalVolume: updates.totalVolume ?? existing.totalVolume,
      receiptCount: updates.receiptCount ?? existing.receiptCount,
      payments: {
        cash: updates.payments?.cash ?? existing.payments.cash,
        cards: updates.payments?.cards ?? existing.payments.cards,
        sbp: updates.payments?.sbp ?? existing.payments.sbp,
        fuelCards: updates.payments?.fuelCards ?? existing.payments.fuelCards,
        other: updates.payments?.other ?? existing.payments.other
      },
      fuelPositions,
      documents,
      metadata: updates.metadata ? { ...existing.metadata, ...updates.metadata } : existing.metadata,
      updatedAt: new Date()
    };

    const dbRow = mapToDbRow(updatedReport);
    
    const { data, error } = await supabase
      .from('shift_reports')
      .update(dbRow)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating shift report:', error);
      throw new Error(`Ошибка обновления сменного отчета: ${error.message}`);
    }

    return mapFromDbRow(data as ShiftReportRow);
  },

  // Закрыть смену
  async closeShift(id: string): Promise<ShiftReport | null> {
    const shiftReport = await shiftReportsSupabaseService.getShiftReportById(id);
    if (!shiftReport) return null;
    
    if (shiftReport.status !== 'draft') {
      throw new Error('Можно закрыть только смену в статусе "Черновик"');
    }
    
    const { data, error } = await supabase
      .from('shift_reports')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error closing shift:', error);
      throw new Error(`Ошибка закрытия смены: ${error.message}`);
    }

    return mapFromDbRow(data as ShiftReportRow);
  },

  // Синхронизировать смену с ФНС
  async synchronizeShift(id: string): Promise<ShiftReport | null> {
    const shiftReport = await shiftReportsSupabaseService.getShiftReportById(id);
    if (!shiftReport) return null;
    
    if (shiftReport.status !== 'closed') {
      throw new Error('Можно синхронизировать только закрытую смену');
    }
    
    // Симуляция времени синхронизации и возможной ошибки
    await new Promise(resolve => setTimeout(resolve, 1500));
    const success = Math.random() > 0.1; // 90% успеха
    
    if (!success) {
      throw new Error('Ошибка синхронизации с ФНС');
    }
    
    const { data, error } = await supabase
      .from('shift_reports')
      .update({
        status: 'synchronized',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error synchronizing shift:', error);
      throw new Error(`Ошибка синхронизации смены: ${error.message}`);
    }

    return mapFromDbRow(data as ShiftReportRow);
  },

  // Архивировать смену
  async archiveShift(id: string): Promise<ShiftReport | null> {
    const shiftReport = await shiftReportsSupabaseService.getShiftReportById(id);
    if (!shiftReport) return null;
    
    if (shiftReport.status !== 'synchronized') {
      throw new Error('Можно архивировать только синхронизированную смену');
    }
    
    const { data, error } = await supabase
      .from('shift_reports')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error archiving shift:', error);
      throw new Error(`Ошибка архивирования смены: ${error.message}`);
    }

    return mapFromDbRow(data as ShiftReportRow);
  },

  // Удалить сменный отчет (мягкое удаление)
  async deleteShiftReport(id: string): Promise<boolean> {
    const shiftReport = await shiftReportsSupabaseService.getShiftReportById(id);
    if (!shiftReport) return false;
    
    if (shiftReport.status !== 'draft') {
      throw new Error('Можно удалить только смену в статусе "Черновик"');
    }
    
    const { error } = await supabase
      .from('shift_reports')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting shift report:', error);
      throw new Error(`Ошибка удаления сменного отчета: ${error.message}`);
    }

    return true;
  },

  // Добавить документ к смене
  async addDocument(shiftId: string, document: Omit<ShiftDocument, 'id'>): Promise<ShiftDocument | null> {
    const shiftReport = await shiftReportsSupabaseService.getShiftReportById(shiftId);
    if (!shiftReport) return null;
    
    const newDocument: ShiftDocument = {
      ...document,
      id: `${Date.now()}-${shiftReport.documents.length}`
    };
    
    const updatedDocuments = [...shiftReport.documents, newDocument];
    
    const { error } = await supabase
      .from('shift_reports')
      .update({
        documents: updatedDocuments,
        updated_at: new Date().toISOString()
      })
      .eq('id', shiftId);

    if (error) {
      console.error('Error adding document to shift:', error);
      throw new Error(`Ошибка добавления документа: ${error.message}`);
    }
    
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
    let supabaseQuery = supabase
      .from('shift_reports')
      .select('*')
      .eq('is_active', true);

    // Применяем фильтры
    if (filters) {
      if (filters.status) {
        supabaseQuery = supabaseQuery.eq('status', filters.status);
      }
      if (filters.operatorId) {
        supabaseQuery = supabaseQuery.eq('operator_id', filters.operatorId);
      }
      if (filters.tradingPointId) {
        supabaseQuery = supabaseQuery.eq('trading_point_id', filters.tradingPointId);
      }
      if (filters.dateFrom) {
        supabaseQuery = supabaseQuery.gte('opened_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        supabaseQuery = supabaseQuery.lte('opened_at', filters.dateTo);
      }
    }

    // Поиск по тексту
    if (query.trim()) {
      const searchLower = `%${query.toLowerCase()}%`;
      supabaseQuery = supabaseQuery.or(
        `id.ilike.${searchLower},operator.ilike.${searchLower},trading_point_name.ilike.${searchLower},shift_number.eq.${parseInt(query) || 0}`
      );
    }

    supabaseQuery = supabaseQuery.order('opened_at', { ascending: false });

    const { data, error } = await supabaseQuery;

    if (error) {
      console.error('Error searching shift reports:', error);
      throw new Error(`Ошибка поиска сменных отчетов: ${error.message}`);
    }

    return (data as ShiftReportRow[]).map(mapFromDbRow);
  },

  // Получить статистику по сменным отчетам
  async getStatistics(period?: { from: string; to: string }): Promise<ShiftStatistics> {
    let supabaseQuery = supabase
      .from('shift_reports')
      .select('*')
      .eq('is_active', true);

    // Фильтр по периоду
    if (period) {
      supabaseQuery = supabaseQuery
        .gte('opened_at', period.from)
        .lte('opened_at', period.to);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      console.error('Error getting shift statistics:', error);
      throw new Error(`Ошибка получения статистики: ${error.message}`);
    }

    const reports = (data as ShiftReportRow[]).map(mapFromDbRow);
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
  getAllShiftReports: async (): Promise<ShiftReport[]> => 
    await shiftReportsSupabaseService.getAllShiftReports(),
  
  getShiftReportById: async (id: string): Promise<ShiftReport | undefined> => {
    const report = await shiftReportsSupabaseService.getShiftReportById(id);
    return report || undefined;
  },
    
  getShiftReportsByStatus: async (status: ShiftStatus): Promise<ShiftReport[]> =>
    await shiftReportsSupabaseService.getShiftReportsByStatus(status),
    
  updateShiftReport: async (id: string, updates: Partial<ShiftReport>): Promise<ShiftReport | null> => {
    // Преобразуем updates в формат ShiftReportInput
    const input: Partial<ShiftReportInput> = {
      shiftNumber: updates.shiftNumber,
      operator: updates.operator,
      operatorId: updates.operatorId,
      tradingPointId: updates.tradingPointId,
      tradingPointName: updates.tradingPointName,
      totalRevenue: updates.totalRevenue,
      totalVolume: updates.totalVolume,
      receiptCount: updates.receiptCount,
      payments: updates.payments,
      fuelPositions: updates.fuelPositions?.map(fp => ({ ...fp, id: undefined })) as Omit<FuelPosition, 'id'>[],
      documents: updates.documents?.map(doc => ({ ...doc, id: undefined })) as Omit<ShiftDocument, 'id'>[],
      metadata: updates.metadata
    };
    
    return await shiftReportsSupabaseService.updateShiftReport(id, input);
  }
};

export default shiftReportsSupabaseService;