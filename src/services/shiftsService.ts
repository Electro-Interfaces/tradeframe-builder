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
  FuelTotal,
  Shift
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
    const response = await stsProxyClient.get<any[]>('/v1/shifts', params);

    // API не возвращает system и station в ответе, добавляем их из параметров запроса
    const shifts: Shift[] = response.map(shift => ({
      ...shift,
      system: params.system,
      station: params.station
    }));

    return shifts;
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
 * Получить сырые данные сменного отчета от API
 * Используется в ShiftReportsV2 для полного контроля над преобразованием данных
 *
 * @param params - Параметры запроса (system, station, shift)
 * @returns Сырые данные от STS API { psm, release, receipt, sales, money }
 *
 * @example
 * const rawData = await getShiftReportRaw({
 *   system: 15,
 *   station: 1,
 *   shift: 123
 * });
 */
export async function getShiftReportRaw(params: ShiftReportRequestParams): Promise<any> {
  try {
    // Возвращаем сырые данные от API без преобразования
    // API возвращает { psm: {total, data}, release, receipt, sales, money }
    const response = await stsProxyClient.get<any>('/v1/report/shift_report', params);
    return response;
  } catch (error) {
    console.error('❌ ShiftsService: Ошибка получения сырого сменного отчета', error);
    throw error;
  }
}

/**
 * Получить полный сменный отчет (преобразованный формат)
 * Используется в Pricing и других страницах для обратной совместимости
 *
 * Отчет включает:
 * - Информацию по ПСМ (постам смены менеджера)
 * - Данные по резервуарам на конец смены
 * - Поступления нефтепродуктов
 * - Продажи за смену
 * - Движение наличных денежных средств
 *
 * @param params - Параметры запроса (system, station, shift)
 * @returns Преобразованный сменный отчет в формате ShiftReport
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
    const response = await stsProxyClient.get<any>('/v1/report/shift_report', params);

    // Преобразуем ответ API к формату ShiftReport для обратной совместимости
    // API возвращает { psm, release, receipt, sales, money }
    const fuelTotals: FuelTotal[] = response.psm?.total?.map((item: any) => ({
      service_code: item.service?.service_code || 0,
      service_name: item.service?.service_name || '',
      release: {
        quantity: item.release?.quantity || 0,
        cost: item.release?.cost || 0,
        amount: item.release?.amount
      }
    })) || [];

    return {
      system: params.system,
      station: params.station,
      shift: {
        shift: params.shift,
        state: 0, // Предполагаем закрытую смену
        dt_open: undefined,
        dt_close: null
      },
      pos_info: [],
      tanks: [],
      receipts: [],
      fuel_totals: fuelTotals,
      payment_totals: [],
      cash_movements: [],
      report_date: new Date().toISOString()
    };
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
  getShiftReportRaw,
};

export default shiftsService;
