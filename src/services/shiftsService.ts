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
import { stsProxyClient } from './stsProxyClient';

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
    const response = await stsProxyClient.get<Shift[]>('/v1/shifts', params);
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
    const response = await stsProxyClient.get<ReceiptsResponse>('/v1/report/receipts', params);
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
    const response = await stsProxyClient.get<ShiftReport>('/v1/report/shift_report', params);
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
