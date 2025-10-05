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
  // Пытаемся получить настройки из apiConfigService
  const allConnections = apiConfigService.getAllConnections();
  const stsConnection = allConnections.find(conn => conn.id === 'trading-network-api');

  let username = import.meta.env.VITE_STS_API_USERNAME;
  let password = import.meta.env.VITE_STS_API_PASSWORD;

  // Если есть настройки в apiConfigService - используем их
  if (stsConnection?.settings?.username && stsConnection?.settings?.password) {
    username = stsConnection.settings.username;
    password = stsConnection.settings.password;
    console.log('🔐 ShiftsService: Используем учетные данные из apiConfigService');
  }

  if (!username || !password) {
    throw new Error('STS API credentials not configured');
  }

  // Авторизация через Basic Auth для получения JWT
  const basicAuth = btoa(`${username}:${password}`);

  console.log('🔑 ShiftsService: Запрос токена...', { username, url: `${API_BASE_URL}/v1/login` });

  const response = await fetch(`${API_BASE_URL}/v1/login`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('❌ ShiftsService: Ошибка авторизации', response.status, response.statusText);
    throw new Error(`Authentication failed: ${response.statusText}`);
  }

  const token = await response.text();
  console.log('✅ ShiftsService: Токен получен');
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

  console.log('📡 ShiftsService: API запрос', url.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
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
  console.log('✅ ShiftsService: Ответ получен', data);
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
  console.log('📊 ShiftsService: Получение списка смен', params);

  try {
    const response = await apiRequest<Shift[]>('/v1/shifts', params);
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
