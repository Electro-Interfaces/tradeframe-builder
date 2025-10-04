/**
 * Сервис для работы со сменами и сменными отчетами
 *
 * API endpoints:
 * - /v1/shifts - Список смен
 * - /v1/report/receipts - Поступления нефтепродуктов
 * - /v1/report/shift_report - Полный сменный отчет
 *
 * @see https://pos.autooplata.ru/tms/docs - Swagger документация
 */

import {
  ShiftsListResponse,
  ShiftsRequestParams,
  ReceiptsResponse,
  ReceiptsRequestParams,
  ShiftReport,
  ShiftReportRequestParams,
} from '@/types/shifts';
import { apiConfigService } from './apiConfigService';

const API_BASE_URL = import.meta.env.VITE_STS_API_URL || 'https://pos.autooplata.ru/tms';

/**
 * Получить JWT токен для авторизации
 */
async function getAuthToken(): Promise<string> {
  const username = import.meta.env.VITE_STS_API_USERNAME;
  const password = import.meta.env.VITE_STS_API_PASSWORD;

  if (!username || !password) {
    throw new Error('STS API credentials not configured');
  }

  // Авторизация через Basic Auth для получения JWT
  const basicAuth = btoa(`${username}:${password}`);

  const response = await fetch(`${API_BASE_URL}/v1/login`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.statusText}`);
  }

  const token = await response.text();
  return token.replace(/"/g, ''); // Убираем кавычки из ответа
}

/**
 * Выполнить запрос к API с автоматической авторизацией
 */
async function apiRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  const token = await getAuthToken();

  const url = new URL(`${API_BASE_URL}${endpoint}`);

  // Добавляем параметры запроса
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Получить список смен
 *
 * @param params - Параметры запроса (system, station, даты)
 * @returns Список смен с информацией по ПСМ
 *
 * @example
 * const shifts = await getShifts({ system: 15, station: 1 });
 */
export async function getShifts(params: ShiftsRequestParams): Promise<ShiftsListResponse> {
  console.log('📊 ShiftsService: Получение списка смен', params);

  try {
    const response = await apiRequest<ShiftsListResponse>('/v1/shifts', params);
    console.log('✅ ShiftsService: Смены получены', response);
    return response;
  } catch (error) {
    console.error('❌ ShiftsService: Ошибка получения смен', error);
    throw error;
  }
}

/**
 * Получить отчет по поступлениям нефтепродуктов
 *
 * @param params - Параметры запроса (system, station, даты)
 * @returns Список поступлений нефтепродуктов
 *
 * @example
 * const receipts = await getFuelReceipts({
 *   system: 15,
 *   station: 1,
 *   dt_beg: '2025-01-01T00:00:00',
 *   dt_end: '2025-01-31T23:59:59'
 * });
 */
export async function getFuelReceipts(params: ReceiptsRequestParams): Promise<ReceiptsResponse> {
  console.log('📦 ShiftsService: Получение поступлений н/п', params);

  try {
    const response = await apiRequest<ReceiptsResponse>('/v1/report/receipts', params);
    console.log('✅ ShiftsService: Поступления получены', response);
    return response;
  } catch (error) {
    console.error('❌ ShiftsService: Ошибка получения поступлений', error);
    throw error;
  }
}

/**
 * Получить полный сменный отчет
 *
 * Отчет включает:
 * - Информацию по ПСМ (постам смены менеджера)
 * - Данные по резервуарам на конец смены
 * - Поступления нефтепродуктов
 * - Продажи за смену
 * - Движение наличных денежных средств
 *
 * @param params - Параметры запроса (system, station, shift_number)
 * @returns Полный сменный отчет
 *
 * @example
 * const report = await getShiftReport({
 *   system: 15,
 *   station: 1,
 *   shift_number: 123
 * });
 */
export async function getShiftReport(params: ShiftReportRequestParams): Promise<ShiftReport> {
  console.log('📋 ShiftsService: Получение сменного отчета', params);

  try {
    const response = await apiRequest<ShiftReport>('/v1/report/shift_report', params);
    console.log('✅ ShiftsService: Сменный отчет получен', response);
    return response;
  } catch (error) {
    console.error('❌ ShiftsService: Ошибка получения сменного отчета', error);
    throw error;
  }
}

/**
 * Сервис для работы со сменами и отчетностью
 */
export const shiftsService = {
  getShifts,
  getFuelReceipts,
  getShiftReport,
};

export default shiftsService;
