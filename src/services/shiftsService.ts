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
import { stsApiService } from './stsApi';

/**
 * Выполнить запрос к API с автоматической авторизацией
 */
async function apiRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  // Используем централизованный токен из stsApiService
  await stsApiService.refreshTokenIfNeeded();
  const config = stsApiService.getConfig();

  if (!config?.token) {
    throw new Error('STS API authentication failed');
  }

  const url = new URL(`${config.url}${endpoint}`);

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
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // Пытаемся получить детали ошибки из тела ответа
    let errorDetails = response.statusText;
    try {
      const errorBody = await response.json();
      errorDetails = JSON.stringify(errorBody);
      console.error('❌ ShiftsService: API ошибка', response.status, errorBody);
    } catch (e) {
      console.error('❌ ShiftsService: API ошибка', response.status, response.statusText);
    }
    throw new Error(`API request failed (${response.status}): ${errorDetails}`);
  }

  const data = await response.json();
  return data;
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
export async function getShifts(params: ShiftsRequestParams): Promise<Shift[]> {

  try {
    const response = await apiRequest<Shift[]>('/v1/shifts', params);
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

  try {
    const response = await apiRequest<ReceiptsResponse>('/v1/report/receipts', params);
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
 * @param params - Параметры запроса (system, station, shift)
 * @returns Полный сменный отчет
 *
 * @example
 * const report = await getShiftReport({
 *   system: 15,
 *   station: 1,
 *   shift: 123
 * });
 */
export async function getShiftReport(params: ShiftReportRequestParams): Promise<ShiftReport> {

  try {
    const response = await apiRequest<ShiftReport>('/v1/report/shift_report', params);
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
